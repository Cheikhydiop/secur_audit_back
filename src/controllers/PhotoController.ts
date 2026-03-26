import { Request, Response } from 'express';
import { Container } from 'typedi';
import CloudinaryService from '../services/CloudinaryService.js';
import logger from '../utils/logger.js';

export class PhotoController {
    /**
     * Upload une photo vers Cloudinary
     * POST /api/photos/upload
     * Body: multipart/form-data (file: File, inspectionId: string, questionId: string)
     */
    upload = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
                return;
            }

            const { inspectionId, questionId, existingCount = 0 } = req.body;

            if (!inspectionId || !questionId) {
                res.status(400).json({ success: false, message: 'inspectionId et questionId requis' });
                return;
            }

            const result = await CloudinaryService.uploadBuffer(
                req.file.buffer,
                inspectionId,
                questionId,
                Number(existingCount),
                req.file.mimetype
            );

            res.status(200).json({
                success: true,
                data: result,
                message: 'Photo uploadée avec succès sur Cloudinary'
            });
        } catch (err: any) {
            logger.error(`❌ Upload photo échoué: ${err.message}`);
            res.status(err.status || 500).json({
                success: false,
                message: err.message || "Erreur lors de l'upload"
            });
        }
    };

    /**
     * Supprime une photo de Cloudinary
     * DELETE /api/photos/:publicId
     */
    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            let publicId = req.params.publicId as string;
            const { url } = req.query;

            // Enlever le slash leading s'il existe (pour le wildcard path)
            if (publicId && publicId.startsWith('/')) {
                publicId = publicId.substring(1);
            }

            // Si une URL est fournie, on tente d'extraire le publicId
            if (url) {
                const extractedId = CloudinaryService.getPublicIdFromUrl(url as string);
                if (extractedId) publicId = extractedId;
            }

            if (!publicId || publicId === 'undefined') {
                res.status(400).json({ success: false, message: 'publicId ou url requis' });
                return;
            }

            await CloudinaryService.deletePhoto(publicId);
            res.json({ success: true, message: 'Photo supprimée de Cloudinary' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };
}
