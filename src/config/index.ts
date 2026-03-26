
import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
export const JWT_SECRET = process.env.JWT_SECRET || 'secret-inesic';

export const DATABASE_CONFIG = {
  type: (process.env.DB_TYPE as 'prisma' | 'memory') || 'prisma',
  url: process.env.DATABASE_URL
};

console.log(`🔧 Config loaded - DB Type: ${DATABASE_CONFIG.type}, Port: ${PORT}`);
