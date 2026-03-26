/**
 * Script to seed questions for the questionnaire template
 * Run with: npx tsx scripts/seed-questions.ts
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

// Questions data organized by category key
const questionsData: any = {
    documents: [
        { text: "Y a-t-il un registre de sécurité pour votre établissement (voir avec le chef d'établissement) ?", ponderation: 2, helper: "Le registre doit être à jour, signé par le responsable du site et accessible immédiatement en cas de contrôle." },
        { text: "Les flux entrées et sorties sont-ils notés sur le registre des entrées et sorties ?", ponderation: 2, helper: "Vérifiez que chaque ligne comporte l'heure, le nom, la société et le motif de la visite." },
        { text: "Le délai de remplacement de 6 mois du registre des entrées et sorties est-il respecté conformément aux exigences de la CDP ?", ponderation: 2 },
        { text: "Le poste de garde dispose-t-il d'un seul registre pour le suivi des flux entrées et sorties ?", ponderation: 1 },
        { text: "Les notes de service de DG/SECU sont-elles disponibles au niveau du poste de garde ?", ponderation: 2 },
        { text: "Les autorisations d'accès et bon de sortie sont-ils tracés et disponibles au niveau du poste de garde ?", ponderation: 2 },
        { text: "Les autorisations d'accès et bon de sortie sont-ils archivés et bien conservés au niveau du poste de garde ?", ponderation: 1 },
        { text: "Les références des autorisations d'accès ou codes d'accès sont-ils tracés dans le registre de suivi des entrées et sorties ?", ponderation: 2 },
        { text: "Le nouveau manuel de l'agent de sécurité est-il disponible au niveau du poste de garde ?", ponderation: 1 },
        { text: "Les agents de sécurité sont-ils bien imprégnés du contenu du manuel ? Ont-ils connaissance des procédures de sécurité de Sonatel ?", ponderation: 2 },
        { text: "Les agents de sécurité sur site ont-ils été formés en sécurité incendie et en secourisme avant leur prise de poste ?", ponderation: 4, helper: "Demandez les attestations de formation (BST/SST). Sans preuve, cochez Non-Conforme." },
        { text: "Si oui, est-ce qu'ils sont régulièrement formés (mise à niveau) par leur société de gardiennage sur les procédures de Sonatel ?", ponderation: 2 },
        { text: "Si oui, à quelle fréquence ? De quand date la dernière formation sur le sujet ?", ponderation: 1 },
        { text: "Depuis quand les agents de sécurité sont en poste à la Sonatel ?", ponderation: 1 },
    ],
    consignes: [
        { text: "Le contrôle des entrées et des sorties du personnel, des fournisseurs et des visiteurs, est-il effectif et régulier ?", ponderation: 4, helper: "Observez discrètement pendant 5 minutes si l'agent demande systématiquement les badges." },
        { text: "Le contrôle et la surveillance des installations techniques y compris les températures des salles techniques sont-ils effectifs ?", ponderation: 4 },
        { text: "L'accueil, l'orientation et la distribution de badges aux visiteurs sont-ils fluides et réguliers ?", ponderation: 1 },
        { text: "La gestion des clés (y compris la remise, la reprise des clés et la mention sur le registre des entrées et sorties) est-elle conforme à la procédure ?", ponderation: 2 },
        { text: "Existe-t-il une bonne gestion des mains courantes : les documents sont accessibles, propres, bien tenus et à jour ?", ponderation: 1 },
        { text: "Existe-t-il une assistance en matière de sécurité des personnes, y compris le personnel travaillant sur le site ?", ponderation: 2 },
        { text: "Les rondes de prévention dans les sites et à l'extérieur des sites sont-elles effectives et régulières en jour et en nuit ?", ponderation: 4, helper: "Vérifiez le contrôleur de ronde (Pointeuse) pour confirmer les horaires des dernières 24h." },
        { text: "La vérification du bon fonctionnement des appareils de sûreté et sécurité est-elle régulière ? : centrales de détection incendie, vidéosurveillance, système de contrôle d'accès, etc…", ponderation: 4 },
        { text: "Les écarts relevés à l'issus des rondes préventives sont-ils consignés et remontés à DG/SECU ?", ponderation: 2 },
        { text: "Le site dispose-t-il d'un parking ? Est-il surveillé en H24 ?", ponderation: 2 },
        { text: "Gestion des fournisseurs : les vérifications des autorisations d'accès sont-elles effectives et régulières ?", ponderation: 2 },
        { text: "Existe-t-il un contrôle systématique des EPI pour les différents intervenants devant accéder au site conformément aux autorisations d'accès et à la fiche de contrôle des EPI ?", ponderation: 2 },
        { text: "Les consignes de sécurité liées au port et au contrôle des EPI sont-elles affichées au niveau du poste de garde ?", ponderation: 2 },
        { text: "Le respect des contrôles spécifiques aux personnes (badges, autorisations, sacs) est-il effectif et régulier ?", ponderation: 4 },
        { text: "Le respect des contrôles spécifiques des véhicules est-il effectif ? (Contrôle des mâles, numéros d'immatriculation)", ponderation: 2 },
        { text: "La vérification des bons de sortie : matériels, validité de la signature est-elle effective ?", ponderation: 2 },
        { text: "Les agents de sécurités participent-ils à la gestion des évacuations en coordination avec les responsables des sites et DG/SECU ?", ponderation: 2 },
    ],
    incendie: [
        { text: "Le systeme de détection incendie existe – t -il sur le site ?", ponderation: 4 },
        { text: "Le dispositif de détection incendie est -il opérationnel (déployé et fonctionne correctement ?", ponderation: 4, helper: "Vérifiez l'absence de voyant 'Défaut' ou 'Hors service' sur la centrale incendie." },
        { text: "Le mode opératoire de la centrale d'incendie est-il clairement affiché à côté de la centrale ?", ponderation: 2 },
        { text: "Existe-t-il un report d'alarme au niveau du poste de garde ?", ponderation: 4 },
        { text: "Existe- t-il de(s) salle(s) doté(s) de Système de Détection et Extinction Automatique (DEA), sur le site ?", ponderation: 4 },
        { text: "Existe-t-il des extincteurs sur le site ?", ponderation: 4 },
        { text: "Les extincteurs sont -ils clairement indiqués ?", ponderation: 2 },
        { text: "Les extincteurs exposés aux intempéries sont-ils dotés de housses ?", ponderation: 1 },
        { text: "Existe-il des extincteurs dans tous les endroits à risques identifiés sur le site ?", ponderation: 4 },
        { text: "Les équipements de sécurité incendie font il l'objet d'une maintenance régulière ?", ponderation: 2 },
        { text: "Les zones à risques sont-elles dotées de pictogrammes ou de signalétiques adaptés ?", ponderation: 2 },
        { text: "Existe-t-il un point de rassemblement sur le site ?", ponderation: 2 },
        { text: "Est-ce que le positionnement du point de rassemblement est conforme (visibilité et emplacement) ?", ponderation: 2 },
    ],
    video: [
        { text: "Le site dispose- t-il d'un système de vidéosurveillance en marche ?", ponderation: 4 },
        { text: "Les écrans de vidéo surveillance fonctionnent -il correctement et toutes les caméras sont affichées sur l'écran de TV du poste de garde ?", ponderation: 4 },
        { text: "Le système de vidéosurveillance couvre-t-il tous les endroits stratégiques du site ?", ponderation: 4, helper: "Points clés : Entrées, Parkings, Salles serveurs, Zones de stockage." },
        { text: "L'alimentation est-elle secourue ?", ponderation: 2 },
        { text: "L'enregistrement est-elle effective ?", ponderation: 4 },
        { text: "Les équipements de vidéo-surveillance sont-ils à l'abri dans un local sécurisé sur le site ?", ponderation: 2 },
        { text: "Les pictogrammes « zone sous vidéo surveillance » sont-ils disposés en évidence sur le site ?", ponderation: 1 },
    ],
    acces: [
        { text: "Le site dispose-t-il d'un système de contrôle d'accès qui marche ?", ponderation: 4 },
        { text: "Les portes munies de ce dispositif sont-elles callées ?", ponderation: 2 },
        { text: "Les BBG sont-ils désactivés ?", ponderation: 2 },
        { text: "Les salles techniques disposent elles de clé ? Ces clés sont-elles consignées chez le responsable de salle ou au niveau du poste de garde ?", ponderation: 4 },
        { text: "Est-ce que toutes les zones à risques sont couvertes par le système de contrôle d'accès ?", ponderation: 4 },
        { text: "Le site est-il doté d'un espace caisses ?", ponderation: 2 },
        { text: "L'accès à l'espace caisse est-il couvert par un système de contrôle d'accès ?", ponderation: 4, helper: "Zone haute sécurité. Le lecteur de badge doit être fonctionnel et la porte fermée à clé." },
        { text: "Tous les utilisateurs des caisses ont-ils des badges d'accès actifs ?", ponderation: 4 },
        { text: "Tout le personnel du site dispose-t-il de badges d'accès actifs ?", ponderation: 4 },
    ],
    poste: [
        { text: "Le poste de garde est-il bien tenu ? (Propreté des locaux et environs immédiats)", ponderation: 1 },
        { text: "Existe-t-il des affiches, photos ou articles autres que ceux définis par le règlement mise en évidence ?", ponderation: 1 },
        { text: "La ligne téléphonique fixe est-elle fonctionnelle et émet-elle des appels ?", ponderation: 2 },
        { text: "La ligne téléphonique mobile est-elle disponible, fonctionnelle et émet des appels ?", ponderation: 2 },
        { text: "Le téléphone portable est-il enregistré au groupe WhatsApp de DG/SECU ?", ponderation: 1 },
        { text: "Existe-t-il des applications prohibées sur le téléphone le téléphone (tik tok, facebook, you tube, instagramme, telegram…) ?", ponderation: 2 },
        { text: "Le poste de garde dispose-t-il de ventilateur fonctionnel ?", ponderation: 1 },
        { text: "Le poste de garde dispose-t-il d'une armoire à clés bien rangée et étiquetée ?", ponderation: 1 },
    ],
    agent: [
        { text: "Lagent de sécurité porte-t-il un uniforme de service complet (chemise, pantal on et chaussure de sécurité, casquette) et en bon état ?", ponderation: 1 },
        { text: "Le port du badge d'identité avec photo et identifiants est-il respecté ?", ponderation: 2 },
        { text: "Linterdiction de port de signe distinctif est-il respecté ?", ponderation: 1 },
    ],
    infra: [
        { text: "La clôture entourant l'établissement est-elle suffisante et en bon état (longueur et hauteur) ?", ponderation: 2 },
        { text: "L'éclairage extérieur de l'établissement est-il adéquat ?", ponderation: 2 },
        { text: "Les voies d'accès de l'établissement sont-elles toujours bien dégagées (ambulance, pompiers, ...) ?", ponderation: 4 },
        { text: "Le programme de renforcement de la sécurité couvre-t-elle toutes les vulnérabilités ?", ponderation: 2 },
        { text: "Le désherbage sur le site est-il effectif ?", ponderation: 1 },
        { text: "A-t-il été noté dans le site la présence de nuisibles : reptiles, rongeurs, abeilles, ...", ponderation: 1 },
        { text: "Des opérations de traitement phytosanitaires ont-elles été entreprises ?", ponderation: 1 },
    ],
};

// Map category keys to Rubrique names from init-rubriques.ts
const rubriquesLabels: any = {
    documents: "Disponibilité des Documents de Sécurité",
    consignes: "Application des Consignes de Sécurité",
    incendie: "Sécurité Incendie",
    video: "Vidéosurveillance",
    acces: "Contrôle d'Accès",
    poste: "Entretien du Poste de Garde",
    agent: "Conformité de l'Agent de Sécurité",
    infra: "Infrastructure et Risques Externes",
};

async function main() {
    console.log('🌱 Seeding Questionnaire Template...');

    // Check if rubriques exist first
    const rubriquesCount = await prisma.rubrique.count();
    if (rubriquesCount === 0) {
        console.log('⚠️ No rubriques found. Please run init-rubriques.ts first!');
        process.exit(1);
    }

    // Check if questions already exist
    const existingQuestions = await prisma.question.count();
    if (existingQuestions > 0) {
        console.log(`⚠️ Found ${existingQuestions} existing questions. Skipping seed.`);
        console.log('💡 To re-seed, delete questions first or run the script with --force');
        process.exit(0);
    }

    // Get all rubriques to map names to IDs
    const rubriques = await prisma.rubrique.findMany();
    const rubriquesMap = new Map(rubriques.map(r => [r.nom, r.id]));

    console.log(`Found ${rubriques.length} rubriques in database`);

    // 1. Create Initial Template
    const template = await prisma.questionnaireTemplate.create({
        data: {
            nom: "Audit Standard - Version Initiale",
            version: 1,
            isCurrent: true,
        }
    });
    console.log(`✅ Created template: ${template.nom}`);

    // 2. Create Questions
    let totalQuestions = 0;
    for (const [key, questions] of Object.entries(questionsData)) {
        const juridiqueLabel = rubriquesLabels[key];
        const juridiqueId = rubriquesMap.get(juridiqueLabel);

        if (!juridiqueId) {
            console.log(`⚠️ Rubrique not found: ${juridiqueLabel}, skipping questions for this category`);
            continue;
        }

        console.log(`📝 Processing: ${juridiqueLabel} (${(questions as any[]).length} questions)`);

        let ordre = 1;
        for (const q of questions as any[]) {
            await prisma.question.create({
                data: {
                    texte: q.text,
                    helper: q.helper || null,
                    ordre: ordre++,
                    ponderation: q.ponderation,
                    categorieId: juridiqueId,
                    templateId: template.id,
                    actif: true
                }
            });
            totalQuestions++;
        }
    }

    console.log(`✅ Seed complete! Created ${totalQuestions} questions in template.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
