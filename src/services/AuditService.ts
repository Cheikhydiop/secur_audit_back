import logger from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';

interface CreateAuditLogParams {
  action: string;
  userId?: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  severity: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

// refactored for manual DI
export class AuditService {
  constructor(private prisma: PrismaClient) { }

  async createAuditLog(params: CreateAuditLogParams) {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          action: params.action,
          table: params.resourceType,
          recordId: params.resourceId,
          newData: params.details,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          userId: params.userId,
        },
      });

      // Log additionnel pour les événements critiques
      if (params.severity === 'HIGH' || params.severity === 'CRITICAL') {
        logger.warn(`CRITICAL AUDIT: ${params.action}`, {
          userId: params.userId,
          resourceId: params.resourceId,
          ipAddress: params.ipAddress,
          details: params.details,
        });
      }

      return auditLog;
    } catch (error) {
      logger.error(`Failed to create audit log: `);
      // Fallback: log to console/file
      this.logToFile(params);
    }
  }

  private logToFile(params: CreateAuditLogParams) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...params,
    };

    // Log dans un fichier dédié ou dans les logs système
    logger.error('AUDIT LOG FALLBACK:', logEntry);
  }

  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    severity?: string;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: { contains: filters.action, mode: 'insensitive' } }),
        ...(filters.resourceType && { table: filters.resourceType }),
        ...(filters.startDate && filters.endDate && {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async cleanupOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    logger.info(`Cleaned up ${result.count} old audit logs`);
    return result.count;
  }
}