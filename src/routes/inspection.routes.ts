import { Router } from 'express';
import { InspectionController } from '../controllers/InspectionController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { audit } from '../middlewares/AuditMiddleware.js';

const router = Router();
const ctrl = new InspectionController();

router.use(authenticate);

/**
 * @swagger
 * /api/inspections:
 *   get:
 *     summary: Liste toutes les inspections
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [EN_COURS, VALIDEE, REJETEE]
 *       - in: query
 *         name: siteId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des inspections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Inspection'
 */
router.get('/', ctrl.getAll);

/**
 * @swagger
 * /api/inspections/en-cours:
 *   get:
 *     summary: Liste les inspections en cours
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des inspections en cours
 */
router.get('/en-cours', ctrl.getEnCours);

/**
 * @swagger
 * /api/inspections/{id}:
 *   get:
 *     summary: Détail d'une inspection
 *     tags: [Inspections]
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
 *         description: Détails de l'inspection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Inspection'
 */
router.get('/:id', ctrl.getById);

/**
 * @swagger
 * /api/inspections/{id}/questions:
 *   get:
 *     summary: Liste les questions (snapshots) d'une inspection
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des questions snapshots
 */
router.get('/:id/questions', ctrl.getQuestions);

/**
 * @swagger
 * /api/inspections/{id}/questions/{questionId}:
 *   put:
 *     summary: Mettre à jour la réponse à une question
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *       - in: path
 *         name: questionId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reponse:
 *                 type: string
 *               observation:
 *                 type: string
 *               recommendation:
 *                 type: string
 *               photoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Réponse mise à jour
 */
router.put('/:id/questions/:questionId', ctrl.updateQuestionResponse);

/**
 * @swagger
 * /api/inspections:
 *   post:
 *     summary: Créer une nouvelle inspection
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - siteId
 *             properties:
 *               siteId:
 *                 type: string
 *                 format: uuid
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               gpsAccuracy:
 *                 type: number
 *     responses:
 *       201:
 *         description: Inspection créée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Inspection'
 */
router.post('/', authorize(['INSPECTEUR', 'ADMIN']), audit.startInspection(), ctrl.create);

/**
 * @swagger
 * /api/inspections/{id}:
 *   put:
 *     summary: Modifier une inspection
 *     tags: [Inspections]
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
 *               reponses:
 *                 type: object
 *               score:
 *                 type: number
 *     responses:
 *       200:
 *         description: Inspection mise à jour
 */
router.put('/:id', authorize(['INSPECTEUR', 'ADMIN']), audit.updateInspection(), ctrl.update);

/**
 * @swagger
 * /api/inspections/{id}/soumettre:
 *   post:
 *     summary: Soumettre une inspection
 *     tags: [Inspections]
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
 *         description: Inspection soumise
 */
router.post('/:id/soumettre', authorize(['INSPECTEUR', 'ADMIN']), audit.submitInspection(), ctrl.soumettre);

/**
 * @swagger
 * /api/inspections/{id}:
 *   delete:
 *     summary: Supprimer une inspection
 *     tags: [Inspections]
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
 *         description: Inspection supprimée
 */
router.delete('/:id', authorize(['ADMIN']), audit.deleteInspection(), ctrl.delete);

/**
 * @swagger
 * /api/inspections/{id}/progress:
 *   get:
 *     summary: Obtenir le progrès d'une inspection
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progrès de l'inspection
 */
router.get('/:id/progress', ctrl.getProgress);

/**
 * @swagger
 * /api/inspections/{id}/auto-save:
 *   put:
 *     summary: Sauvegarde automatique d'une réponse
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionIdOriginal:
 *                 type: string
 *               reponse:
 *                 type: string
 *               observation:
 *                 type: string
 *               recommendation:
 *                 type: string
 *               photoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Réponse sauvegardée
 */
router.put('/:id/auto-save', ctrl.autoSaveResponse);

/**
 * @swagger
 * /api/inspections/{id}/dynamic-questions:
 *   get:
 *     summary: Obtenir les questions avec visibilité dynamique
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Questions avec leur statut de visibilité
 */
router.get('/:id/dynamic-questions', ctrl.getDynamicQuestions);

export default router;
