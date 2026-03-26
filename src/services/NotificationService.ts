import { Service } from 'typedi';
import { PrismaClient, NotificationType, Notification } from '@prisma/client';
import prisma from '../config/prismaClient.js';
import { WebSocketService } from './WebSocketService.js';
import logger from '../utils/logger.js';

export interface CreateNotificationDto {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  data?: any;
}

@Service()
export class NotificationService {
  constructor(
    private webSocketService: WebSocketService
  ) { }

  /**
   * Convert string to NotificationType enum
   */
  private parseNotificationType(type?: string): NotificationType {
    if (!type) return NotificationType.INFO;

    // Valid enum values
    const validTypes = ['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'INSPECTION_SUBMITTED', 'ACTION_ASSIGNED', 'ACTION_DUE_SOON', 'ACTION_OVERDUE', 'INVITATION'];

    if (validTypes.includes(type)) {
      return type as NotificationType;
    }

    return NotificationType.INFO;
  }

  /**
   * Créer et envoyer une notification in-app
   */
  async sendNotification(dto: CreateNotificationDto): Promise<Notification> {
    try {
      logger.info(`Creating notification for user ${dto.userId}: ${dto.title}`);

      // Parse the type to enum
      const notificationType = this.parseNotificationType(dto.type as string);

      const notification = await prisma.notification.create({
        data: {
          userId: dto.userId,
          type: notificationType,
          title: dto.title,
          message: dto.message,
          data: dto.data,
          isRead: false,
        },
      });

      logger.info(`Notification created successfully: ${notification.id}`);

      // Envoyer via WebSocket
      try {
        this.webSocketService.broadcastNotification(
          { title: dto.title, message: dto.message, type: dto.type } as any,
          dto.userId
        );
      } catch (err) {
        logger.warn(`WebSocket notification failed for user ${dto.userId}:`, err);
      }

      return notification;
    } catch (error: any) {
      logger.error(`Failed to create notification: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Notifier tous les utilisateurs avec un certain rôle ou tous les utilisateurs (Broadcast)
   */
  async broadcastAll(type: NotificationType | string | undefined, title: string, message: string, data?: any, excludeUserId?: string) {
    try {
      logger.info(`Broadcasting notification: ${title} to all users`);

      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {})
        },
        select: { id: true },
      });

      logger.info(`Found ${users.length} active users to notify`);

      // Parse the type to enum
      const notificationType = this.parseNotificationType(type as string);

      const notifications = await Promise.all(
        users.map(user => this.sendNotification({
          userId: user.id,
          type: notificationType,
          title,
          message,
          data
        }))
      );

      logger.info(`Broadcast complete: ${notifications.length} notifications created`);
      return notifications;
    } catch (error: any) {
      logger.error(`Broadcast failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Notifier tous les utilisateurs d'une entité spécifique
   */
  async notifyByEntite(entite: string, type: NotificationType | string | undefined, title: string, message: string, data?: any, excludeUserId?: string) {
    // Normaliser l'entité
    const entiteNormalized = entite.toUpperCase().trim();

    const users = await prisma.user.findMany({
      where: {
        entite: entiteNormalized as any,
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      },
      select: { id: true, name: true, entite: true },
    });

    if (users.length === 0) {
      logger.warn(`⚠️ No users found for entite ${entiteNormalized} (excluding ${excludeUserId || 'none'})`);
      return [];
    }

    logger.info(`📤 Notifying ${users.length} users in entite ${entiteNormalized}: ${users.map(u => u.name).join(', ')}`);

    const notificationType = this.parseNotificationType(type as string);

    return Promise.all(
      users.map(user => this.sendNotification({
        userId: user.id,
        type: notificationType,
        title,
        message,
        data
      }))
    );
  }

  /**
   * Notifier tous les admins
   */
  async notifyAdmins(type: NotificationType | string | undefined, title: string, message: string, data?: any) {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        isActive: true
      },
      select: { id: true },
    });

    // Parse the type to enum
    const notificationType = this.parseNotificationType(type as string);

    return Promise.all(
      admins.map(admin => this.sendNotification({
        userId: admin.id,
        type: notificationType,
        title,
        message,
        data
      }))
    );
  }

  /**
   * Récupérer les notifications d'un utilisateur
   */
  async getNotifications(userId: string, limit = 20, offset = 0): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Récupérer les notifications non lues
   */
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Supprimer une notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    return await prisma.notification.delete({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Compter les notifications non lues
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}

