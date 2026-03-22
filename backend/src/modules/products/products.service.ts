import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import slugify from 'slugify';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Inventory } from './entities/inventory.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';

export interface ProductFilter {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  order?: 'ASC' | 'DESC';
  includeDeleted?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
  ) {}

  // ---------- Categories ----------

  /** List all active categories as a tree structure. */
  async findCategories(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { isActive: true, parentId: IsNull() },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });
  }

  /** Get a category by ID with its children. */
  async findCategoryById(id: string): Promise<Category> {
    const cat = await this.categoryRepo.findOne({
      where: { id },
      relations: ['children', 'parent'],
    });
    if (!cat) throw new NotFoundException(`Category #${id} not found`);
    return cat;
  }

  /** Create a new category. Max 3-level nesting enforced. */
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug ?? (await this.generateUniqueSlug(dto.name, 'category'));

    if (dto.parentId) {
      await this.assertCategoryDepth(dto.parentId);
    }

    const cat = this.categoryRepo.create({ ...dto, slug });
    return this.categoryRepo.save(cat);
  }

  /** Update a category. */
  async updateCategory(id: string, dto: Partial<CreateCategoryDto>): Promise<Category> {
    const cat = await this.findCategoryById(id);
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  /** Delete a category — children's parentId set to NULL automatically. */
  async deleteCategory(id: string): Promise<void> {
    const cat = await this.findCategoryById(id);
    await this.categoryRepo.remove(cat);
  }

  // ---------- Products ----------

  /**
   * List active products with filters and pagination.
   * cost_price is excluded via @Exclude() on entity.
   */
  async findAll(
    pagination: PaginationDto,
    filters: ProductFilter = {},
  ): Promise<PaginatedResult<Product>> {
    const { page = 1, limit = 20 } = pagination;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('variants.inventory', 'inventory');

    if (!filters.includeDeleted) {
      qb.where('product.deleted_at IS NULL');
      qb.andWhere('product.is_active = true');
    }

    if (filters.categoryId) {
      qb.andWhere('product.category_id = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.minPrice != null && Number.isFinite(filters.minPrice)) {
      qb.andWhere('CAST(product.price AS numeric) >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters.maxPrice != null && Number.isFinite(filters.maxPrice)) {
      qb.andWhere('CAST(product.price AS numeric) <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    if (filters.inStock) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM inventory i JOIN product_variants pv ON i.variant_id = pv.id WHERE pv.product_id = product.id AND (i.quantity - i.reserved) > 0)',
      );
    }

    const SORT_FIELD_MAP: Record<string, string> = { created_at: 'createdAt', updated_at: 'updatedAt', price: 'price', name: 'name' }; const sortField = SORT_FIELD_MAP[filters.sort ?? 'created_at'] ?? 'createdAt';
    const sortOrder = filters.order ?? 'DESC';
    qb.orderBy(`product.${sortField}`, sortOrder as 'ASC' | 'DESC');

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  /** Get product by UUID including variants and inventory. */
  async findOne(id: string, includeDeleted = false): Promise<Product> {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('variants.inventory', 'inventory')
      .where('product.id = :id', { id });

    if (includeDeleted) {
      qb.withDeleted();
    }

    const product = await qb.getOne();
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  /** Get product by slug — used for canonical frontend routes. */
  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('variants.inventory', 'inventory')
      .where('product.slug = :slug AND product.deleted_at IS NULL', { slug })
      .getOne();

    if (!product) throw new NotFoundException(`Product with slug "${slug}" not found`);
    return product;
  }

  /** Create a new product. */
  async create(dto: CreateProductDto): Promise<Product> {
    // Validate compare_at_price > price
    if (dto.compareAtPrice !== undefined && dto.compareAtPrice <= dto.price) {
      throw new UnprocessableEntityException(
        'compareAtPrice must be strictly greater than price',
      );
    }

    // Ensure SKU uniqueness across products + variants
    await this.assertSkuUnique(dto.sku);

    const slug = dto.slug ?? (await this.generateUniqueSlug(dto.name, 'product'));

    // Convert numeric DTO fields to strings to match decimal entity columns
    const product = this.productRepo.create({
      name: dto.name,
      slug,
      description: dto.description,
      shortDescription: dto.shortDescription,
      price: String(dto.price),
      compareAtPrice: dto.compareAtPrice != null ? String(dto.compareAtPrice) : null,
      costPrice: dto.costPrice != null ? String(dto.costPrice) : null,
      sku: dto.sku,
      categoryId: dto.categoryId,
      isActive: dto.isActive,
      isFeatured: dto.isFeatured,
      images: dto.images,
      tags: dto.tags,
    });
    return this.productRepo.save(product);
  }

  /** Full update of a product. */
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id, true);

    if (dto.compareAtPrice !== undefined) {
      const effectivePrice = dto.price ?? parseFloat(product.price);
      if (dto.compareAtPrice <= effectivePrice) {
        throw new UnprocessableEntityException(
          'compareAtPrice must be strictly greater than price',
        );
      }
    }

    // Validate is_active — product needs at least one active variant
    if (dto.isActive === true) {
      const activeVariants = await this.variantRepo.count({
        where: { productId: id, isActive: true },
      });
      if (activeVariants === 0) {
        throw new UnprocessableEntityException(
          'Product must have at least one active variant before being published',
        );
      }
    }

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  /** Soft-delete a product. */
  async remove(id: string): Promise<void> {
    const product = await this.findOne(id, true);
    await this.productRepo.softRemove(product);
  }

  // ---------- Product Variants ----------

  async findVariants(productId: string): Promise<ProductVariant[]> {
    await this.findOne(productId); // Ensures product exists
    return this.variantRepo.find({
      where: { productId, isActive: true },
      relations: ['inventory'],
      order: { sortOrder: 'ASC' },
    });
  }

  async addVariant(productId: string, dto: CreateVariantDto): Promise<ProductVariant> {
    await this.findOne(productId);
    await this.assertSkuUnique(dto.sku);

    // Convert numeric priceOverride to string to match decimal entity column
    const variant = this.variantRepo.create({
      productId,
      sku: dto.sku,
      name: dto.name,
      priceOverride: dto.priceOverride != null ? String(dto.priceOverride) : null,
      attributes: dto.attributes,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });
    const saved = await this.variantRepo.save(variant) as ProductVariant;

    // Auto-create inventory record
    const inv = this.inventoryRepo.create({ variantId: saved.id, quantity: 0, reserved: 0 });
    await this.inventoryRepo.save(inv);

    return this.variantRepo.findOne({
      where: { id: saved.id },
      relations: ['inventory'],
    }) as Promise<ProductVariant>;
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.findVariantOrFail(productId, variantId);
    Object.assign(variant, dto);
    return this.variantRepo.save(variant);
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    const variant = await this.findVariantOrFail(productId, variantId);
    await this.variantRepo.remove(variant);
  }

  // ---------- Inventory ----------

  async getInventory(variantId: string): Promise<Inventory> {
    const inv = await this.inventoryRepo.findOne({
      where: { variantId },
      relations: ['variant'],
    });
    if (!inv) throw new NotFoundException(`Inventory for variant #${variantId} not found`);
    return inv;
  }

  async updateInventory(
    variantId: string,
    dto: { quantity: number; lowStockThreshold?: number },
  ): Promise<Inventory> {
    const inv = await this.getInventory(variantId);
    inv.quantity = dto.quantity;
    if (dto.lowStockThreshold !== undefined) {
      inv.lowStockThreshold = dto.lowStockThreshold;
    }
    return this.inventoryRepo.save(inv);
  }

  async getLowStockVariants(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Inventory>> {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.inventoryRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .where('inv.quantity <= inv.low_stock_threshold')
      .orderBy('inv.quantity', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return paginate(data, total, page, limit);
  }

  // ---------- Private helpers ----------

  private async findVariantOrFail(productId: string, variantId: string): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId, productId },
    });
    if (!variant) {
      throw new NotFoundException(`Variant #${variantId} not found on product #${productId}`);
    }
    return variant;
  }

  private async assertSkuUnique(sku: string): Promise<void> {
    const inProducts = await this.productRepo.count({ where: { sku } });
    const inVariants = await this.variantRepo.count({ where: { sku } });
    if (inProducts > 0 || inVariants > 0) {
      throw new ConflictException(`SKU "${sku}" already exists`);
    }
  }

  private async generateUniqueSlug(
    name: string,
    type: 'product' | 'category',
  ): Promise<string> {
    const base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let counter = 2;
    const repo = type === 'product' ? this.productRepo : this.categoryRepo;

    while (await repo.findOne({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    return slug;
  }

  private async assertCategoryDepth(parentId: string): Promise<void> {
    const parent = await this.categoryRepo.findOne({ where: { id: parentId } });
    if (!parent) throw new NotFoundException(`Parent category #${parentId} not found`);

    // Walk up the tree; if parent already has a parent with a parent = level 3+
    if (parent.parentId) {
      const grandparent = await this.categoryRepo.findOne({
        where: { id: parent.parentId },
      });
      if (grandparent?.parentId) {
        throw new UnprocessableEntityException(
          'Categories can only nest 3 levels deep (root → level-1 → level-2)',
        );
      }
    }
  }
}
