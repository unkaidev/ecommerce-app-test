import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Inventory } from './entities/inventory.entity';

type MockRepo<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createMockRepo<T>(): MockRepo<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
      setLock: jest.fn().mockReturnThis(),
    }),
  };
}

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: MockRepo<Product>;
  let categoryRepo: MockRepo<Category>;
  let variantRepo: MockRepo<ProductVariant>;
  let inventoryRepo: MockRepo<Inventory>;

  beforeEach(async () => {
    productRepo = createMockRepo<Product>();
    categoryRepo = createMockRepo<Category>();
    variantRepo = createMockRepo<ProductVariant>();
    inventoryRepo = createMockRepo<Inventory>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(ProductVariant), useValue: variantRepo },
        { provide: getRepositoryToken(Inventory), useValue: inventoryRepo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('returns paginated result with data and meta', async () => {
      const mockProducts = [{ id: '1', name: 'Test' }] as Product[];
      const qb = productRepo.createQueryBuilder!();
      qb.getManyAndCount.mockResolvedValue([mockProducts, 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('returns empty data array when no products exist', async () => {
      const qb = productRepo.createQueryBuilder!();
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns product when found', async () => {
      const mockProduct = { id: 'uuid-1', name: 'Widget' } as Product;
      const qb = productRepo.createQueryBuilder!();
      qb.getOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('uuid-1');

      expect(result.id).toBe('uuid-1');
    });

    it('throws NotFoundException when product not found', async () => {
      const qb = productRepo.createQueryBuilder!();
      qb.getOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('throws UnprocessableEntityException when compareAtPrice <= price', async () => {
      await expect(
        service.create({
          name: 'Test',
          sku: 'TEST-001',
          price: 20,
          compareAtPrice: 20, // equal — invalid
        } as never),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws ConflictException when SKU already exists', async () => {
      productRepo.count!.mockResolvedValue(1);

      await expect(
        service.create({ name: 'Test', sku: 'EXISTING-SKU', price: 10 } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findBySlug', () => {
    it('throws NotFoundException when slug not found', async () => {
      const qb = productRepo.createQueryBuilder!();
      qb.getOne.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
