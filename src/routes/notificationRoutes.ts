import { Router } from 'express';
import { Container } from 'typedi';
import { NotificationController } from '../controllers/NotificationController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get(
    '/',
    (req, res, next) => {
        const notificationController = Container.get(NotificationController);
        notificationController.getNotifications(req, res, next);
    }
);

/**
 * @swagger
 * /api/notifications/unread:
 *   get:
 *     summary: Get unread notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unread notifications
 */
router.get(
    '/unread',
    (req, res, next) => {
        const notificationController = Container.get(NotificationController);
        notificationController.getUnreadNotifications(req, res, next);
    }
);

/**
 * @swagger
 * /api/notifications/unread/count:
 *   get:
 *     summary: Get unread notifications count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notifications count
 */
router.get(
    '/unread/count',
    (req, res, next) => {
        const notificationController = Container.get(NotificationController);
        notificationController.getUnreadCount(req, res, next);
    }
);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count (Alias for legacy clients)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notifications count
 */
router.get(
    '/unread-count',
    (req, res, next) => {
        const notificationController = Container.get(NotificationController);
        notificationController.getUnreadCount(req, res, next);
    }
);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch(
    '/:id/read',
    (req, res, next) => {
        const notificationController = Container.get(NotificationController);
        notificationController.markAsRead(req, res, next);
    }
);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch(
    '/read-all',
    (req, res, next) => {
        const notificationController = Container.get(NotificationController);
        notificationController.markAllAsRead(req, res, next);
    }
);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete(
    '/:id',
    (req, res, next) => {
        const notificationController = Container.get(NotificationController);
        notificationController.deleteNotification(req, res, next);
    }
);

/**
 * @swagger
 * /api/notifications/admin/send:
 *   post:
 *     summary: Send notification to a specific user (Admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 default: INFO
 *     responses:
 *       200:
 *         description: Notification sent
 */
router.post(
    '/admin/send',
    requireAdmin,
    (req, res, next) => {
        const notificationController = Container.get(NotificationController);
        notificationController.sendAdminNotification(req, res, next);
    }
);

/**
 * @swagger
 * /api/notifications/admin/broadcast:
 *   post:
 *     summary: Broadcast notification to all users (Admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 default: INFO
 *     responses:
 *       200:
 *         description: Notification broadcasted
 */
router.post(
    '/admin/broadcast',
    requireAdmin,
    (req, res, next) => {
        const notificationController = Container.get(NotificationController);
        notificationController.broadcastAdminNotification(req, res, next);
    }
);

export default router;
