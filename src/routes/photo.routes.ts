import { Router } from 'express';
import multer from 'multer';
import { PhotoController } from '../controllers/PhotoController.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();
const ctrl = new PhotoController();

// Configurer multer (stockage en mémoire)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Authentification requise pour tous les endpoints
router.use(authenticate);

/**
 * @swagger
 * /api/photos/upload:
 *   post:
 *     summary: Upload une photo d'inspection vers Cloudinary
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - inspectionId
 *               - questionId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               inspectionId:
 *                 type: string
 *               questionId:
 *                 type: string
 *               existingCount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Photo uploadée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post('/upload', upload.single('file'), ctrl.upload);

/**
 * @swagger
 * /api/photos/publicId:
 *   delete:
 *     summary: Supprimer une photo de Cloudinary
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photo supprimée
 */
router.delete('/{*publicId}', ctrl.delete);

export default router;
