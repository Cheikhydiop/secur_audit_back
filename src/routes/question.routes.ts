import { Router } from 'express';
import { QuestionController } from '../controllers/QuestionController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = Router();
const ctrl = new QuestionController();

router.use(authenticate);

/**
 * @swagger
 * /api/questions:
 *   get:
 *     summary: Liste toutes les questions
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: actif
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: rubrique
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des questions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 */
router.get('/', ctrl.getAll);

/**
 * @swagger
 * /api/questions/active:
 *   get:
 *     summary: Liste toutes les questions actives
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des questions actives
 */
router.get('/active', ctrl.getActiveQuestions);

/**
 * @swagger
 * /api/questions/template/current:
 *   get:
 *     summary: Récupère le template du questionnaire courant
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Détails du template courant
 */
router.get('/template/current', ctrl.getCurrentTemplate);

/**
 * @swagger
 * /api/questions/rubriques:
 *   get:
 *     summary: Liste les rubriques avec leurs questions
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des rubriques et questions
 */
router.get('/rubriques', ctrl.getRubriques);

/**
 * @swagger
 * /api/questions/rubriques:
 *   post:
 *     summary: Créer une nouvelle rubrique
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               ordre:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Rubrique créée
 */
router.post('/rubriques', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.createRubrique);

/**
 * @swagger
 * /api/questions/rubriques/{id}:
 *   put:
 *     summary: Modifier une rubrique
 *     tags: [Questions]
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
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               ordre:
 *                 type: integer
 *               actif:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Rubrique mise à jour
 */
router.put('/rubriques/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.updateRubrique);

/**
 * @swagger
 * /api/questions/rubriques/{id}:
 *   delete:
 *     summary: Supprimer une rubrique
 *     tags: [Questions]
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
 *         description: Rubrique supprimée
 */
router.delete('/rubriques/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.deleteRubrique);

/**
 * @swagger
 * /api/questions/{id}:
 *   get:
 *     summary: Détail d'une question
 *     tags: [Questions]
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
 *         description: Détails de la question
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 */
router.get('/:id', ctrl.getById);

/**
 * @swagger
 * /api/questions:
 *   post:
 *     summary: Créer une nouvelle question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - texte
 *               - rubrique
 *             properties:
 *               texte:
 *                 type: string
 *               rubrique:
 *                 type: string
 *               ponderation:
 *                 type: integer
 *                 default: 1
 *               actif:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Question créée
 */
router.post('/', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.create);

/**
 * @swagger
 * /api/questions/{id}:
 *   put:
 *     summary: Modifier une question
 *     tags: [Questions]
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
 *               texte:
 *                 type: string
 *               rubrique:
 *                 type: string
 *               ponderation:
 *                 type: integer
 *               actif:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Question mise à jour
 */
router.put('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.update);

/**
 * @swagger
 * /api/questions/{id}/ponderation:
 *   put:
 *     summary: Modifier la pondération d'une question
 *     tags: [Questions]
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
 *               - ponderation
 *             properties:
 *               ponderation:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Pondération mise à jour
 */
router.put('/:id/ponderation', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.updatePonderation);

/**
 * @swagger
 * /api/questions/{id}:
 *   delete:
 *     summary: Supprimer une question
 *     tags: [Questions]
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
 *         description: Question supprimée
 */
router.delete('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.delete);

/**
 * @swagger
 * /api/questions/template/snapshot:
 *   post:
 *     summary: Crée une nouvelle version du questionnaire (snapshot)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Nouvelle version créée
 */
router.post('/template/snapshot', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.snapshot);

export default router;
