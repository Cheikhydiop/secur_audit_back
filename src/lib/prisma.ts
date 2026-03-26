import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in the environment variables');
}

/**
 * Configuration de Prisma 7 avec l'adaptateur PostgreSQL
 * Pool optimisé pour la robustesse et les performances
 */
const poolConfigs = {
    connectionString,
    max: parseInt(process.env.DB_POOL_MAX || '15', 10),
    min: parseInt(process.env.DB_POOL_MIN || '3', 10),
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: false,
    ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
};

console.log('🔧 Pool PostgreSQL Config:', {
    max: poolConfigs.max,
    min: poolConfigs.min,
    timeout: poolConfigs.connectionTimeoutMillis,
    ssl: !!poolConfigs.ssl
});

const pool = new pg.Pool(poolConfigs);

// Journalisation des événements critiques du pool
pool.on('error', (err) => {
    console.error('❌ Erreur inattendue dans le pool PostgreSQL:', err.message);
});

pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('🔌 Nouvelle connexion PostgreSQL établie');
    }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
});

// Nettoyage gracieux à l'arrêt du processus
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    await pool.end();
});

export { pool };
export default prisma;
