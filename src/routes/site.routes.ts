import { Router } from 'express';
import { SiteController } from '../controllers/SiteController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { cacheMiddleware } from '../middlewares/cache.middleware.js';
import { audit } from '../middlewares/AuditMiddleware.js';


const router = Router();
const ctrl = new SiteController();
const cache30 = cacheMiddleware(30, true); // Cache 30s sur les GET sites

// Route publique pour l'autocomplétion
router.get('/search', cache30, ctrl.quickSearch);


router.use(authenticate);

/**
 * @swagger
 * /api/sites:
 *   get:
 *     summary: Liste tous les sites
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: zone
 *         schema:
 *           type: string
 *         description: Filtrer par zone
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filtrer par type
 *     responses:
 *       200:
 *         description: Liste des sites
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Site'
 */
router.get('/', cache30, ctrl.getAll);


/**
 * @swagger
 * /api/sites/{id}:
 *   get:
 *     summary: Détail d'un site
 *     tags: [Sites]
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
 *         description: Détails du site
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Site'
 *       404:
 *         description: Site non trouvé
 */
router.get('/:id', cache30, ctrl.getById);


/**
 * @swagger
 * /api/sites:
 *   post:
 *     summary: Créer un nouveau site
 *     tags: [Sites]
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
 *               - code
 *               - type
 *               - zone
 *               - localisation
 *             properties:
 *               nom:
 *                 type: string
 *                 example: Agence Almadies
 *               code:
 *                 type: string
 *                 example: SN-DKR-002
 *               type:
 *                 type: string
 *                 example: COMMERCIAL
 *               zone:
 *                 type: string
 *                 example: DAKAR
 *               localisation:
 *                 type: string
 *                 example: Almadies, Dakar
 *     responses:
 *       201:
 *         description: Site créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Site'
 *       400:
 *         description: Données invalides
 */
router.post('/', authorize(['ADMIN', 'SUPER_ADMIN']), audit.createSite(), ctrl.create);

/**
 * @swagger
 * /api/sites/{id}:
 *   put:
 *     summary: Modifier un site
 *     tags: [Sites]
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
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *               zone:
 *                 type: string
 *               localisation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Site mis à jour
 *       404:
 *         description: Site non trouvé
 */
router.put('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), audit.updateSite(), ctrl.update);

/**
 * @swagger
 * /api/sites/{id}:
 *   delete:
 *     summary: Supprimer un site
 *     tags: [Sites]
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
 *         description: Site supprimé
 *       404:
 *         description: Site non trouvé
 */
router.delete('/:id', authorize(['ADMIN', 'SUPER_ADMIN']), audit.deleteSite(), ctrl.delete);

/**
 * @swagger
 * /api/sites/import:
 *   post:
 *     summary: Importer des sites depuis un fichier CSV
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import réussi
 */
router.post('/import', authorize(['ADMIN', 'SUPER_ADMIN']), ctrl.importCsv);

export default router;
