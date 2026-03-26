import { Router } from 'express';
import { PlanningController } from '../controllers/PlanningController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { audit } from '../middlewares/AuditMiddleware.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
const ctrl = new PlanningController();

router.use(authenticate);

// POST   /api/planning/import       → Importer une roadmap Excel (Admin)
router.post('/import', authorize(['ADMIN', 'SUPER_ADMIN']), upload.single('file'), (audit as any).createPlanning(), ctrl.importRoadmap);
router.post('/renew-year', authorize(['ADMIN', 'SUPER_ADMIN']), (audit as any).createPlanning(), ctrl.renewYearPlanning);

// GET    /api/planning              → Planning de l'inspecteur connecté
router.get('/', ctrl.getMyPlanning);

// GET    /api/planning/global       → Planning global tous inspecteurs (Visible par tous)
router.get('/global', ctrl.getPlanningGlobal);
router.get('/all', ctrl.getPlanningGlobal);


// GET    /api/planning/site/:siteId → Missions disponibles pour un site (filtrées par entité)
router.get('/site/:siteId', ctrl.getMissionsBySite);

// GET    /api/planning/pending    → Missions en attente (A_FAIRE et EN_RETARD) pour l'entité
router.get('/pending', ctrl.getPendingMissions);

// GET    /api/planning/stats       → Statistiques des inspections
router.get('/stats', ctrl.getStats);

// GET    /api/planning/:id          → Détail d'une mission
router.get('/:id', ctrl.getById);

// POST   /api/planning              → Créer une mission (Admin)
router.post('/', authorize(['ADMIN', 'SUPER_ADMIN']), audit.createPlanning(), ctrl.create);

// POST   /api/planning/:id/start    → Démarrer une inspection
router.post('/:id/start', audit.startPlanning(), ctrl.startInspection);

// POST   /api/planning/:id/finish   → Terminer une inspection
router.post('/:id/finish', ctrl.finishInspection);

// PUT    /api/planning/:id          → Modifier une mission (Admin)
router.put('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.update);

// PATCH  /api/planning/:id/status   → Mettre à jour le statut (Inspecteur ou Admin)
router.patch('/:id/status', ctrl.updateStatus);

// DELETE /api/planning/:id          → Supprimer une mission (Admin)
router.delete('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.delete);

export default router;
