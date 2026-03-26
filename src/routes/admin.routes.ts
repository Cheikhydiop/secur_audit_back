import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { InvitationController } from '../controllers/InvitationController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = Router();

// Toutes les routes admin nécessitent d'être authentifié et d'être ADMIN ou SUPER_ADMIN
router.use(authenticate);
// Routes pour la gestion administrative du système
// GET    /api/admin/stats       → Statistiques globales (Admin)
router.get('/stats', authorize(['ADMIN', 'SUPER_ADMIN']), AdminController.getDashboardStats);

// GET    /api/admin/users       → Liste des utilisateurs (Accessible à tous pour filtres)
router.get('/users', AdminController.getUsers);

// PATCH  /api/admin/users/:id   → Modifier statut/rôle (Admin)
router.patch('/users/:id/status', authorize(['ADMIN', 'SUPER_ADMIN']), AdminController.updateUserStatus);

// POST   /api/admin/users/:id/resend → Renvoyer invitation (Admin)
router.post('/users/:id/resend-invitation', authorize(['ADMIN', 'SUPER_ADMIN']), InvitationController.resendInvitation);

// GET    /api/admin/audit-logs  → Logs système (Admin)
router.get('/audit-logs', authorize(['ADMIN', 'SUPER_ADMIN']), AdminController.getAuditLogs);

// GET    /api/admin/inspections → Liste des inspections (Admin)
router.get('/inspections', authorize(['ADMIN', 'SUPER_ADMIN']), AdminController.getInspections);

// TEST   /api/admin/test-planning-email → Force envoi planning hebdo (Test)
router.post('/test-planning-email', authorize(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
    try {
        const { Container } = await import('typedi');
        const { CronService } = await import('../services/CronService.js');
        const cronService = Container.get(CronService);
        await cronService.sendWeeklyPlanningNotification();
        res.json({ success: true, message: "Envoi forcé du planning hebdomadaire avec succès. Consultez les logs." });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
