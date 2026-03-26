import { Router } from 'express';
import { LogController } from '../controllers/LogController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = Router();
const ctrl = new LogController();

router.use(authenticate);

// GET /api/logs                → Journal d'activités complet (Admin + Dirigeant)
router.get('/', authorize(['ADMIN', 'SUPER_ADMIN', 'DIRIGEANT']), ctrl.getAll);

// GET /api/logs/stats          → Statistiques des logs (Admin)
router.get('/stats', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.getStats);

// GET /api/logs/moi            → Mes propres logs
router.get('/moi', ctrl.getMesLogs);

// GET /api/logs/entity/:entity/:entityId  → Logs d'une entité spécifique
router.get('/entity/:entity/:entityId', authorize(['ADMIN', 'SUPER_ADMIN', 'DIRIGEANT']), ctrl.getByEntity);

export default router;
