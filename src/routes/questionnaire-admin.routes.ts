import { Router } from 'express';
import { QuestionnaireAdminController } from '../controllers/QuestionnaireAdminController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = Router();
const controller = new QuestionnaireAdminController();

// All routes require authentication and admin role
router.use(authenticate);
router.use(adminMiddleware);

// ============ RUBRIQUE ROUTES ============

// GET /api/admin/questionnaire/rubriques - Get all rubriques
router.get('/rubriques', controller.getAllRubriques);

// GET /api/admin/questionnaire/rubriques/:id - Get specific categorie
router.get('/rubriques/:id', controller.getRubriqueById);

// POST /api/admin/questionnaire/rubriques - Create categorie
router.post('/rubriques', controller.createRubrique);

// PUT /api/admin/questionnaire/rubriques/:id - Update categorie
router.put('/rubriques/:id', controller.updateRubrique);

// DELETE /api/admin/questionnaire/rubriques/:id - Soft delete categorie
router.delete('/rubriques/:id', controller.deleteRubrique);

// PUT /api/admin/questionnaire/rubriques/reorder - Reorder rubriques
router.put('/rubriques/reorder', controller.reorderRubriques);

// ============ QUESTION ROUTES ============

// GET /api/admin/questionnaire/questions - Get all questions
router.get('/questions', controller.getAllQuestions);

// GET /api/admin/questionnaire/questions/active - Get active questions
router.get('/questions/active', controller.getActiveQuestions);

// GET /api/admin/questionnaire/questions/:id - Get specific question
router.get('/questions/:id', controller.getQuestionById);

// POST /api/admin/questionnaire/questions - Create question
router.post('/questions', controller.createQuestion);

// PUT /api/admin/questionnaire/questions/:id - Update question
router.put('/questions/:id', controller.updateQuestion);

// PUT /api/admin/questionnaire/questions/:id/ponderation - Update ponderation
router.put('/questions/:id/ponderation', controller.updatePonderation);

// DELETE /api/admin/questionnaire/questions/:id - Soft delete question
router.delete('/questions/:id', controller.deleteQuestion);

// PUT /api/admin/questionnaire/questions/reorder - Reorder questions
router.put('/questions/reorder', controller.reorderQuestions);

// PUT /api/admin/questionnaire/questions/:id/move - Move question to different category
router.put('/questions/:id/move', controller.moveQuestion);

// ============ UTILITY ROUTES ============

// POST /api/admin/questionnaire/initialize - Initialize default rubriques
router.post('/initialize', controller.initialize);

// POST /api/admin/questionnaire/snapshot - Create new template version
router.post('/snapshot', controller.snapshot);

// POST /api/admin/questionnaire/create-initial-template - Create first template if none exists
router.post('/create-initial-template', controller.createInitialTemplate);

export default router;
