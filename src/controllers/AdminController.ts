import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { PrismaClient, UserRole } from '@prisma/client';
import logger from '../utils/logger.js';

import prisma from '../config/prismaClient.js';

/**
 * Controller pour les actions administratives de SmartOp360
 */
export class AdminController {

    /**
     * Récupère les statistiques globales du tableau de bord Admin
     */
    static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        try {
            const [
                totalUsers,
                totalSites,
                totalInspections,
                totalActions,
                pendingActions,
                inspectionsByStatus
            ] = await Promise.all([
                prisma.user.count(),
                prisma.site.count(),
                prisma.inspection.count(),
                prisma.actionPlan.count(),
                prisma.actionPlan.count({ where: { statut: 'A_FAIRE' } }),
                prisma.inspection.groupBy({
                    by: ['statut'],
                    _count: true
                })
            ]);

            res.status(200).json({
                success: true,
                data: {
                    totalUsers,
                    totalSites,
                    totalInspections,
                    totalActions,
                    pendingActions,
                    inspectionsByStatus: inspectionsByStatus.reduce((acc: any, curr) => {
                        acc[curr.statut] = curr._count;
                        return acc;
                    }, {})
                }
            });
        } catch (error) {
            logger.error('Erreur getDashboardStats:', error);
            next(error);
        }
    }

    /**
     * Liste des utilisateurs avec filtres et pagination
     */
    static async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const { search, role } = req.query;

            console.log(`🔍 [AdminController] getUsers - search: "${search}", role: "${role}"`);

            const where: any = {};
            if (search) {
                where.OR = [
                    { name: { contains: search as string, mode: 'insensitive' } },
                    { email: { contains: search as string, mode: 'insensitive' } },
                    { phone: { contains: search as string, mode: 'insensitive' } }
                ];
            }
            if (role) {
                where.role = role as UserRole;
            }

            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                        phone: true,
                        entite: true,
                        createdAt: true
                    } as any,
                    skip,
                    take: limit,
                    orderBy: { name: 'asc' }
                }),
                prisma.user.count({ where })
            ]);

            console.log(`✅ [AdminController] getUsers - Found ${users.length} users (total: ${total})`);

            res.status(200).json({
                success: true,
                data: users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('❌ [AdminController] getUsers Error:', error);
            next(error);
        }
    }

    /**
     * Met à jour le statut ou le rôle d'un utilisateur
     */
    static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { isActive, role } = req.body;

            const updateData: any = {};
            if (isActive !== undefined) updateData.isActive = isActive;
            if (role !== undefined) updateData.role = role as UserRole;

            const user = await prisma.user.update({
                where: { id: id as string },
                data: updateData
            });

            res.status(200).json({
                success: true,
                data: user,
                message: 'Utilisateur mis à jour avec succès'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Récupère les logs d'audit système
     */
    static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const [logs, total] = await Promise.all([
                prisma.auditLog.findMany({
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.auditLog.count()
            ]);

            res.status(200).json({
                success: true,
                data: logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Liste des inspections avec filtres et pagination (pour Admin)
     */
    static async getInspections(req: Request, res: Response, next: NextFunction) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const skip = (page - 1) * limit;
            const { statut, siteId, inspecteurId, search } = req.query;

            const where: any = {};

            if (statut) {
                where.statut = statut;
            }
            if (siteId) {
                where.siteId = siteId;
            }
            if (inspecteurId) {
                where.inspecteurId = inspecteurId;
            }
            if (search) {
                where.OR = [
                    { site: { nom: { contains: search as string, mode: 'insensitive' } } },
                    { site: { code: { contains: search as string, mode: 'insensitive' } } }
                ];
            }

            const [inspections, total] = await Promise.all([
                prisma.inspection.findMany({
                    where,
                    include: {
                        site: {
                            select: {
                                id: true,
                                nom: true,
                                code: true,
                                zone: true,
                                type: true
                            }
                        },
                        inspecteur: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        _count: {
                            select: {
                                actions: true,
                                inspectionQuestions: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.inspection.count({ where })
            ]);

            res.status(200).json({
                success: true,
                data: inspections,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            logger.error('Erreur getInspections:', error);
            next(error);
        }
    }
}
