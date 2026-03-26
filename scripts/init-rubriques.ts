/**
 * Script to initialize default rubriques in the database
 * Run with: npx tsx scripts/init-rubriques.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Setup Prisma with adapter for PostgreSQL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_RUBRIQUES = [
    { nom: 'Disponibilité des Documents de Sécurité', description: 'Documents de sécurité et plans', ordre: 1 },
    { nom: 'Application des Consignes de Sécurité', description: 'Consignes et procédures', ordre: 2 },
    { nom: 'Sécurité Incendie', description: 'Extincteurs, détection, évacuation', ordre: 3 },
    { nom: 'Vidéosurveillance', description: 'Caméras et enregistrements', ordre: 4 },
    { nom: 'Contrôle d\'Accès', description: 'Badges, points d\'accès', ordre: 5 },
    { nom: 'Entretien du Poste de Garde', description: 'État du poste de garde', ordre: 6 },
    { nom: 'Conformité de l\'Agent de Sécurité', description: 'Formation et équipements', ordre: 7 },
    { nom: 'Infrastructure et Risques Externes', description: 'Bâtiments et environnement', ordre: 8 },
];

async function main() {
    console.log('Checking existing rubriques...');
    
    const existingCount = await prisma.rubrique.count();
    console.log(`Found ${existingCount} existing rubriques`);
    
    if (existingCount === 0) {
        console.log('Creating default rubriques...');
        
        for (const r of DEFAULT_RUBRIQUES) {
            await prisma.rubrique.create({
                data: {
                    nom: r.nom,
                    description: r.description,
                    ordre: r.ordre,
                    actif: true
                }
            });
            console.log(`Created: ${r.nom}`);
        }
        
        console.log('Default rubriques created successfully!');
    } else {
        console.log('Rubriques already exist. Skipping initialization.');
    }
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
