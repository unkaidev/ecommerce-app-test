import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

const mockProductsService = {
  findAll: jest.fn().mockResolvedValue({
    data: [{ id: 'uuid-1', name: 'Widget', slug: 'widget' }],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
  }),
  findOne: jest.fn().mockResolvedValue({ id: 'uuid-1', name: 'Widget' }),
  findBySlug: jest.fn().mockResolvedValue({ id: 'uuid-1', slug: 'widget' }),
  findCategories: jest.fn().mockResolvedValue([]),
  findCategoryById: jest.fn().mockResolvedValue({ id: 'cat-1' }),
  create: jest.fn().mockResolvedValue({ id: 'new-uuid', name: 'New Product' }),
  update: jest.fn().mockResolvedValue({ id: 'uuid-1', name: 'Updated' }),
  remove: jest.fn().mockResolvedValue(undefined),
  findVariants: jest.fn().mockResolvedValue([]),
  getLowStockVariants: jest.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
  }),
};

// Guard mock — allows all requests through for testing
const mockJwtGuard = { canActivate: jest.fn().mockReturnValue(true) };
const mockRolesGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('ProductsController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(() => app.close());

  describe('GET /api/v1/products', () => {
    it('returns paginated envelope with data array and meta.total', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200);

      // Assert shape — not just status
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(typeof res.body.data.meta.total).toBe('number');
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('returns single product with id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/uuid-1')
        .expect(200);

      expect(typeof res.body.data.id).toBe('string');
    });
  });

  describe('GET /api/v1/admin/inventory/low-stock', () => {
    it('returns paginated inventory with meta.total as number', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/inventory/low-stock')
        .expect(200);

      expect(typeof res.body.data.meta.total).toBe('number');
      expect(res.body.data).toHaveProperty('data');
    });
  });
});
