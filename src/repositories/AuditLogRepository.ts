import { PrismaClient } from '@prisma/client';

export interface CreateAuditLogData {
  action: string;
  table: string;
  recordId?: string;
  userId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface FindAuditLogsFilter {
  userId?: string;
  action?: string;
  table?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Créer un log d'audit
   */
  async create(data: CreateAuditLogData) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          action: data.action,
          table: data.table,
          recordId: data.recordId,
          userId: data.userId,
          oldData: data.oldData,
          newData: data.newData,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la création du log d\'audit:', error);
      throw error;
    }
  }

  /**
   * Trouver un log d'audit par ID
   */
  async findById(id: string) {
    try {
      return await this.prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la recherche du log d\'audit par ID:', error);
      throw error;
    }
  }

  /**
   * Trouver les logs d'audit avec filtres
   */
  async find(filter: FindAuditLogsFilter = {}) {
    try {
      const where: any = {};

      if (filter.userId) {
        where.userId = filter.userId;
      }

      if (filter.action) {
        where.action = filter.action;
      }

      if (filter.table) {
        where.table = filter.table;
      }

      if (filter.startDate || filter.endDate) {
        where.createdAt = {};
        if (filter.startDate) {
          where.createdAt.gte = filter.startDate;
        }
        if (filter.endDate) {
          where.createdAt.lte = filter.endDate;
        }
      }

      const take = filter.limit || 50;
      const skip = filter.offset || 0;

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        }),
        this.prisma.auditLog.count({ where })
      ]);

      return {
        logs,
        total,
        limit: take,
        offset: skip,
        hasMore: skip + take < total
      };
    } catch (error) {
      console.error('❌ Erreur lors de la recherche des logs d\'audit:', error);
      throw error;
    }
  }

  /**
   * Obtenir les actions d'audit d'un utilisateur
   */
  async findByUserId(userId: string, limit: number = 50) {
    try {
      return await this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la recherche des logs d\'audit par utilisateur:', error);
      throw error;
    }
  }

  /**
   * Obtenir les logs d'audit pour une table spécifique
   */
  async findByTable(table: string, limit: number = 50) {
    try {
      return await this.prisma.auditLog.findMany({
        where: { table },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la recherche des logs d\'audit par table:', error);
      throw error;
    }
  }

  /**
   * Obtenir les actions récentes
   */
  async getRecentActions(days: number = 7, limit: number = 100) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des actions récentes:', error);
      throw error;
    }
  }

  /**
   * Supprimer les logs d'audit anciens
   */
  async deleteOldLogs(days: number = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`✅ ${result.count} anciens logs d'audit supprimés`);
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des anciens logs:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'audit
   */
  async getStats(startDate?: Date, endDate?: Date) {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      const [
        total,
        byAction,
        byTable,
        byUser,
        recentCount
      ] = await Promise.all([
        // Total
        this.prisma.auditLog.count({ where }),
        
        // Par action
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: {
            action: true
          },
          orderBy: {
            _count: {
              action: 'desc'
            }
          }
        }),
        
        // Par table
        this.prisma.auditLog.groupBy({
          by: ['table'],
          where,
          _count: {
            table: true
          },
          orderBy: {
            _count: {
              table: 'desc'
            }
          }
        }),
        
        // Par utilisateur
        this.prisma.auditLog.groupBy({
          by: ['userId'],
          where,
          _count: {
            userId: true
          },
          orderBy: {
            _count: {
              userId: 'desc'
            }
          }
        }),
        
        // Récent (dernières 24h)
        this.prisma.auditLog.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      return {
        total,
        byAction: byAction.map(item => ({
          action: item.action,
          count: item._count.action
        })),
        byTable: byTable.map(item => ({
          table: item.table,
          count: item._count.table
        })),
        byUser: byUser.map(item => ({
          userId: item.userId,
          count: item._count.userId
        })),
        recentCount,
        dailyAverage: startDate && endDate 
          ? total / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
          : 0
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques d\'audit:', error);
      throw error;
    }
  }

  /**
   * Enregistrer une action utilisateur
   */
  async logUserAction(
    userId: string,
    action: string,
    table: string,
    recordId?: string,
    oldData?: any,
    newData?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      return await this.create({
        action,
        table,
        recordId,
        userId,
        oldData,
        newData,
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement de l\'action utilisateur:', error);
      throw error;
    }
  }

  /**
   * Enregistrer une action système
   */
  async logSystemAction(
    action: string,
    table: string,
    recordId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      return await this.create({
        action,
        table,
        recordId,
        oldData: null,
        newData: details,
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement de l\'action système:', error);
      throw error;
    }
  }

  /**
   * Suivre les changements d'un enregistrement
   */
  async trackChanges(
    table: string,
    recordId: string,
    oldData: any,
    newData: any,
    userId?: string,
    action: string = 'UPDATE'
  ) {
    try {
      return await this.create({
        action,
        table,
        recordId,
        userId,
        oldData,
        newData
      });
    } catch (error) {
      console.error('❌ Erreur lors du suivi des changements:', error);
      throw error;
    }
  }
}