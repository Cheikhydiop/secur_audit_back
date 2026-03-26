import { Request, Response } from 'express';
import { Container } from 'typedi';
import { RapportService } from '../services/RapportService.js';

export class RapportController {
    private get rapportService() {
        return Container.get(RapportService);
    }

    getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.userId;
            const role = (req as any).user.role;
            const data = await this.rapportService.findAll(userId, role);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.rapportService.findById(req.params['id'] as string);
            if (!data) {
                res.status(404).json({ success: false, message: 'Rapport non trouvé' });
                return;
            }
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // POST /api/rapports/generer/:inspectionId
    genererPdf = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.userId;
            const data = await this.rapportService.generateInspectionReport(req.params['inspectionId'] as string, userId);
            res.json({ success: true, data, message: 'Rapport PDF généré' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/rapports/telecharger/:id
    telecharger = async (req: Request, res: Response): Promise<void> => {
        try {
            const rapport = await this.rapportService.findById(req.params['id'] as string);
            if (!rapport) {
                res.status(404).json({ success: false, message: 'Rapport non trouvé' });
                return;
            }

            const buffer = await this.rapportService.telecharger(req.params['id'] as string);
            const isExcel = rapport.urlExcel && !rapport.urlPdf;

            res.setHeader('Content-Type', isExcel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${rapport.titre}.${isExcel ? 'xlsx' : 'pdf'}"`);
            res.send(buffer);
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // POST /api/rapports/envoyer/:id
    envoyerEmail = async (req: Request, res: Response): Promise<void> => {
        try {
            const { destinataires } = req.body;
            await this.rapportService.envoyerEmail(req.params['id'] as string, destinataires);
            res.json({ success: true, message: 'Rapport envoyé par email' });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };
}
