/**
 * Quick check script to verify seed data
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const rubriques = await prisma.rubrique.count();
    const questions = await prisma.question.count();
    const templates = await prisma.questionnaireTemplate.count();
    
    console.log('=== Seed Data Check ===');
    console.log(`Rubriques: ${rubriques}`);
    console.log(`Questions: ${questions}`);
    console.log(`Templates: ${templates}`);
    
    if (rubriques > 0) {
        console.log('\n--- Rubriques ---');
        const r = await prisma.rubrique.findMany({ orderBy: { ordre: 'asc' } });
        r.forEach((item, i) => console.log(`  ${i+1}. ${item.nom}`));
    }
    
    if (questions > 0) {
        console.log('\n--- Questions by Rubrique ---');
        const q = await prisma.question.groupBy({
            by: ['categorieId'],
            _count: true
        });
        console.log(`  Total question groups: ${q.length}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
