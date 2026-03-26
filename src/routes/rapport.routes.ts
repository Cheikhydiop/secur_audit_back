import { Router } from 'express';
import { RapportController } from '../controllers/RapportController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/authMiddleware.js';
import { audit } from '../middlewares/AuditMiddleware.js';

const router = Router();
const ctrl = new RapportController();

router.use(requireAuth);

// GET  /api/rapports               → Liste tous les rapports générés
router.get('/', ctrl.getAll);

// GET  /api/rapports/:id           → Détail d'un rapport
router.get('/:id', ctrl.getById);

// POST /api/rapports/generer/:inspectionId → Générer un PDF pour une inspection
router.post('/generer/:inspectionId', authorizeRoles('INSPECTEUR', 'ADMIN'), ctrl.genererPdf);

// GET  /api/rapports/telecharger/:id → Télécharger le PDF
router.get('/telecharger/:id', ctrl.telecharger);

// POST /api/rapports/envoyer/:id   → Envoyer le rapport par email
router.post('/envoyer/:id', authorizeRoles('ADMIN'), ctrl.envoyerEmail);

export default router;
