import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { UserSettingsService } from '../services/UserSettingsService.js';
import { ValidationError } from '../errors/customErrors.js';

export class UserSettingsController {

    static async getSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id; // Assumes requireAuth middleware
            const service = Container.get(UserSettingsService);

            const settings = await service.getUserSettings(userId);

            res.status(200).json({
                success: true,
                data: settings
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const service = Container.get(UserSettingsService);

            // Clean up to keep only fields present in SONATEL User schema
            const allowedFields = ['name', 'phone'];
            const data = req.body;

            const filteredData: any = {};
            Object.keys(data).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredData[key] = data[key];
                }
            });

            const updatedSettings = await service.updateProfile(userId, filteredData);

            res.status(200).json({
                success: true,
                data: updatedSettings,
                message: 'Profil mis à jour avec succès'
            });
        } catch (error) {
            next(error);
        }
    }

    static async updatePreferences(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const service = Container.get(UserSettingsService);

            const allowedFields = ['notificationsEnabled', 'emailNotifications', 'smsNotifications', 'language', 'theme'];
            const data = req.body;

            const filteredData: any = {};
            Object.keys(data).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredData[key] = data[key];
                }
            });

            const updatedSettings = await service.updatePreferences(userId, filteredData);

            res.status(200).json({
                success: true,
                data: updatedSettings,
                message: 'Préférences mises à jour avec succès'
            });
        } catch (error) {
            next(error);
        }
    }
}
