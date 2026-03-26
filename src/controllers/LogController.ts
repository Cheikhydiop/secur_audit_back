/**
 * LogController - SmartAudit DG-SECU/Sonatel
 * Contrôleur pour la gestion des Audit Logs
 */
import { Request, Response } from 'express';
import { LogService } from '../services/LogService.js';

const logService = new LogService();

export class LogController {

    /**
     * GET /api/logs
     * Journal d'activités complet avec filtres et pagination (Admin / SUPER_ADMIN / DIRIGEANT)
     */
    getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                userId,
                action,
                table,
                entity,
                dateDebut,
                dateFin,
                page = 1,
                limit = 50
            } = req.query;

            const data = await logService.findAll({
                userId: userId as string,
                action: action as string,
                table: (table || entity) as string,
                dateDebut: dateDebut as string,
                dateFin: dateFin as string,
                page: Number(page),
                limit: Math.min(Number(limit), 200), // Max 200 par page
            });

            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    /**
     * GET /api/logs/moi
     * Mes propres logs (tout utilisateur authentifié)
     */
    getMesLogs = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.id || (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Non authentifié' });
                return;
            }
            const data = await logService.findByUser(userId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    /**
     * GET /api/logs/entity/:entity/:entityId
     * Logs pour une entité spécifique (ex: une inspection, un site)
     */
    getByEntity = async (req: Request, res: Response): Promise<void> => {
        try {
            const { entity, entityId } = req.params as { entity: string; entityId: string };
            const data = await logService.findByEntity(entity.toUpperCase(), entityId);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    /**
     * GET /api/logs/stats
     * Statistiques des logs (Admin)
     */
    getStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const days = Number(req.query.days) || 30;
            const data = await logService.getStats(days);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };
}
