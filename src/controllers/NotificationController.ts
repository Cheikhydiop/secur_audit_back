import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { NotificationService } from '../services/NotificationService.js';
import prisma from '../config/prismaClient.js';
import logger from '../utils/logger.js';

export class NotificationController {
    private get notificationService() {
        return Container.get(NotificationService);
    }

    /**
     * Get all notifications for current user
     * GET /api/notifications
     */
    async getNotifications(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const notifications = await this.notificationService.getNotifications(userId, limit, offset);

            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get unread notifications
     * GET /api/notifications/unread
     */
    async getUnreadNotifications(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;

            const notifications = await this.notificationService.getUnreadNotifications(userId);

            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get unread count
     * GET /api/notifications/unread/count
     */
    async getUnreadCount(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;

            const count = await this.notificationService.getUnreadCount(userId);

            res.json({
                success: true,
                data: { count }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark notification as read
     * PATCH /api/notifications/:id/read
     */
    async markAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;
            const { id } = req.params;

            const notification = await this.notificationService.markAsRead(id as string, userId as string);

            res.json({
                success: true,
                data: notification,
                message: 'Notification marquée comme lue'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mark all notifications as read
     * PATCH /api/notifications/read-all
     */
    async markAllAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;

            const result = await this.notificationService.markAllAsRead(userId);

            res.json({
                success: true,
                data: result,
                message: `${result.count || 0} notifications marquées comme lues`
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete notification
     * DELETE /api/notifications/:id
     */
    async deleteNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;
            const { id } = req.params;

            await this.notificationService.deleteNotification(id as string, userId as string);

            res.json({
                success: true,
                message: 'Notification supprimée'
            });
        } catch (error) {
            next(error);
        }
    }


    /**
     * Admin: Send notification to specific user
     * POST /api/notifications/admin/send
     */
    async sendAdminNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId, type, title, message, data } = req.body;

            if (!userId || !title || !message) {
                res.status(400).json({
                    success: false,
                    message: 'userId, title et message sont requis'
                });
                return;
            }

            // Validate user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });

            if (!user) {
                res.status(400).json({
                    success: false,
                    message: `Utilisateur avec ID ${userId} non trouvé`
                });
                return;
            }

            const notification = await this.notificationService.sendNotification({
                userId,
                type,
                title,
                message,
                data
            });

            res.json({
                success: true,
                data: notification,
                message: 'Notification envoyée avec succès'
            });
        } catch (error: any) {
            logger.error(`Error sending notification: ${error.message}`, error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erreur lors de l\'envoi de la notification'
            });
        }
    }

    /**
     * Admin: Broadcast notification to all users
     * POST /api/notifications/admin/broadcast
     */
    async broadcastAdminNotification(req: Request, res: Response, next: NextFunction) {
        try {
            const { type, title, message, data } = req.body;

            if (!title || !message) {
                res.status(400).json({
                    success: false,
                    message: 'title et message sont requis'
                });
                return;
            }

            const results = await this.notificationService.broadcastAll(
                type,
                title,
                message,
                data
            );

            res.json({
                success: true,
                data: { sent: results.length },
                message: `Notification diffusée à ${results.length} utilisateurs`
            });
        } catch (error: any) {
            logger.error(`Error broadcasting notification: ${error.message}`, error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erreur lors de la diffusion'
            });
        }
    }
}

