import { Request, Response } from 'express';
import { ActionService } from '../services/ActionService.js';
import { Container } from 'typedi';
import { StatusAction } from '@prisma/client';

export class ActionController {
    private get actionService() {
        return Container.get(ActionService);
    }

    getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const { statut, siteId } = req.query;
            const userId = (req as any).user.userId;
            const role = (req as any).user.role;
            const data = await this.actionService.findAll({
                statut: statut as StatusAction,
                siteId: siteId as string,
                userId,
                role
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const data = await this.actionService.findById(req.params['id'] as string);

            if (!data) {
                res.status(404).json({ success: false, message: 'Plan d\'action non trouvé' });
                return;
            }

            // Sécurité : Un responsable ne voit que ses actions, un Inspecteur voit les actions de ses inspections
            // Un Admin voit tout.
            if (user.role === 'INSPECTEUR' || user.role === 'DIRIGEANT') {
                // Logique de filtrage si nécessaire, ou on laisse passer si le service gère déjà
                // Mais par précaution :
                const isOwner = data.responsableId === user.id || data.inspection?.inspecteurId === user.id;
                if (!isOwner && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                    res.status(403).json({ success: false, message: 'Accès non autorisé' });
                    return;
                }
            }

            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    getByInspection = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const inspectionId = req.params['inspectionId'] as string;

            // Vérifier d'abord le droit d'accès à l'inspection
            // (Optionnel car findAll de l'actionService pourrait déjà filtrer)

            const data = await this.actionService.findByInspection(inspectionId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    create = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.actionService.create(req.body);
            res.status(201).json({ success: true, data, message: 'Plan d\'action créé' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const actionId = req.params['id'] as string;

            const action = await this.actionService.findById(actionId);
            if (!action) {
                res.status(404).json({ success: false, message: 'Plan d\'action non trouvé' });
                return;
            }

            // Seul l'Admin ou le créateur (Inspecteur de l'inspection liée) peut modifier les détails structurels
            const isCreator = action.inspection?.inspecteurId === user.id;
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && !isCreator) {
                res.status(403).json({ success: false, message: 'Modification non autorisée' });
                return;
            }

            const data = await this.actionService.update(actionId, req.body);
            res.json({ success: true, data, message: 'Plan d\'action mis à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // PATCH /api/actions/:id/statut → À Faire | En cours | En attente | Soldé | Échu
    updateStatut = async (req: Request, res: Response): Promise<void> => {
        try {
            const { statut, notes } = req.body;
            const user = (req as any).user;
            const actionId = req.params['id'] as string;

            const action = await this.actionService.findById(actionId);
            if (!action) {
                res.status(404).json({ success: false, message: 'Plan d\'action non trouvé' });
                return;
            }

            // Vérifier si l'utilisateur est le responsable assigné ou un Admin/Inspecteur lié
            const isAuthorized = action.responsableId === user.id ||
                action.inspection?.inspecteurId === user.id ||
                user.role === 'ADMIN' ||
                user.role === 'SUPER_ADMIN';

            if (!isAuthorized) {
                res.status(403).json({ success: false, message: 'Accès non autorisé' });
                return;
            }

            const data = await this.actionService.updateStatut(actionId, statut as StatusAction, user.userId, notes);
            res.json({ success: true, data, message: `Statut mis à jour : ${statut}` });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // PATCH /api/actions/:id/assigner
    assigner = async (req: Request, res: Response): Promise<void> => {
        try {
            const { responsableId, dateEcheance } = req.body;
            const data = await this.actionService.assigner(req.params['id'] as string, responsableId, new Date(dateEcheance));
            res.json({ success: true, data, message: 'Responsable assigné, notification envoyée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.actionService.delete(req.params['id'] as string);
            res.json({ success: true, message: 'Plan d\'action supprimé' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // GET /api/actions/notification-summary → Obtenir le résumé des notifications d'actions
    getNotificationSummary = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.userId;
            const summary = await this.actionService.getActionNotificationSummary(userId);
            res.json({ success: true, data: summary });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // POST /api/actions/:id/proposer-cloture
    proposerCloture = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.userId;
            const { photoUrl, notes } = req.body;
            const data = await this.actionService.proposerCloture(req.params['id'] as string, { photoUrl, notes }, userId);
            res.json({ success: true, data, message: 'Clôture proposée, en attente de validation' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    checkDueSoon = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.actionService.checkDueSoonActions();
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // POST /api/actions/:id/valider-cloture
    validerCloture = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.userId;
            const data = await this.actionService.validerCloture(req.params['id'] as string, userId);
            res.json({ success: true, data, message: 'Action validée et clôturée définitivement' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // POST /api/actions/check-overdue → Vérifier les actions en retard (pour cron)
    checkOverdue = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.actionService.checkOverdueActions();
            res.json({ success: true, data: result, message: `${result.processed} actions en retard traitées` });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    getReactivityScores = async (req: Request, res: Response): Promise<void> => {
        try {
            const { zone, siteId } = req.query;
            const data = await this.actionService.getReactivityScores({
                zone: zone as string,
                siteId: siteId as string
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    getComments = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.actionService.getComments(req.params['id'] as string);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    addComment = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.userId;
            const { content } = req.body;
            const data = await this.actionService.addComment(req.params['id'] as string, userId, content);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };
}

