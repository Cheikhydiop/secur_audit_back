import { Router } from 'express';
import { Container } from 'typedi';
import { GlobalSettingController } from '../controllers/GlobalSettingController.js';
import { requireAuth, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();
const controller = Container.get(GlobalSettingController);

// Seul un admin ou super admin peut gérer les paramètres globaux
router.use(requireAuth as any);
router.use(authorizeRoles('ADMIN', 'SUPER_ADMIN') as any);

router.get('/', controller.getAll);
router.post('/many', controller.updateMany);

export default router;
