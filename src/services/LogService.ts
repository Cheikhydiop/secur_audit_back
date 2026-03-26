/**
 * LogService - SmartAudit DG-SECU/Sonatel
 * Service centralisé pour la gestion des Audit Logs
 * Connecté à Prisma pour la persistance en base de données
 */
import prisma from '../config/prismaClient.js';
import logger from '../utils/logger.js';

export interface AuditLogFilters {
    userId?: string;
    action?: string;
    table?: string;
    dateDebut?: string;
    dateFin?: string;
    page: number;
    limit: number;
}

export interface CreateAuditLogDTO {
    userId: string;
    action: string;
    entity: string;       // ex: 'INSPECTION', 'ACTION', 'USER', 'SITE'
    entityId?: string;
    details?: object;
    oldData?: object;
    newData?: object;
    ipAddress?: string;
    userAgent?: string;
}

export class LogService {

    /**
     * Récupère tous les logs avec pagination et filtres
     */
    async findAll(filters: AuditLogFilters) {
        const { userId, action, table, dateDebut, dateFin, page, limit } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (userId) where.userId = userId;
        if (action) where.action = { contains: action, mode: 'insensitive' };
        if (table) where.table = { equals: table, mode: 'insensitive' };
        if (dateDebut || dateFin) {
            where.createdAt = {};
            if (dateDebut) where.createdAt.gte = new Date(dateDebut);
            if (dateFin) where.createdAt.lte = new Date(dateFin + 'T23:59:59.999Z');
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true, entite: true }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        return {
            logs: logs.map(this.formatLog),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Récupère les logs d'un utilisateur spécifique
     */
    async findByUser(userId: string, limit: number = 100) {
        const logs = await prisma.auditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        });
        return logs.map(this.formatLog);
    }

    /**
     * Récupère les logs pour un enregistrement spécifique (ex: les logs d'une inspection)
     */
    async findByEntity(entity: string, entityId: string) {
        const logs = await prisma.auditLog.findMany({
            where: {
                OR: [
                    { entity, entityId },
                    { table: entity, recordId: entityId },
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        });
        return logs.map(this.formatLog);
    }

    /**
     * Créer un entrée dans le journal d'audit
     */
    async createLog(data: CreateAuditLogDTO) {
        try {
            const log = await prisma.auditLog.create({
                data: {
                    action: data.action,
                    entity: data.entity,
                    entityId: data.entityId ?? '',
                    table: data.entity.toLowerCase(),
                    recordId: data.entityId,
                    details: data.details as any,
                    oldData: data.oldData as any,
                    newData: data.newData as any,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    userId: data.userId,
                }
            });
            logger.info(`[AUDIT] ${data.action} sur ${data.entity}#${data.entityId} par ${data.userId}`);
            return log;
        } catch (error) {
            logger.error('[AUDIT] Erreur lors de la création du log:', error);
            // Ne pas faire planter l'application si l'audit échoue
            return null;
        }
    }

    /**
     * Méthode statique pour créer un log depuis n'importe quel contrôleur/service
     * Usage: await LogService.log({ userId, action: 'INSPECTION_CREATED', entity: 'INSPECTION', entityId })
     */
    static async log(data: CreateAuditLogDTO) {
        try {
            const log = await prisma.auditLog.create({
                data: {
                    action: data.action,
                    entity: data.entity,
                    entityId: data.entityId ?? '',
                    table: data.entity.toLowerCase(),
                    recordId: data.entityId,
                    details: data.details as any,
                    oldData: data.oldData as any,
                    newData: data.newData as any,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    userId: data.userId,
                }
            });
            return log;
        } catch (error) {
            logger.error('[AUDIT STATIC] Erreur lors de la création du log:', error);
            return null;
        }
    }

    /**
     * Retourne les statistiques des logs (volume par action, par user, etc.)
     */
    async getStats(days: number = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [
            totalLogs,
            logsByAction,
            logsByUser,
            recentActivity,
        ] = await Promise.all([
            prisma.auditLog.count({ where: { createdAt: { gte: since } } }),

            prisma.auditLog.groupBy({
                by: ['action'],
                where: { createdAt: { gte: since } },
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } },
                take: 10,
            }),

            prisma.auditLog.groupBy({
                by: ['userId'],
                where: { createdAt: { gte: since } },
                _count: { userId: true },
                orderBy: { _count: { userId: 'desc' } },
                take: 5,
            }),

            // Activité des 7 derniers jours
            prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as day,
          COUNT(*) as count
        FROM "AuditLog"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY day ASC
      ` as Promise<Array<{ day: Date; count: bigint }>>,
        ]);

        return {
            totalLogs,
            logsByAction: logsByAction.map(l => ({ action: l.action, count: l._count.action })),
            logsByUser,
            recentActivity: recentActivity.map((r: any) => ({
                day: r.day,
                count: Number(r.count),
            })),
        };
    }

    /**
     * Formater un log pour l'affichage frontend
     */
    private formatLog(log: any) {
        return {
            id: log.id,
            userId: log.userId,
            user: log.user?.name || log.userId,
            userEmail: log.user?.email,
            userRole: log.user?.role,
            action: log.action,
            entity: log.entity || log.table || '',
            entityId: log.entityId || log.recordId || '',
            target: `${log.entity || log.table || ''}${log.entityId || log.recordId ? `#${log.entityId || log.recordId}` : ''}`,
            entityType: log.entity || log.table,
            details: typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || ''),
            oldData: log.oldData,
            newData: log.newData,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            timestamp: log.createdAt,
            category: determineCategory(log.action),
        };
    }
}

/**
 * Détermine la catégorie d'une action pour l'affichage
 */
function determineCategory(action: string): 'create' | 'update' | 'delete' | 'system' {
    const upper = action.toUpperCase();
    if (upper.includes('CREATE') || upper.includes('START') || upper.includes('SUBMIT') || upper.includes('ADD')) return 'create';
    if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('CHANGE') || upper.includes('SAVE') || upper.includes('VALIDATE')) return 'update';
    if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('CANCEL')) return 'delete';
    return 'system';
}

export const logService = new LogService();
export default logService;
