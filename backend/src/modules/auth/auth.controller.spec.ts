import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';

const mockAuthService = {
  register: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
  login: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
  refresh: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
  getProfile: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@test.com' }),
  updateProfile: jest.fn().mockResolvedValue({ id: 'user-1' }),
  changePassword: jest.fn().mockResolvedValue(undefined),
};

const mockJwtGuard = { canActivate: jest.fn().mockReturnValue(true) };
const mockThrottlerGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('AuthController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue(mockThrottlerGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(() => app.close());

  describe('POST /api/v1/auth/register', () => {
    it('returns token pair on valid registration', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'new@test.com',
          password: 'Password1',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('returns 400 when required fields missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'bad-email' })
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 with token pair on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'Password1' })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('returns 400 when email is invalid format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'Pass1' })
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });
  });
});
