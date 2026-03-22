import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ---------- Categories ----------

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'List all active categories (tree structure)' })
  @ApiResponse({ status: 200, description: 'Category tree' })
  findCategories() {
    return this.productsService.findCategories();
  }

  @Get('categories/:id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID with children' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findCategoryById(id);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (admin)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(dto);
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (admin)' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.productsService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category (admin)' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.deleteCategory(id);
  }

  // ---------- Products ----------

  @Get('products')
  @Public()
  @ApiOperation({ summary: 'List active products with filters (public)' })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('inStock') inStock?: boolean,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    return this.productsService.findAll(pagination, {
      categoryId,
      search,
      minPrice,
      maxPrice,
      inStock,
      sort,
      order,
    });
  }

  @Get('products/slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get product by slug (canonical frontend route)' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get('products/:id')
  @Public()
  @ApiOperation({ summary: 'Get product by UUID' })
  @ApiResponse({ status: 200, description: 'Product with variants and inventory' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (admin)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Full update of product (admin)' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete product (admin)' })
  @ApiResponse({ status: 204, description: 'Product soft-deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  // ---------- Product Variants ----------

  @Get('products/:productId/variants')
  @Public()
  @ApiOperation({ summary: 'List all active variants for a product' })
  @ApiResponse({ status: 200, description: 'Variant list' })
  findVariants(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.productsService.findVariants(productId);
  }

  @Post('products/:productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add variant to product (admin)' })
  @ApiResponse({ status: 201, description: 'Variant created' })
  addVariant(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.addVariant(productId, dto);
  }

  @Put('products/:productId/variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update variant (admin)' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  updateVariant(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(productId, id, dto);
  }

  @Delete('products/:productId/variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete variant (admin)' })
  @ApiResponse({ status: 204, description: 'Variant deleted' })
  deleteVariant(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.deleteVariant(productId, id);
  }

  // ---------- Inventory ----------

  @Get('inventory/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get stock levels for a variant (admin)' })
  @ApiResponse({ status: 200, description: 'Inventory details' })
  getInventory(@Param('variantId', ParseUUIDPipe) variantId: string) {
    return this.productsService.getInventory(variantId);
  }

  @Put('inventory/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set stock quantity (admin)' })
  @ApiResponse({ status: 200, description: 'Inventory updated' })
  updateInventory(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: { quantity: number; lowStockThreshold?: number },
  ) {
    return this.productsService.updateInventory(variantId, dto);
  }

  @Get('admin/inventory/low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List variants below low stock threshold (admin)' })
  @ApiResponse({ status: 200, description: 'Low stock list' })
  getLowStock(@Query() pagination: PaginationDto) {
    return this.productsService.getLowStockVariants(pagination);
  }
}
