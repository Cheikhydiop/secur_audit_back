
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DATABASE STATUS REPORT ---');

    const totalSites = await prisma.site.count();
    console.log(`Total Sites: ${totalSites}`);

    const inspectionsAll = await prisma.inspection.count();
    const inspectionsByStatus = await prisma.inspection.groupBy({
        by: ['statut'],
        _count: true
    });
    console.log(`Total Inspections: ${inspectionsAll}`);
    console.log('Inspections by status:', JSON.stringify(inspectionsByStatus, null, 2));

    const failedQuestions = await prisma.inspectionQuestion.count({
        where: {
            reponse: { in: ['NON_CONFORME', 'NON'] }
        }
    });
    console.log(`Total Non-Conformities (failed questions): ${failedQuestions}`);

    const criticalNCs = await prisma.inspectionQuestion.count({
        where: {
            reponse: { in: ['NON_CONFORME', 'NON'] },
            criticiteSnapshot: 'CRITIQUE'
        }
    });
    console.log(`Total CRITICAL Non-Conformities: ${criticalNCs}`);

    const actionPlans = await prisma.actionPlan.count();
    console.log(`Total Action Plans: ${actionPlans}`);

    const sampleNCs = await prisma.inspectionQuestion.findMany({
        where: {
            reponse: { in: ['NON_CONFORME', 'NON'] }
        },
        take: 3,
        include: {
            inspection: {
                include: { site: true }
            }
        }
    });

    if (sampleNCs.length > 0) {
        console.log('Sample NCs:', JSON.stringify(sampleNCs.map(nc => ({
            id: nc.id,
            site: nc.inspection.site.nom,
            question: nc.questionTextSnapshot,
            reponse: nc.reponse,
            criticite: nc.criticiteSnapshot,
            date: nc.createdAt
        })), null, 2));
    } else {
        console.log('No Non-Conformities found in database.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
