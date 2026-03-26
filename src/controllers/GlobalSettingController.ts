import { Request, Response } from 'express';
import { Service } from 'typedi';
import { GlobalSettingService } from '../services/GlobalSettingService.js';

@Service()
export class GlobalSettingController {
    constructor(private readonly globalSettingService: GlobalSettingService) { }

    getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.globalSettingService.getAll();
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    updateMany = async (req: Request, res: Response): Promise<void> => {
        try {
            const { settings } = req.body; // Array of { key, value }
            const data = await this.globalSettingService.updateMany(settings);
            res.json({ success: true, data, message: 'Paramètres mis à jour' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };
}
