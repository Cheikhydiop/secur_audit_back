import { Service } from 'typedi';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '../utils/logger.js';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

// Types de messages WebSocket pour le Questionnaire de Contrôle des Sites SONATEL
export enum WebSocketEvent {
  CONNECTION_STATUS = 'connection_status',
  AUTH_ERROR = 'auth_error',

  // Inspections
  INSPECTION_CREATED = 'inspection_created',
  INSPECTION_UPDATED = 'inspection_updated',
  INSPECTION_SUBMITTED = 'inspection_submitted',
  INSPECTION_VALIDATED = 'inspection_validated',
  INSPECTION_REJECTED = 'inspection_rejected',

  // Plans d'actions
  ACTION_CREATED = 'action_created',
  ACTION_UPDATED = 'action_updated',
  ACTION_STATUS_CHANGED = 'action_status_changed',
  ACTION_ASSIGNED = 'action_assigned',
  ACTION_DUE_SOON = 'action_due_soon',
  ACTION_OVERDUE = 'action_overdue',

  // Notifications
  NOTIFICATION = 'notification',
  NOTIFICATION_READ = 'notification_read',

  // Subscription
  SUBSCRIBE_INSPECTION = 'subscribe_inspection',
  UNSUBSCRIBE_INSPECTION = 'unsubscribe_inspection',
  SUBSCRIBE_SITE = 'subscribe_site',
  UNSUBSCRIBE_SITE = 'unsubscribe_site',

  // Health check
  PING = 'ping',
  PONG = 'pong'
}

// Payload types
export interface InspectionUpdatePayload {
  inspectionId: string;
  siteId: string;
  siteName?: string;
  statut: 'EN_COURS' | 'VALIDEE' | 'REJETEE';
  score?: number;
  inspecteurId: string;
  timestamp: string;
}

export interface ActionUpdatePayload {
  actionId: string;
  inspectionId: string;
  description: string;
  statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINE' | 'EN_RETARD';
  criticite: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  responsableId?: string;
  dateEcheance?: string;
  timestamp: string;
}

export interface NotificationPayload {
  id?: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

export interface UserPayload {
  userId: string;
  role: string;
  email?: string;
}

/**
 * Service WebSocket pour le Questionnaire de Contrôle des Sites SONATEL
 * Gère les notifications en temps réel pour les inspections, actions et alertes
 */
@Service()
export class WebSocketService {
  private static instance: WebSocketService | null = null;
  private io: SocketIOServer | null = null;
  private initialized = false;

  constructor() {
    if (WebSocketService.instance) {
      return WebSocketService.instance;
    }
    WebSocketService.instance = this;
  }

  public initialize(server: HttpServer): void {
    if (this.initialized) {
      logger.info('Socket.io server already initialized');
      return;
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.corsOrigin || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/ws'
    });

