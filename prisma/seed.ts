import { PrismaClient, StatusAction } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Prisma with adapter for PostgreSQL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Démarrage du peuplement (Double Table : Sites & Planning)...');

  // Load JSON
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../roadmap_data.json'), 'utf8'));

  // 1. Create a default inspector
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  const inspector = await prisma.user.upsert({
    where: { email: 'inspecteur@sonatel.sn' },
    update: {},
    create: {
      email: 'inspecteur@sonatel.sn',
      password: hashedPassword,
      name: 'Inspecteur Principal',
      role: 'INSPECTEUR',
      isActive: true
    }
  });

  // 2. Clear old data if any (Reset carefully)
  // await prisma.mission.deleteMany({});
  // await prisma.site.deleteMany({});

  // 3. Populate SITES table
  console.log(`📍 Insertion des ${data.sites.length} sites...`);
  for (const s of data.sites) {
    if (!s.region) continue;

    // Correction du décalage colonnes : les champs sont region, nom, numero, prestataire
    const actual_site_name = s.nom;        // Ex: "Poste de garde Gandoul"
    const actual_numero = s.numero;         // Ex: "787023505"
    const actual_provider = s.prestataire;  // Ex: "GENDARMERIE"
    const actual_type = "Poste de garde";   // Default

    await prisma.site.upsert({
      where: { code: actual_numero || actual_site_name },
      update: {
        nom: actual_site_name,
        zone: s.region,
        type: actual_type,
        prestataire: actual_provider
      },
      create: {
        nom: actual_site_name,
        code: actual_numero || actual_site_name,
        zone: s.region,
        type: actual_type,
        prestataire: actual_provider
      }
    });
  }

  // 4. Populate PLANNING table (Missions)
  console.log(`📅 Insertion des missions planifiées...`);
  // Note: Only if we have inspections in JSON
  for (const ins of data.inspections) {
    const site = await prisma.site.findFirst({
      where: { nom: ins.site_nom }
    });

    if (site) {
      await prisma.mission.create({
        data: {
          titre: `Audit ${ins.type}`,
          siteId: site.id,
          inspecteurId: inspector.id,
          dateDeb: new Date(ins.date),
          dateFin: new Date(new Date(ins.date).getTime() + 3600000),
          type: ins.type,
          statut: StatusAction.A_FAIRE
        }
      });
    }
  }

  console.log('✅ Base de données à jour !');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
