import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // =====================================
  // SERVER
  // =====================================
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),

  // =====================================
  // DATABASE
  // =====================================
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT || 5432),
  DB_NAME: process.env.DB_NAME || 'hris_db',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '123',

  // =====================================
  // AUTH / JWT
  // =====================================
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // =====================================
  // GOOGLE OAUTH
  // =====================================
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',

  // =====================================
  // CORS
  // =====================================
  ALLOWED_ORIGINS:
    process.env.ALLOWED_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,https://kariryadin.netlify.app',

  // =====================================
  // UPLOAD
  // =====================================
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_UPLOAD_SIZE_MB: Number(process.env.MAX_UPLOAD_SIZE_MB || 5),

  // =====================================
  // WHATSAPP GATEWAY
  // =====================================
  WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED === 'true',
  WHATSAPP_GATEWAY_URL: process.env.WHATSAPP_GATEWAY_URL || '',
  WHATSAPP_GATEWAY_API_KEY: process.env.WHATSAPP_GATEWAY_API_KEY || '',
  WHATSAPP_TIMEOUT_MS: Number(process.env.WHATSAPP_TIMEOUT_MS || 10000),
  WHATSAPP_MAX_ATTEMPTS: Number(process.env.WHATSAPP_MAX_ATTEMPTS || 3),
};

export default env;