import { Request, Response } from 'express';
import { InspectionService } from '../services/InspectionService.js';
import { Container } from 'typedi';
import { StatusInspection } from '@prisma/client';
import { RapportService } from '../services/RapportService.js';

export class InspectionController {
    private get inspectionService() {
        return Container.get(InspectionService);
    }

    private get rapportService() {
        return Container.get(RapportService);
    }

    // GET /api/inspections
    getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const { siteId, statut, startDate, endDate, page = 1, limit = 20 } = req.query;
            let { inspecteurId } = req.query;
            const user = (req as any).user;

            // Si c'est un inspecteur, il ne voit que ses inspections
            if (user.role === 'INSPECTEUR') {
                inspecteurId = user.id;
            }

            const data = await this.inspectionService.findAll({
                siteId: siteId as string,
                statut: statut as StatusInspection,
                inspecteurId: inspecteurId as string,
                startDate: startDate as string,
                endDate: endDate as string,
                page: Number(page),
                limit: Number(limit),
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/inspections/en-cours
    getEnCours = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.userId;
            const data = await this.inspectionService.findEnCours(userId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/inspections/:id
    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const data = await this.inspectionService.findById(req.params['id'] as string);

            if (!data) {
                res.status(404).json({ success: false, message: 'Inspection non trouvée' });
                return;
            }

            // Sécurité : Seul l'inspecteur assigné ou un Admin/Dirigeant peut voir le détail
            if (user.role === 'INSPECTEUR' && data.inspecteurId !== user.id) {
                res.status(403).json({ success: false, message: 'Accès non autorisé à cette inspection' });
                return;
            }

            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/inspections/:id/questions
    getQuestions = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const inspectionId = req.params['id'] as string;
            const data = await this.inspectionService.getInspectionQuestions(inspectionId);

            if (!data) {
                res.status(404).json({ success: false, message: 'Inspection non trouvée' });
                return;
            }

            // Sécurité : Vérifier le droit d'accès aux questions
            const inspection = await this.inspectionService.findById(inspectionId);
            if (user.role === 'INSPECTEUR' && inspection?.inspecteurId !== user.id) {
                res.status(403).json({ success: false, message: 'Accès non autorisé' });
                return;
            }

            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // POST /api/inspections
    create = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.userId;
            const data = await this.inspectionService.create({ ...req.body, inspecteurId: userId });
            res.status(201).json({ success: true, data, message: 'Inspection démarrée avec snapshot des questions' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // PUT /api/inspections/:id
    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const inspectionId = req.params['id'] as string;

            const inspection = await this.inspectionService.findById(inspectionId);
            if (!inspection) {
                res.status(404).json({ success: false, message: 'Inspection non trouvée' });
                return;
            }

            // Sécurité : Seul l'inspecteur assigné peut modifier son brouillon
            if (user.role === 'INSPECTEUR' && inspection.inspecteurId !== user.id) {
                res.status(403).json({ success: false, message: 'Vous ne pouvez pas modifier cette inspection' });
                return;
            }

            // Empêcher la modification d'une inspection déjà soumise (sauf admin peut-être, mais ici bloqué pour tous)
            if (inspection.statut !== 'EN_COURS' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                res.status(400).json({ success: false, message: 'Une inspection soumise ne peut plus être modifiée' });
                return;
            }

            const data = await this.inspectionService.update(inspectionId, req.body);
            res.json({ success: true, data, message: 'Inspection sauvegardée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // PUT /api/inspections/:id/questions/:questionId
    updateQuestionResponse = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const inspectionId = req.params['id'] as string;
            const questionId = req.params['questionId'] as string;

            const inspection = await this.inspectionService.findById(inspectionId);
            if (!inspection) {
                res.status(404).json({ success: false, message: 'Inspection non trouvée' });
                return;
            }

            if (user.role === 'INSPECTEUR' && inspection.inspecteurId !== user.id) {
                res.status(403).json({ success: false, message: 'Accès refusé' });
                return;
            }

            const data = await this.inspectionService.updateQuestionResponse(inspectionId, questionId, req.body);
            res.json({ success: true, data, message: 'Réponse sauvegardée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // POST /api/inspections/:id/soumettre
    soumettre = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const inspectionId = req.params['id'] as string;
            const userId = user.userId;

            const inspection = await this.inspectionService.findById(inspectionId);
            if (!inspection) {
                res.status(404).json({ success: false, message: 'Inspection non trouvée' });
                return;
            }

            // Sécurité : Seul l'inspecteur assigné peut soumettre
            if (user.role === 'INSPECTEUR' && inspection.inspecteurId !== user.userId) {
                res.status(403).json({ success: false, message: 'Seul l\'inspecteur assigné peut soumettre ce contrôle' });
                return;
            }

            if (inspection.statut !== 'EN_COURS') {
                res.status(400).json({ success: false, message: 'Cette inspection a déjà été soumise' });
                return;
            }

            const { gpsData } = req.body;
            const data = await this.inspectionService.soumettre(inspectionId, gpsData);

            // Générer le rapport en arrière-plan
            this.rapportService.generateInspectionReport(inspectionId, userId, ['pdf', 'excel'])
                .catch((err: any) => console.error('Erreur génération rapport auto:', err));

            res.json({
                success: true,
                data,
                message: 'Inspection soumise avec succès. Le rapport est en cours de génération.'
            });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // DELETE /api/inspections/:id
    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.inspectionService.delete(req.params['id'] as string);
            res.json({ success: true, message: 'Inspection supprimée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // GET /api/inspections/:id/progress - Get inspection progress
    getProgress = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.inspectionService.getInspectionProgress(req.params['id'] as string);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // PUT /api/inspections/:id/auto-save - Auto-save a single response
    autoSaveResponse = async (req: Request, res: Response): Promise<void> => {
        try {
            const inspectionId = req.params['id'] as string;
            const { questionIdOriginal, reponse, observation, recommendation, photoUrl } = req.body;
            const data = await this.inspectionService.autoSaveResponse(
                inspectionId,
                questionIdOriginal,
                { reponse, observation, recommendation, photoUrl }
            );
            res.json({ success: true, data, message: 'Réponse sauvegardée automatiquement' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // GET /api/inspections/:id/dynamic-questions - Get questions with dynamic visibility
    getDynamicQuestions = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.inspectionService.getDynamicQuestions(req.params['id'] as string);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };
}
