import prisma from './src/config/prismaClient.js';
import { CronService } from './src/services/CronService.js';
import { EmailService } from './src/services/EmailService.js';
import { NotificationService } from './src/services/NotificationService.js';
import { WebSocketService } from './src/services/WebSocketService.js';
import { ActionService } from './src/services/ActionService.js';
import { StatusAction } from '@prisma/client';

async function testActionAlerts() {
    console.log('--- Testing All Action Plan Alerts ---');

    // 1. Setup services
    const emailService = new EmailService();
    const webSocketService = new WebSocketService();
    const notificationService = new NotificationService(webSocketService);
    const cronService = new CronService(emailService, notificationService);
    const actionService = new ActionService(notificationService, emailService);

    try {
        // 2. Find a user and an inspection
        const user = await prisma.user.findFirst();
        const inspection = await prisma.inspection.findFirst({
            include: { site: true }
        });

        if (!user || !inspection) {
            console.error('Missing user or inspection in database. Please seed first.');
            return;
        }

        console.log(`Using user: ${user.name} (${user.id})`);
        console.log(`Using inspection: ${inspection.id} on site ${inspection.site.nom}`);

        // --- TEST 1: New Action Assignment Alert ---
        console.log('\n--- TEST 1: New Action Assignment Alert ---');
        const deadline1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        const action1 = await actionService.create({
            inspectionId: inspection.id,
            description: 'TEST ASSIGNMENT ALERT',
            responsableId: user.id,
            dateEcheance: deadline1,
            criticite: 'MOYENNE' as any
        });

        // Create check for notification
        let notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        let found = notifications.find(n => (n.data as any)?.actionId === action1.id);
        if (found && found.type === 'ACTION_ASSIGNED') {
            console.log('✅ Success: Assignment notification found.');
        } else {
            console.error('❌ Failure: Assignment notification NOT found.');
        }

        // --- TEST 2: Action Due Soon Alert (J-2) ---
        console.log('\n--- TEST 2: Action Due Soon Alert (J-2) ---');
        const deadline2 = new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000); // 1.5 days from now
        const action2 = await prisma.actionPlan.create({
            data: {
                inspectionId: inspection.id,
                description: 'TEST DUE SOON ALERT',
                responsableId: user.id,
                dateEcheance: deadline2,
                statut: 'A_FAIRE',
                dueSoonNotified: false
            }
        });

        await cronService.checkActionPlanDeadlines();

        notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        found = notifications.find(n => (n.data as any)?.actionId === action2.id);
        if (found && found.type === 'ACTION_DUE_SOON') {
            console.log('✅ Success: Due soon notification found.');
        } else {
            console.error('❌ Failure: Due soon notification NOT found.');
        }

        // --- TEST 3: Action Overdue Alert ---
        console.log('\n--- TEST 3: Action Overdue Alert ---');
        const deadline3 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
        const action3 = await prisma.actionPlan.create({
            data: {
                inspectionId: inspection.id,
                description: 'TEST OVERDUE ALERT',
                responsableId: user.id,
                dateEcheance: deadline3,
                statut: 'A_FAIRE',
                dueSoonNotified: true
            }
        });

        await actionService.marquerEchus();

        notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        found = notifications.find(n => (n.data as any)?.actionId === action3.id);
        if (found && found.type === 'ACTION_OVERDUE') {
            console.log('✅ Success: Overdue notification found.');
        } else {
            console.error('❌ Failure: Overdue notification NOT found.');
        }

        // Cleanup
        await prisma.actionPlan.deleteMany({
            where: { id: { in: [action1.id, action2.id, action3.id] } }
        });
        console.log('\nCleanup done.');

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testActionAlerts();
