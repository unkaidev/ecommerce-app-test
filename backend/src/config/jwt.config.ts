import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? 'change-me-in-production-min-32-chars',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ??
    'change-me-refresh-secret-min-32-chars',
  accessTokenExpiry: process.env.JWT_EXPIRY ?? '1h',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY ?? '30d',
}));
