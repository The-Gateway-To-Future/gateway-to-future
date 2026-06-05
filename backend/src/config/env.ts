import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_MOCK: process.env.DB_MOCK === 'true',
  REDIS_URL: process.env.REDIS_URL || '',
  REDIS_MOCK: process.env.REDIS_MOCK === 'true',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  PAY_MOCK: process.env.PAY_MOCK === 'true',
  ADMIN_INIT_EMAIL: process.env.ADMIN_INIT_EMAIL || 'admin@gatewaytofuture.com',
  ADMIN_INIT_PASSWORD: process.env.ADMIN_INIT_PASSWORD || 'AdminPass123!',
};