    // Authentication Middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.query.token as string;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        socket.data.userId = decoded.userId;
        socket.data.role = decoded.role;
        next();
      } catch (err) {
        next(new Error('Invalid or expired token'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    this.initialized = true;
    logger.info('Socket.io server initialized on path /ws for SONATEL Questionnaire');
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public destroy(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    this.initialized = false;
    WebSocketService.instance = null;
    logger.info('WebSocket service destroyed');
  }

  private handleConnection(socket: Socket): void {
    const userId = socket.data.userId;
    const role = socket.data.role;
    logger.info(`[Socket.io] User ${userId} (${role}) connected (${socket.id})`);

    // Join user-specific room for private notifications/updates
    socket.join(`user:${userId}`);

    // Join role-based room
    socket.join(`role:${role}`);

    // Subscribe to inspection updates
    socket.on(WebSocketEvent.SUBSCRIBE_INSPECTION, (payload: { inspectionId: string }) => {
      if (payload.inspectionId) {
        socket.join(`inspection:${payload.inspectionId}`);
        logger.info(`[Socket.io] User ${userId} joined room inspection:${payload.inspectionId}`);
        socket.emit('subscription_confirmed', { type: 'inspection', inspectionId: payload.inspectionId });
      }
    });

    socket.on(WebSocketEvent.UNSUBSCRIBE_INSPECTION, (payload: { inspectionId: string }) => {
      if (payload.inspectionId) {
        socket.leave(`inspection:${payload.inspectionId}`);
        logger.info(`[Socket.io] User ${userId} left room inspection:${payload.inspectionId}`);
      }
    });

    // Subscribe to site updates
    socket.on(WebSocketEvent.SUBSCRIBE_SITE, (payload: { siteId: string }) => {
      if (payload.siteId) {
        socket.join(`site:${payload.siteId}`);
        logger.info(`[Socket.io] User ${userId} joined room site:${payload.siteId}`);
        socket.emit('subscription_confirmed', { type: 'site', siteId: payload.siteId });
      }
    });

    socket.on(WebSocketEvent.UNSUBSCRIBE_SITE, (payload: { siteId: string }) => {
      if (payload.siteId) {
        socket.leave(`site:${payload.siteId}`);
        logger.info(`[Socket.io] User ${userId} left room site:${payload.siteId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.io] User ${userId} disconnected: ${reason}`);
    });

    // Welcome message
    socket.emit(WebSocketEvent.CONNECTION_STATUS, {
      status: 'connected',
      userId,
      role,
      serverTime: new Date().toISOString()
    });
  }

  // ================ Méthodes de broadcast pour les inspections ================

  public broadcastInspectionCreated(inspection: InspectionUpdatePayload): void {
    if (!this.io) return;
    this.io.emit(WebSocketEvent.INSPECTION_CREATED, inspection);
    logger.info(`[Socket.io] Broadcast inspection created: ${inspection.inspectionId}`);
  }

  public broadcastInspectionUpdated(inspection: InspectionUpdatePayload): void {
    if (!this.io) return;
    this.io.to(`inspection:${inspection.inspectionId}`).emit(WebSocketEvent.INSPECTION_UPDATED, inspection);
    logger.info(`[Socket.io] Broadcast inspection updated: ${inspection.inspectionId}`);
  }

  public broadcastInspectionSubmitted(inspection: InspectionUpdatePayload): void {
    if (!this.io) return;
    // Notify admins and dirigeants
    this.io.to('role:ADMIN').emit(WebSocketEvent.INSPECTION_SUBMITTED, inspection);
    this.io.to('role:SUPER_ADMIN').emit(WebSocketEvent.INSPECTION_SUBMITTED, inspection);
    this.io.to('role:DIRIGEANT').emit(WebSocketEvent.INSPECTION_SUBMITTED, inspection);
    logger.info(`[Socket.io] Broadcast inspection submitted: ${inspection.inspectionId}`);
  }

  public broadcastInspectionValidated(inspection: InspectionUpdatePayload): void {
    if (!this.io) return;
    // Notify inspecteur who did the inspection
    this.io.to(`user:${inspection.inspecteurId}`).emit(WebSocketEvent.INSPECTION_VALIDATED, inspection);
    logger.info(`[Socket.io] Broadcast inspection validated: ${inspection.inspectionId}`);
  }

  public broadcastInspectionRejected(inspection: InspectionUpdatePayload): void {
    if (!this.io) return;
    // Notify inspecteur who did the inspection
    this.io.to(`user:${inspection.inspecteurId}`).emit(WebSocketEvent.INSPECTION_REJECTED, inspection);
    logger.info(`[Socket.io] Broadcast inspection rejected: ${inspection.inspectionId}`);
  }

  // ================ Méthodes de broadcast pour les actions ================

  public broadcastActionCreated(action: ActionUpdatePayload): void {
    if (!this.io) return;
    this.io.emit(WebSocketEvent.ACTION_CREATED, action);

    // Notify the responsible user if assigned
    if (action.responsableId) {
      this.io.to(`user:${action.responsableId}`).emit(WebSocketEvent.ACTION_ASSIGNED, action);
    }
    logger.info(`[Socket.io] Broadcast action created: ${action.actionId}`);
  }

  public broadcastActionUpdated(action: ActionUpdatePayload): void {
    if (!this.io) return;
    this.io.to(`inspection:${action.inspectionId}`).emit(WebSocketEvent.ACTION_UPDATED, action);
    logger.info(`[Socket.io] Broadcast action updated: ${action.actionId}`);
  }

  public broadcastActionStatusChanged(action: ActionUpdatePayload): void {
    if (!this.io) return;
    this.io.emit(WebSocketEvent.ACTION_STATUS_CHANGED, action);
    logger.info(`[Socket.io] Broadcast action status changed: ${action.actionId}`);
  }

  public broadcastActionDueSoon(action: ActionUpdatePayload): void {
    if (!this.io) return;
    // Notify admins and the responsible user
    this.io.to('role:ADMIN').emit(WebSocketEvent.ACTION_DUE_SOON, action);
    this.io.to('role:SUPER_ADMIN').emit(WebSocketEvent.ACTION_DUE_SOON, action);
    if (action.responsableId) {
      this.io.to(`user:${action.responsableId}`).emit(WebSocketEvent.ACTION_DUE_SOON, action);
    }
    logger.info(`[Socket.io] Broadcast action due soon: ${action.actionId}`);
  }

  public broadcastActionOverdue(action: ActionUpdatePayload): void {
    if (!this.io) return;
    // Notify admins and the responsible user
    this.io.to('role:ADMIN').emit(WebSocketEvent.ACTION_OVERDUE, action);
    this.io.to('role:SUPER_ADMIN').emit(WebSocketEvent.ACTION_OVERDUE, action);
    if (action.responsableId) {
      this.io.to(`user:${action.responsableId}`).emit(WebSocketEvent.ACTION_OVERDUE, action);
    }
    logger.info(`[Socket.io] Broadcast action overdue: ${action.actionId}`);
  }

  // ================ Méthodes de notification ================

  public broadcastNotification(notification: NotificationPayload, userId?: string): void {
    if (!this.io) return;

    if (userId) {
      // Send to specific user
      this.io.to(`user:${userId}`).emit(WebSocketEvent.NOTIFICATION, notification);
    } else {
      // Broadcast to all connected users
      this.io.emit(WebSocketEvent.NOTIFICATION, notification);
    }
  }

  public notifyUser(userId: string, notification: NotificationPayload): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(WebSocketEvent.NOTIFICATION, notification);
    logger.info(`[Socket.io] Notification sent to user ${userId}`);
  }

  public notifyAdmins(notification: NotificationPayload): void {
    if (!this.io) return;
    this.io.to('role:ADMIN').emit(WebSocketEvent.NOTIFICATION, notification);
    this.io.to('role:SUPER_ADMIN').emit(WebSocketEvent.NOTIFICATION, notification);
    logger.info(`[Socket.io] Notification sent to admins`);
  }

  // ================ Méthodes utilitaires ================

  public sendToUser(userId: string, event: string, payload: any): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, payload);
  }

  public getConnectionStats(): { totalConnections: number; rooms: number } {
    if (!this.io) return { totalConnections: 0, rooms: 0 };
    return {
      totalConnections: this.io.sockets.sockets.size,
      rooms: this.io.sockets.adapter.rooms.size
    };
  }
}
