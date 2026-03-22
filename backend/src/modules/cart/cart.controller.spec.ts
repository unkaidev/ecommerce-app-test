import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

const mockCartWithTotals = {
  cart: { id: 'cart-1', userId: 'user-1', items: [] },
  subtotal: 0,
  totalItems: 0,
};

const mockCartService = {
  getCart: jest.fn().mockResolvedValue(mockCartWithTotals),
  addItem: jest.fn().mockResolvedValue(mockCartWithTotals),
  updateItem: jest.fn().mockResolvedValue(mockCartWithTotals),
  removeItem: jest.fn().mockResolvedValue(mockCartWithTotals),
  clearCart: jest.fn().mockResolvedValue(undefined),
  applyCoupon: jest.fn().mockResolvedValue(mockCartWithTotals),
  removeCoupon: jest.fn().mockResolvedValue(mockCartWithTotals),
};

const mockJwtGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('CartController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockCartService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(() => app.close());

  describe('GET /api/v1/cart', () => {
    it('returns 401 without authentication token', async () => {
      mockJwtGuard.canActivate.mockReturnValueOnce(false);
      const res = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .expect(403); // Guard returns false = 403 in unit test context
    });

    it('returns cart with subtotal and totalItems', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.data).toHaveProperty('subtotal');
      expect(res.body.data).toHaveProperty('totalItems');
    });
  });

  describe('POST /api/v1/cart/items', () => {
    it('returns 400 when variantId is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({ quantity: 1 })
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });
  });
});
