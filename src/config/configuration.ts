import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'default-secret-change-me',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  mongodbUri: process.env.MONGODB_URI,
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL,
}));

export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
}));

export const paystackConfig = registerAs('paystack', () => ({
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
}));

export const mailConfig = registerAs('mail', () => ({
  provider: process.env.EMAIL_PROVIDER || 'smtp',
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.EMAIL_FROM || 'noreply@ahia.global',
  fromName: process.env.EMAIL_FROM_NAME || 'AhiaGlobal',
}));

export const s3Config = registerAs('s3', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET,
}));

export const searchConfig = registerAs('search', () => ({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY,
}));
