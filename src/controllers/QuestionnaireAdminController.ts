import { Request, Response } from 'express';
import { QuestionService } from '../services/QuestionService.js';

const questionService = new QuestionService();

export class QuestionnaireAdminController {

    // ============ RUBRIQUE ENDPOINTS ============

    /**
     * GET /api/admin/questionnaire/rubriques
     * Get all rubriques with their questions
     */
    getAllRubriques = async (_req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.findAllRubriques();
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    /**
     * GET /api/admin/questionnaire/rubriques/:id
     * Get a specific categorie with its questions
     */
    getRubriqueById = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.getRubriqueById(req.params['id'] as string);
            if (!data) {
                res.status(404).json({ success: false, message: 'Rubrique non trouvée' });
                return;
            }
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    /**
     * POST /api/admin/questionnaire/rubriques
     * Create a new categorie
     */
    createRubrique = async (req: Request, res: Response): Promise<void> => {
        try {
            const { nom, description, ordre } = req.body;
            if (!nom) {
                res.status(400).json({ success: false, message: 'Le nom de la catégorie est requis' });
                return;
            }
            const data = await questionService.createRubrique({ nom, description, ordre });
            res.status(201).json({ success: true, data, message: 'Rubrique créée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    /**
     * PUT /api/admin/questionnaire/rubriques/:id
     * Update a categorie
     */
    updateRubrique = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.updateRubrique(req.params['id'] as string, req.body);
            res.json({ success: true, data, message: 'Rubrique mise à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    /**
     * DELETE /api/admin/questionnaire/rubriques/:id
     * Soft delete a categorie
     */
    deleteRubrique = async (req: Request, res: Response): Promise<void> => {
        try {
            await questionService.deleteRubrique(req.params['id'] as string);
            res.json({ success: true, message: 'Rubrique désactivée (soft delete)' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    /**
     * PUT /api/admin/questionnaire/rubriques/reorder
     * Reorder rubriques
     */
    reorderRubriques = async (req: Request, res: Response): Promise<void> => {
        try {
            const { orderedIds } = req.body;
            if (!orderedIds || !Array.isArray(orderedIds)) {
                res.status(400).json({ success: false, message: 'Tableau des IDs requis' });
                return;
            }
            await questionService.reorderRubriques(orderedIds);
            res.json({ success: true, message: 'Ordre des rubriques mis à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ============ QUESTION ENDPOINTS ============

    /**
     * GET /api/admin/questionnaire/questions
     * Get all questions with optional filters
     */
    getAllQuestions = async (req: Request, res: Response): Promise<void> => {
        try {
            const { categorieId, actif } = req.query;
            const filters: any = {};
            if (categorieId) filters.categorieId = categorieId as string;
            if (actif !== undefined) filters.actif = actif === 'true';

            const data = await questionService.findAllQuestions(filters);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    /**
     * GET /api/admin/questionnaire/questions/active
     * Get all active questions
     */
    getActiveQuestions = async (_req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.getActiveQuestions();
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    /**
     * GET /api/admin/questionnaire/questions/:id
     * Get a specific question
     */
    getQuestionById = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.findById(req.params['id'] as string);
            if (!data) {
                res.status(404).json({ success: false, message: 'Question non trouvée' });
                return;
            }
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    /**
     * POST /api/admin/questionnaire/questions
     * Create a new question
     */
    createQuestion = async (req: Request, res: Response): Promise<void> => {
        try {
            const { texte, categorieId, helper, ponderation, criticite, ordre } = req.body;
            if (!texte || !categorieId) {
                res.status(400).json({ success: false, message: 'Texte et catégorie requis' });
                return;
            }
            const data = await questionService.create({
                texte,
                categorieId,
                helper,
                ponderation,
                criticite,
                ordre
            });
            res.status(201).json({ success: true, data, message: 'Question créée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    /**
     * PUT /api/admin/questionnaire/questions/:id
     * Update a question
     */
    updateQuestion = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.update(req.params['id'] as string, req.body);
            res.json({ success: true, data, message: 'Question mise à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    /**
     * PUT /api/admin/questionnaire/questions/:id/ponderation
     * Update question ponderation
     */
    updatePonderation = async (req: Request, res: Response): Promise<void> => {
        try {
            const { criticite, poids } = req.body;
            const data = await questionService.updatePonderation(req.params['id'] as string, criticite, poids);
            res.json({ success: true, data, message: 'Pondération mise à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    /**
     * DELETE /api/admin/questionnaire/questions/:id
     * Soft delete a question
     */
    deleteQuestion = async (req: Request, res: Response): Promise<void> => {
        try {
            await questionService.delete(req.params['id'] as string);
            res.json({ success: true, message: 'Question désactivée (soft delete)' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    /**
     * PUT /api/admin/questionnaire/questions/reorder
     * Reorder questions within a category
     */
    reorderQuestions = async (req: Request, res: Response): Promise<void> => {
        try {
            const { categorieId, orderedIds } = req.body;
            if (!categorieId || !orderedIds || !Array.isArray(orderedIds)) {
                res.status(400).json({ success: false, message: 'Catégorie et tableau des IDs requis' });
                return;
            }
            await questionService.reorderQuestions(categorieId, orderedIds);
            res.json({ success: true, message: 'Ordre des questions mis à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    /**
     * PUT /api/admin/questionnaire/questions/:id/move
     * Move question to a different category
     */
    moveQuestion = async (req: Request, res: Response): Promise<void> => {
        try {
            const { targetCategorieId, newOrdre } = req.body;
            if (!targetCategorieId || newOrdre === undefined) {
                res.status(400).json({ success: false, message: 'Catégorie cible et nouvel ordre requis' });
                return;
            }
            await questionService.moveQuestion(req.params['id'] as string, targetCategorieId, newOrdre);
            res.json({ success: true, message: 'Question déplacée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // ============ INITIALIZATION ENDPOINT ============

    /**
     * POST /api/admin/questionnaire/initialize
     * Initialize default rubriques if none exist
     */
    initialize = async (_req: Request, res: Response): Promise<void> => {
        try {
            await questionService.initializeDefaultRubriques();
            res.json({ success: true, message: 'Rubriques par défaut initialisées' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // ============ TEMPLATE SNAPSHOT ============

    /**
     * POST /api/admin/questionnaire/snapshot
     * Create a new version of the questionnaire template
     */
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

    /**
     * POST /api/admin/questionnaire/create-initial-template
     * Create the first template if none exists
     */
    createInitialTemplate = async (_req: Request, res: Response): Promise<void> => {
        try {
            const data = await questionService.createInitialTemplate();
            res.status(201).json({
                success: true,
                data,
                message: `Template initial créé (v${data.version})`
            });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };
}
