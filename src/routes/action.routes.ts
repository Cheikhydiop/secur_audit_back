import { Router } from 'express';
import { ActionController } from '../controllers/ActionController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { audit } from '../middlewares/AuditMiddleware.js';

const router = Router();
const ctrl = new ActionController();

router.use(authenticate);

/**
 * @swagger
 * /api/actions:
 *   get:
 *     summary: Liste tous les plans d'action
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [A_FAIRE, EN_COURS, TERMINE, EN_RETARD]
 *       - in: query
 *         name: criticite
 *         schema:
 *           type: string
 *           enum: [FAIBLE, MOYENNE, ELEVEE]
 *     responses:
 *       200:
 *         description: Liste des plans d'action
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ActionPlan'
 */
router.get('/', ctrl.getAll);

/**
 * @swagger
 * /api/actions/notification-summary:
 *   get:
 *     summary: Obtenir le résumé des notifications d'actions
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Résumé des actions
 */
router.get('/notification-summary', ctrl.getNotificationSummary);

/**
 * @swagger
 * /api/actions/check-overdue:
 *   post:
 *     summary: Vérifier les actions en retard
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Actions en retard traitées
 */
router.post('/check-overdue', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.checkOverdue);
router.post('/check-due-soon', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.checkDueSoon);

router.get('/reactivity-scores', authorize(['ADMIN', 'SUPER_ADMIN', 'INSPECTEUR']), ctrl.getReactivityScores);

/**
 * @swagger
 * /api/actions/{id}:
 *   get:
 *     summary: Détail d'un plan d'action
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails du plan d'action
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionPlan'
 */
router.get('/:id', ctrl.getById);

/**
 * @swagger
 * /api/actions/inspection/{inspectionId}:
 *   get:
 *     summary: Plans d'action liés à une inspection
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inspectionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des actions pour l'inspection
 */
router.get('/inspection/:inspectionId', ctrl.getByInspection);

/**
 * @swagger
 * /api/actions:
 *   post:
 *     summary: Créer un plan d'action
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inspectionId
 *               - description
 *             properties:
 *               inspectionId:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *               dateEcheance:
 *                 type: string
 *                 format: date-time
 *               criticite:
 *                 type: string
 *                 enum: [FAIBLE, MOYENNE, ELEVEE]
 *     responses:
 *       201:
 *         description: Plan d'action créé
 */
router.post('/', authorize(['ADMIN', 'INSPECTEUR']), audit.createAction(), ctrl.create);

/**
 * @swagger
 * /api/actions/{id}:
 *   put:
 *     summary: Modifier un plan d'action
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               dateEcheance:
 *                 type: string
 *                 format: date-time
 *               criticite:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plan d'action mis à jour
 */
router.put('/:id', authorize(['ADMIN', 'INSPECTEUR']), audit.updateAction(), ctrl.update);

/**
 * @swagger
 * /api/actions/{id}/statut:
 *   patch:
 *     summary: Changer le statut d'un plan d'action
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - statut
 *             properties:
 *               statut:
 *                 type: string
 *                 enum: [A_FAIRE, EN_COURS, TERMINE, EN_RETARD]
 *     responses:
 *       200:
 *         description: Statut mis à jour
 */
router.patch('/:id/statut', ctrl.updateStatut);

/**
 * @swagger
 * /api/actions/{id}/assigner:
 *   patch:
 *     summary: Assigner un porteur à un plan d'action
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - responsableId
 *               - dateEcheance
 *             properties:
 *               responsableId:
 *                 type: string
 *                 format: uuid
 *               dateEcheance:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Action assignée
 */
router.patch('/:id/assigner', authorize(['ADMIN']), ctrl.assigner);

/**
 * @swagger
 * /api/actions/{id}:
 *   delete:
 *     summary: Supprimer un plan d'action
 *     tags: [Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Plan d'action supprimé
 */
router.delete('/:id', authorize(['ADMIN']), ctrl.delete);

router.get('/:id/comments', ctrl.getComments);
router.post('/:id/comments', ctrl.addComment);

/**
 * @swagger
 * /api/actions/{id}/proposer-cloture:
 *   post:
 *     summary: Proposer la clôture d'une action par le responsable
 *     tags: [Actions]
 */
router.post('/:id/proposer-cloture', ctrl.proposerCloture);

/**
 * @swagger
 * /api/actions/{id}/valider-cloture:
 *   post:
 *     summary: Valider définitivement la clôture d'une action
 *     tags: [Actions]
 */
router.post('/:id/valider-cloture', authorize(['ADMIN', 'INSPECTEUR']), ctrl.validerCloture);
router.post('/:id/send-urgent-alert', authorize(['ADMIN', 'SUPER_ADMIN', 'INSPECTEUR']), ctrl.sendUrgentAlert);

export default router;
