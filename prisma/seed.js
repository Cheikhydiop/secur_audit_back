import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 30000 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🚀 FINALISATION DU PEUPLEMENT (ADMIN + ENTITÉS + PLANNING)...');

    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    // 1. Super Administrateur
    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@sonatel.sn' },
        update: {},
        create: {
            email: 'admin@sonatel.sn',
            password: hashedPassword,
            name: 'Super Administrateur',
            role: 'SUPER_ADMIN',
            entite: 'DGS',
            isActive: true,
        },
    });
    console.log('✅ Super Admin créé : admin@sonatel.sn');

    // 2. Création des auditeurs par département (Entités)
    const users = [
        { email: 'sec@sonatel.sn', name: 'Entité Sécurité (SEC)', entite: 'SEC' },
        { email: 'sur@sonatel.sn', name: 'Entité Sûreté (SUR)', entite: 'SUR' },
        { email: 'cps@sonatel.sn', name: 'Entité Management (CPS)', entite: 'CPS' }
    ];

    const createdUsers = {};
    for (const u of users) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: { entite: u.entite, name: u.name },
            create: {
                email: u.email,
                password: hashedPassword,
                name: u.name,
                role: 'INSPECTEUR',
                entite: u.entite,
                isActive: true
            }
        });
        createdUsers[u.entite] = user.id;
        console.log(`✅ Auditeur ${u.entite} créé : ${u.email}`);
    }

    // 3. Planning Gandoul (D'après l'image)
    const gandoul = await prisma.site.findUnique({ where: { code: '787023505' } });
    if (gandoul) {
        console.log('📅 Assignation des plannings Gandoul...');
        const missions = [
            { titre: 'Audit Sécurité SEC (Bleu)', entite: 'SEC', date: '2026-02-15', type: 'SEC (Vérification Sécurité)' },
            { titre: 'Audit Management CPS (Orange)', entite: 'CPS', date: '2026-06-15', type: 'CPS (Visite Managériale)' },
            { titre: 'Audit Sûreté SUR (Vert)', entite: 'SUR', date: '2026-10-15', type: 'SUR (Contrôle Sûreté)' }
        ];

        for (const m of missions) {
            try {
                await prisma.mission.create({
                    data: {
                        titre: m.titre,
                        siteId: gandoul.id,
                        inspecteurId: createdUsers[m.entite],
                        dateDeb: new Date(m.date),
                        dateFin: new Date(new Date(m.date).getTime() + 7200000),
                        type: m.type,
                        statut: 'A_FAIRE'
                    }
                });
            } catch (e) { /* ignore duplication */ }
        }
        console.log('✅ Planning Gandoul synchronisé.');
    }

    console.log('\n✨ PEUPLEMENT TERMINÉ ! Vous pouvez vous connecter.');
}

main().catch(err => { console.error('❌ ERREUR:', err); process.exit(1); }).finally(async () => { await prisma.$disconnect(); await pool.end(); });
