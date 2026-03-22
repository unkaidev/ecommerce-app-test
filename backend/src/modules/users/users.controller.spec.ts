import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

const mockUsersService = {
  findAll: jest.fn().mockResolvedValue({
    data: [{ id: 'user-1', email: 'test@test.com' }],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
  }),
  findOne: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@test.com' }),
  setActiveStatus: jest.fn().mockResolvedValue({ id: 'user-1', isActive: false }),
  findAddresses: jest.fn().mockResolvedValue([]),
  createAddress: jest.fn().mockResolvedValue({ id: 'addr-1' }),
  updateAddress: jest.fn().mockResolvedValue({ id: 'addr-1' }),
  deleteAddress: jest.fn().mockResolvedValue(undefined),
  setDefaultAddress: jest.fn().mockResolvedValue({ id: 'addr-1', isDefault: true }),
};

const mockJwtGuard = { canActivate: jest.fn().mockReturnValue(true) };
const mockRolesGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('UsersController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
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

  describe('GET /api/v1/admin/users', () => {
    it('returns paginated users with data array and meta.total as number', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(typeof res.body.data.meta.total).toBe('number');
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    it('returns single user with id as string', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users/user-1')
        .set('Authorization', 'Bearer mock-admin-token')
        .expect(200);

      expect(typeof res.body.data.id).toBe('string');
    });
  });
});
