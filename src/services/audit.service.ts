import { Service } from 'typedi';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

@Service()
export class AuditService {
  constructor(private prisma: PrismaClient) { }

  async logAction(
    action: string,
    table: string,
    recordId: string | null,
    oldData: any = null,
    newData: any = null,
    userId: string | null = null,
    ipAddress: string | null = null,
    userAgent: string | null = null
  ) {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          action,
          table,
          recordId,
          oldData,
          newData,
          userId,
          ipAddress,
          userAgent,
        },
      });
      logger.info(`Audit log created: ${action} on ${table}#${recordId}`);
      return auditLog;
    } catch (error) {
      logger.error('Error creating audit log', error);
      throw error;
    }
  }

  async getAuditLogs(
    table?: string,
    action?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          table: table ? { equals: table } : undefined,
          action: action ? { contains: action } : undefined,
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      return logs;
    } catch (error) {
      logger.error('Error fetching audit logs', error);
      throw error;
    }
  }

  async getAuditLogsByUser(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: { userId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });
      return logs;
    } catch (error) {
      logger.error('Error fetching audit logs for user', error);
      throw error;
    }
  }

  async getAuditLogsForRecord(table: string, recordId: string) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: { table, recordId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      return logs;
    } catch (error) {
      logger.error('Error fetching audit logs for record', error);
      throw error;
    }
  }


}
