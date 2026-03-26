import { Request, Response } from 'express';
import { QuestionService } from '../services/QuestionService.js';

const questionService = new QuestionService();

export class QuestionController {

    getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const { actif } = req.query;
            const filters: any = {};
            if (actif !== undefined) filters.actif = actif === 'true';

            const data = await questionService.findAllQuestions(filters);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    getActiveQuestions = async (_req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.getActiveQuestions();
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    getCurrentTemplate = async (_req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.getCurrentTemplate();
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    getRubriques = async (_req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.getRubriquesAvecQuestions();
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    createRubrique = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.createRubrique(req.body);
            res.status(201).json({ success: true, data, message: 'Rubrique créée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    updateRubrique = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.updateRubrique(req.params['id'] as string, req.body);
            res.json({ success: true, data, message: 'Rubrique mise à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    deleteRubrique = async (req: Request, res: Response): Promise<void> => {
        try {
            await questionService.deleteRubrique(req.params['id'] as string);
            res.json({ success: true, message: 'Rubrique supprimée (soft delete)' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.findById(req.params['id'] as string);
            if (!data) { res.status(404).json({ success: false, message: 'Question non trouvée' }); return; }
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    create = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.create(req.body);
            res.status(201).json({ success: true, data, message: 'Question créée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.update(req.params['id'] as string, req.body);
            res.json({ success: true, data, message: 'Question mise à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    updatePonderation = async (req: Request, res: Response): Promise<void> => {
        try {
            const { criticite, poids, ponderation } = req.body;
            // Utiliser ponderation (venant du frontend) ou poids (venant d'ailleurs)
            const finalPoids = ponderation !== undefined ? ponderation : poids;

            const data = await questionService.updatePonderation(req.params['id'] as string, criticite, finalPoids);
            res.json({ success: true, data, message: 'Pondération mise à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            await questionService.delete(req.params['id'] as string);
            res.json({ success: true, message: 'Question supprimée (soft delete)' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    snapshot = async (_req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.snapshotTemplate();
            res.status(201).json({
                success: true,
                data,
                message: `Nouvelle version du questionnaire créée (v${data.version})`
            });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };
}
