import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Container } from 'typedi';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

export interface UserSocket extends Socket {
  userId?: string;
}

export class WebSocketManager {
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private userSockets: Map<string, UserSocket[]> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
    });
    this.prisma = Container.get(PrismaClient);
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use((socket, next) => {
      const userId = socket.handshake.auth.userId;
      if (!userId) {
        return next(new Error('Missing userId'));
      }
      (socket as UserSocket).userId = userId;
      next();
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: UserSocket) => {
      const userId = socket.userId!;
      logger.info(`User connected: ${userId}`);

      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId)!.push(socket);

      // Join user's room
      socket.join(`user:${userId}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${userId}`);
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          const index = sockets.indexOf(socket);
          if (index > -1) {
            sockets.splice(index, 1);
          }
          if (sockets.length === 0) {
            this.userSockets.delete(userId);
          }
        }
      });


    });
  }



  // Notify user about new notification
  notifyUser(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }



  // Broadcast to all connected users
  broadcast(event: string, data: any) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Get all connected users
  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}

export default WebSocketManager;
