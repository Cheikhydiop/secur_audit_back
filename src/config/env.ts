import dotenv from 'dotenv';
import logger from '../utils/logger.js';

// Charger les variables d'environnement
dotenv.config();

// Validation des variables d'environnement requises
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Configuration exportée
export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessTokenExpiry: process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD ? (process.env.REDIS_PASSWORD.includes('@') ? process.env.REDIS_PASSWORD.split(':')[2].split('@')[0] : process.env.REDIS_PASSWORD) : undefined,
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@dgsecur.sn',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // Mobile Money
  wave: {
    apiKey: process.env.WAVE_API_KEY,
    merchantKey: process.env.WAVE_MERCHANT_KEY,
  },

  orangeMoney: {
    apiKey: process.env.ORANGE_MONEY_API_KEY,
    merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY,
  },

  // Payment Configuration
  payment: {
    mode: process.env.PAYMENT_MODE || 'TEST', // TEST or PRODUCTION
    wave: {
      apiKey: process.env.WAVE_API_KEY,
      apiSecret: process.env.WAVE_API_SECRET,
      merchantId: process.env.WAVE_MERCHANT_ID,
      businessPhone: process.env.WAVE_BUSINESS_PHONE,
      webhookSecret: process.env.WAVE_WEBHOOK_SECRET,
      apiUrl: process.env.WAVE_API_URL || 'https://api.wave.com/v1'
    },
    orangeMoney: {
      apiKey: process.env.ORANGE_MONEY_API_KEY,
      apiSecret: process.env.ORANGE_MONEY_API_SECRET,
      merchantId: process.env.ORANGE_MONEY_MERCHANT_ID,
      businessPhone: process.env.ORANGE_MONEY_BUSINESS_PHONE,
      webhookSecret: process.env.ORANGE_MONEY_WEBHOOK_SECRET,
      apiUrl: process.env.ORANGE_MONEY_API_URL || 'https://api.orange.sn/omoney/v1'
    },
    freeMoney: {
      apiKey: process.env.FREE_MONEY_API_KEY,
      apiSecret: process.env.FREE_MONEY_API_SECRET,
      merchantId: process.env.FREE_MONEY_MERCHANT_ID,
      businessPhone: process.env.FREE_MONEY_BUSINESS_PHONE,
      webhookSecret: process.env.FREE_MONEY_WEBHOOK_SECRET,
      apiUrl: process.env.FREE_MONEY_API_URL || 'https://api.free.sn/payment/v1'
    },
    limits: {
      minDeposit: parseInt(process.env.MIN_DEPOSIT_AMOUNT || '500', 10),
      maxDeposit: parseInt(process.env.MAX_DEPOSIT_AMOUNT || '1000000', 10),
      minWithdrawal: parseInt(process.env.MIN_WITHDRAWAL_AMOUNT || '1000', 10),
      maxWithdrawal: parseInt(process.env.MAX_WITHDRAWAL_AMOUNT || '500000', 10)
    }
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
  },

  // Application URLs - AJOUTÉ
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',
    apiUrl: process.env.API_URL || 'https://thundering-laura-ndigueul-80527457.koyeb.app',
    webUrl: process.env.WEB_URL || 'http://localhost:8080'
  }
};

// Export individuel pour compatibilité
export const PORT = config.port;
export const NODE_ENV = config.nodeEnv;
export const DATABASE_URL = config.databaseUrl;
export const JWT_SECRET = config.jwt.secret;
export const FRONTEND_URL = config.app.frontendUrl; // Ajouté
export const API_URL = config.app.apiUrl; // Ajouté

export default config;