import { PrismaClient, StatusInspection, StatusAction, CriticiteQuestion, UserRole } from '@prisma/client';
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

// Random score generator with distribution
function getRandomScore(): number {
    const rand = Math.random();
    if (rand < 0.15) return Math.floor(Math.random() * 30) + 50; // 50-80 (Critique)
    if (rand < 0.40) return Math.floor(Math.random() * 20) + 70;  // 70-90 (Vigilance)
    return Math.floor(Math.random() * 10) + 90;                    // 90-100 (Conforme)
}

// Get random date in 2025-2026
function getRandomDate(): Date {
    const start = new Date('2025-01-01');
    const end = new Date('2026-12-31');
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Get date in last X months
function getRecentDate(months: number): Date {
    const now = new Date();
    const past = new Date(now.setMonth(now.getMonth() - months));
    return new Date(past.getTime() + Math.random() * (new Date().getTime() - past.getTime()));
}

async function main() {
    console.log('🚀 Démarrage du peuplement complet pour le Dashboard...');

    // Load JSON
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../roadmap_data.json'), 'utf8'));

    // 1. Create users (inspecteurs)
    console.log('👥 Création des inspecteurs...');
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const inspecteurs = await Promise.all([
        prisma.user.upsert({
            where: { email: 'inspecteur@sonatel.sn' },
            update: {},
            create: {
                email: 'inspecteur@sonatel.sn',
                password: hashedPassword,
                name: 'Moussa Diop',
                role: 'INSPECTEUR',
                isActive: true,
                entite: 'SEC'
            }
        }),
        prisma.user.upsert({
            where: { email: 'inspecteur2@sonatel.sn' },
            update: {},
            create: {
                email: 'inspecteur2@sonatel.sn',
                password: hashedPassword,
                name: 'Awa Ndiaye',
                role: 'INSPECTEUR',
                isActive: true,
                entite: 'SEC'
            }
        }),
        prisma.user.upsert({
            where: { email: 'inspecteur3@sonatel.sn' },
            update: {},
            create: {
                email: 'inspecteur3@sonatel.sn',
                password: hashedPassword,
                name: 'Cheikh Sarr',
                role: 'INSPECTEUR',
                isActive: true,
                entite: 'CPS'
            }
        })
    ]);

    // Create admin user
    const admin = await prisma.user.upsert({
        where: { email: 'admin@sonatel.sn' },
        update: {},
        create: {
            email: 'admin@sonatel.sn',
            password: hashedPassword,
            name: 'Admin Système',
            role: 'ADMIN',
            isActive: true,
            entite: 'SEC'
        }
    });

    // 2. Clear existing data
    console.log('🗑️ Suppression des données existantes...');
    await prisma.actionPlan.deleteMany({});
    await prisma.inspection.deleteMany({});
    await prisma.mission.deleteMany({});
    await prisma.site.deleteMany({});

    // 3. Populate SITES table with varied types
    console.log(`📍 Insertion des ${data.sites.length} sites...`);
    const siteMap = new Map();
    
    for (const s of data.sites) {
        if (!s.region) continue;

        const siteTypes = ['Technique', 'Agence', 'Poste de garde', 'Data Center', 'Siège'];
        const randomType = siteTypes[Math.floor(Math.random() * siteTypes.length)];

        const site = await prisma.site.create({
            data: {
                nom: s.nom,
                code: s.numero || s.nom.substring(0, 10),
                zone: s.region,
                type: randomType,
                prestataire: s.prestataire,
                status: 'actif'
            }
        });
        siteMap.set(s.numero || s.nom, site);
    }

    console.log(`✅ ${siteMap.size} sites créés`);

    // 4. Create inspections with scores for each site
    console.log('🔍 Création des inspections avec scores...');
    const inspectionsCreated = 0;
    
    for (const [siteCode, site] of siteMap) {
        // Create 1-3 inspections per site
        const numInspections = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numInspections; i++) {
            const inspecteur = inspecteurs[Math.floor(Math.random() * inspecteurs.length)];
            const score = getRandomScore();
            const date = getRecentDate(12); // Last 12 months
            
            const inspection = await prisma.inspection.create({
                data: {
                    siteId: site.id,
                    inspecteurId: inspecteur.id,
                    date: date,
                    statut: StatusInspection.VALIDEE,
                    score: score,
                    reponses: {
                        conformes: Math.floor(score * 0.8),
                        nonConformes: Math.floor((100 - score) * 0.8),
                        nonApplicables: Math.floor(Math.random() * 10)
                    }
                }
            });

            // Create action plans based on score (lower score = more NC)
            if (score < 90) {
                const numActions = Math.floor((100 - score) / 15) + 1;
                
                for (let j = 0; j < numActions; j++) {
                    const criticites = [CriticiteQuestion.CRITIQUE, CriticiteQuestion.MAJEUR, CriticiteQuestion.MINEUR];
                    const criticite = score < 60 ? CriticiteQuestion.CRITIQUE : 
                                    score < 80 ? CriticiteQuestion.MAJEUR : CriticiteQuestion.MINEUR;
                    
                    const statuts = [StatusAction.A_FAIRE, StatusAction.EN_COURS, StatusAction.TERMINE, StatusAction.EN_RETARD];
                    const randStatut = Math.random();
                    let statut: typeof StatusAction[keyof typeof StatusAction] = StatusAction.A_FAIRE;
                    if (randStatut < 0.3) statut = StatusAction.TERMINE;
                    else if (randStatut < 0.5) statut = StatusAction.EN_COURS;
                    else if (randStatut < 0.55) statut = StatusAction.EN_RETARD;

                    const descriptionsNC = [
                        'Contrôle d\'accès défaillant -badgeage obligatoire',
                        'Extincteur périmé - remplacement urgent',
                        'Caméra de surveillance hors service',
                        'Éclairage parking défectueux',
                        'Portillon automatique bloqué',
                        'Gardien absent pendant service',
                        'Rapport de ronde non rempli',
                        'Système alarme défaillant',
                        'Clôture périmètre endommagée',
                        'Poste de garde mal équipé',
                        'absence de registre visiteurs',
                        'non conformité électrique'
                    ];

                    const dateEcheance = new Date(date);
                    dateEcheance.setDate(dateEcheance.getDate() + 30 + Math.floor(Math.random() * 60));

                    await prisma.actionPlan.create({
                        data: {
                            inspectionId: inspection.id,
                            description: descriptionsNC[Math.floor(Math.random() * descriptionsNC.length)],
                            responsableId: admin.id,
                            dateEcheance: dateEcheance,
                            statut: statut,
                            criticite: criticite as any,
                            notes: 'Action générée suite à l\'audit de conformité'
                        }
                    });
                }
            }
        }
    }

    // Count totals
    const totalSites = await prisma.site.count();
    const totalInspections = await prisma.inspection.count();
    const totalActions = await prisma.actionPlan.count();
    const actionsTerminees = await prisma.actionPlan.count({ where: { statut: StatusAction.TERMINE } });
    const actionsEnRetard = await prisma.actionPlan.count({ where: { statut: StatusAction.EN_RETARD } });
    const actionsEnCours = await prisma.actionPlan.count({ where: { statut: StatusAction.EN_COURS } });

    console.log('\n📊 STATISTIQUES GÉNÉRÉES:');
    console.log(`   - Sites: ${totalSites}`);
    console.log(`   - Inspections: ${totalInspections}`);
    console.log(`   - Plans d'actions: ${totalActions}`);
    console.log(`     ✓ Terminés: ${actionsTerminees}`);
    console.log(`     ↻ En cours: ${actionsEnCours}`);
    console.log(`     ⚠ En retard: ${actionsEnRetard}`);

    // Get average score
    const avgScore = await prisma.inspection.aggregate({
        _avg: { score: true }
    });

    // Get sites by status
    const sitesWithScores = await prisma.site.findMany({
        include: {
            inspections: {
                where: { statut: StatusInspection.VALIDEE },
                orderBy: { date: 'desc' },
                take: 1
            }
        }
    });

    let conformes = 0;
    let vigilants = 0;
    let critiques = 0;

    sitesWithScores.forEach(site => {
        const score = site.inspections[0]?.score || 0;
        if (score >= 90) conformes++;
        else if (score >= 70) vigilants++;
        else if (score > 0) critiques++;
    });

    console.log(`\n📈 INDICATEURS CLÉS:`);
    console.log(`   - Score moyen: ${Math.round(avgScore._avg.score || 0)}%`);
    console.log(`   - Sites conformes (>90%): ${conformes}`);
    console.log(`   - Sites en vigilance (70-90%): ${vigilants}`);
    console.log(`   - Sites critiques (<70%): ${critiques}`);

    console.log('\n✅ Base de données populated pour le Dashboard!');
}

main().catch(e => { 
    console.error('❌ Erreur:', e); 
    process.exit(1); 
}).finally(async () => { 
    await prisma.$disconnect(); 
});
