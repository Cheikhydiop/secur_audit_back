import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    try {
        console.log('Fetching latest OTP codes...');
        const codes = await (prisma as any).otpCode.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        console.log(JSON.stringify(codes, null, 2));
    } catch (error) {
        console.error('Prisma Error:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
