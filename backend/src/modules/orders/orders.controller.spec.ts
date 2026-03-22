import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { OrderStatus } from './entities/order.entity';

const mockOrdersService = {
  create: jest.fn().mockResolvedValue({ id: 'ord-1', orderNumber: 'ORD-20260321-0001', status: OrderStatus.PENDING }),
  findMyOrders: jest.fn().mockResolvedValue({
    data: [{ id: 'ord-1', orderNumber: 'ORD-20260321-0001' }],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
  }),
  findOne: jest.fn().mockResolvedValue({ id: 'ord-1' }),
  cancelMyOrder: jest.fn().mockResolvedValue({ id: 'ord-1', status: OrderStatus.CANCELLED }),
  findAll: jest.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
  }),
  findOneAdmin: jest.fn().mockResolvedValue({ id: 'ord-1' }),
  updateStatus: jest.fn().mockResolvedValue({ id: 'ord-1', status: OrderStatus.CONFIRMED }),
};

const mockJwtGuard = { canActivate: jest.fn().mockReturnValue(true) };
const mockRolesGuard = { canActivate: jest.fn().mockReturnValue(true) };

// Mock req.user so CurrentUser decorator works
jest.mock('../../common/decorators/current-user.decorator', () => ({
  CurrentUser: () => (target: object, key: string, index: number) => {
    // No-op decorator for tests
  },
}));

describe('OrdersController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
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

  describe('GET /api/v1/orders', () => {
    it('returns paginated order list with data array and meta.total', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(typeof res.body.data.meta.total).toBe('number');
    });
  });

  describe('GET /api/v1/admin/orders', () => {
    it('returns paginated admin order list with meta.total', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/orders')
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(typeof res.body.data.meta.total).toBe('number');
    });
  });

  describe('POST /api/v1/orders', () => {
    it('returns 400 when shippingAddressId is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });
  });
});
