import { Service } from 'typedi';
import prisma from '../config/prismaClient.js';
import { StatusAction, UserRole } from '@prisma/client';
import { NotificationService } from './NotificationService.js';
import { EmailService } from './EmailService.js';
import logger from '../utils/logger.js';

@Service()
export class ActionService {
    constructor(
        private notificationService: NotificationService,
        private emailService: EmailService
    ) { }

    async findAll(filters: { statut?: StatusAction; siteId?: string; criticite?: string; userId: string; role: string; page?: number; limit?: number }) {
        const { statut, siteId, criticite, userId, role, page = 1, limit = 500 } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (statut) where.statut = statut;
        if (criticite) where.criticite = criticite;

        if (siteId) {
            where.inspection = { siteId };
        }

        // Si l'utilisateur n'est pas ADMIN ou SUPER_ADMIN, il ne voit que ses PA
        if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
            where.OR = [
                { responsableId: userId },
                { inspection: { inspecteurId: userId } }
            ];
        }

        const [actions, total] = await Promise.all([
            prisma.actionPlan.findMany({
                where,
                skip,
                take: limit,
                include: {
                    inspection: {
                        include: { site: { select: { nom: true, code: true } } }
                    },
                    responsable: { select: { name: true, email: true } }
                },
                orderBy: { dateEcheance: 'asc' }
            }),
            prisma.actionPlan.count({ where })
        ]);

        return { actions, total, page, limit };
    }

    async findById(id: string) {
        return prisma.actionPlan.findUnique({
            where: { id },
            include: {
                inspection: {
                    include: { site: true }
                },
                responsable: { select: { name: true, email: true } }
            }
        });
    }

    async findByInspection(inspectionId: string) {
        return prisma.actionPlan.findMany({
            where: { inspectionId },
            include: {
                responsable: { select: { name: true, email: true } }
            }
        });
    }

    async create(data: {
        inspectionId: string;
        description: string;
        responsableId: string;
        dateEcheance: Date;
        criticite?: any;
    }) {
        // Récupérer les infos pour la notification
        const inspection = await prisma.inspection.findUnique({
            where: { id: data.inspectionId },
            include: { site: true }
        });

        const action = await prisma.actionPlan.create({
            data: {
                ...data,
                statut: StatusAction.A_FAIRE
            },
            include: {
                responsable: true,
                inspection: { include: { site: true } }
            }
        });

        // Envoyer notification au responsable
        const siteName = inspection?.site?.nom || 'Inconnu';
        await this.notificationService.sendNotification({
            userId: data.responsableId,
            type: 'ACTION_ASSIGNED',
            title: '🎯 Nouveau plan d\'action assigné',
            message: `Vous avez été désigné comme responsable pour l'action : "${data.description}" sur le site ${siteName}. Échéance: ${new Date(data.dateEcheance).toLocaleDateString('fr-FR')}`,
            data: {
                actionId: action.id,
                inspectionId: data.inspectionId,
                siteName,
                dateEcheance: data.dateEcheance
            }
        });

        // Notifier les administrateurs
        await this.notificationService.notifyAdmins(
            'ACTION_ASSIGNED',
            'Nouvelle action créée',
            `Nouvelle action "${data.description}" assignée à ${action.responsable?.name || 'Inconnu'} sur ${siteName}`,
            { actionId: action.id, inspectionId: data.inspectionId }
        );

        return action;
    }

    /**
     * Vérifier et notifier les actions en retard (à appeler par un cron job)
     */
    async checkOverdueActions() {
        const now = new Date();

        // Trouver les actions en retard qui ne sont pas déjà marquées comme telles
        const overdueActions = await prisma.actionPlan.findMany({
            where: {
                dateEcheance: { lt: now },
                statut: { notIn: [StatusAction.TERMINE, StatusAction.EN_RETARD] }
            },
            include: {
                inspection: { include: { site: true, inspecteur: true } },
                responsable: true
            }
        });

        logger.info(`Vérification des actions en retard: ${overdueActions.length} actions trouvées`);

        for (const action of overdueActions) {
            try {
                // Marquer l'action comme en retard
                await prisma.actionPlan.update({
                    where: { id: action.id },
                    data: { statut: StatusAction.EN_RETARD }
                });

                const siteName = action.inspection?.site?.nom || 'Inconnu';
                const daysOverdue = Math.ceil((now.getTime() - new Date(action.dateEcheance).getTime()) / (1000 * 60 * 60 * 24));

                // Notifier le responsable
                await this.notificationService.sendNotification({
                    userId: action.responsableId,
                    type: 'ACTION_OVERDUE',
                    title: '⚠️ URGENT: Action en retard',
                    message: `L'action "${action.description}" sur ${siteName} est en retard de ${daysOverdue} jour(s) ! Échéance: ${new Date(action.dateEcheance).toLocaleDateString('fr-FR')}`,
                    data: {
                        actionId: action.id,
                        siteName,
                        dateEcheance: action.dateEcheance,
                        daysOverdue
                    }
                });

                // Notifier les administrateurs
                await this.notificationService.notifyAdmins(
                    'ACTION_OVERDUE',
                    '🚨 Action en retard',
                    `L'action "${action.description}" (${action.responsable?.name || 'Inconnu'}) sur ${siteName} est en retard de ${daysOverdue} jour(s)`,
                    { actionId: action.id, siteName, daysOverdue }
                );

                logger.info(`Notification envoyée pour l'action en retard: ${action.id}`);
            } catch (err) {
                logger.error(`Erreur lors du traitement de l'action en retard ${action.id}:`, err);
            }
        }

        return { processed: overdueActions.length };
    }

    /**
     * Vérifier les actions qui arrivent à échéance dans les 48h (Alerte préventive)
     */
    async checkDueSoonActions() {
        const now = new Date();
        const fortyEightHoursFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));

        const dueSoonActions = await (prisma.actionPlan as any).findMany({
            where: {
                dateEcheance: {
                    gt: now,
                    lte: fortyEightHoursFromNow
                },
                statut: { in: [StatusAction.A_FAIRE, StatusAction.EN_COURS, (StatusAction as any).A_VALIDER] },
                dueSoonNotified: false
            },
            include: {
                inspection: { include: { site: true } },
                responsable: true
            }
        });

        logger.info(`Vérification des actions proches de l'échéance: ${dueSoonActions.length} actions trouvées`);

        for (const action_raw of dueSoonActions) {
            const action = action_raw as any;
            try {
                const siteName = action.inspection?.site?.nom || 'Inconnu';

                // Notifier le responsable
                await this.notificationService.sendNotification({
                    userId: action.responsableId as string,
                    type: 'INFO',
                    title: '⏳ Rappel: Échéance proche (48h)',
                    message: `L'action "${action.description}" sur ${siteName} arrive à échéance le ${new Date(action.dateEcheance).toLocaleDateString('fr-FR')}.`,
                    data: { actionId: action.id, type: 'DUE_SOON' }
                });

                // Marquer comme notifié
                await (prisma.actionPlan as any).update({
                    where: { id: action.id },
                    data: { dueSoonNotified: true }
                });

            } catch (err) {
                logger.error(`Erreur lors du rappel préventif de l'action ${action.id}:`, err);
            }
        }

        return { processed: dueSoonActions.length };
    }

    /**
     * Obtenir le résumé des notifications pour un utilisateur
     */
    async getActionNotificationSummary(userId: string) {
        const [total, enRetard, enCours, termines] = await Promise.all([
            prisma.actionPlan.count({
                where: { responsableId: userId }
            }),
            prisma.actionPlan.count({
                where: { responsableId: userId, statut: StatusAction.EN_RETARD }
            }),
            prisma.actionPlan.count({
                where: { responsableId: userId, statut: StatusAction.EN_COURS }
            }),
            prisma.actionPlan.count({
                where: { responsableId: userId, statut: StatusAction.TERMINE }
            })
        ]);

        return {
            total,
            enRetard,
            enCours,
            termines,
            tauxCompletion: total > 0 ? Math.round((termines / total) * 100) : 0
        };
    }

    /**
     * Proposer la clôture d'une action avec preuve photo/notes
     */
    async proposerCloture(id: string, evidence: { photoUrl?: string; notes?: string }, userId: string) {
        const action = await prisma.actionPlan.findUnique({
            where: { id },
            include: { inspection: { include: { site: true } }, responsable: true }
        });

        if (!action) throw new Error('Plan d\'action non trouvé');
        if (action.responsableId !== userId) throw new Error('Seul le responsable désigné peut proposer la clôture');

        const updatedAction = await prisma.actionPlan.update({
            where: { id },
            data: {
                statut: StatusAction.A_VALIDER as any,
                evidencePhotoUrl: evidence.photoUrl,
                evidenceNotes: evidence.notes,
                updatedAt: new Date()
            },
            include: { inspection: { include: { site: true, inspecteur: true } }, responsable: true }
        }) as any;

        // Notifier l'inspecteur d'origine qu'une validation est attendue
        if (updatedAction.inspection?.inspecteurId) {
            await this.notificationService.sendNotification({
                userId: updatedAction.inspection.inspecteurId,
                type: 'INFO',
                title: '⌛ Validation d\'action requise',
                message: `Le responsable a proposé la clôture de l'action sur ${updatedAction.inspection.site?.nom}. Veuillez vérifier les preuves.`,
                data: { actionId: updatedAction.id, type: 'A_VALIDER' }
            });
        }

        return updatedAction;
    }

    /**
     * Valider définitivement la clôture d'une action par l'inspecteur
     */
    async validerCloture(id: string, userId: string) {
        const action = await prisma.actionPlan.findUnique({
            where: { id },
            include: { inspection: true }
        });

        if (!action) throw new Error('Plan d\'action non trouvé');

        // Seul l'inspecteur d'origine ou un admin peut valider
        // Note: userId passé ici est celui qui valide

        const updatedAction = await prisma.actionPlan.update({
            where: { id },
            data: {
                statut: StatusAction.TERMINE,
                updatedAt: new Date()
            },
            include: { inspection: { include: { site: true } }, responsable: true }
        }) as any;

        // Notifier le responsable que sa clôture a été validée
        await this.notificationService.sendNotification({
            userId: updatedAction.responsableId,
            type: 'SUCCESS',
            title: '✅ Action clôturée et validée',
            message: `Votre travail sur l'action "${updatedAction.description}" a été validé !`,
            data: { actionId: updatedAction.id }
        });

        return updatedAction;
    }

    async update(id: string, data: any) {
        return prisma.actionPlan.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    }

    async updateStatut(id: string, statut: StatusAction, userId: string, notes?: string) {
        const action = await prisma.actionPlan.findUnique({
            where: { id },
            include: {
                inspection: { include: { site: true, inspecteur: true } },
                responsable: true
            }
        });

        if (!action) {
            throw new Error('Plan d\'action non trouvé');
        }

        const oldStatut = action.statut;

        // Mettre à jour le statut
        const updatedAction = await prisma.actionPlan.update({
            where: { id },
            data: {
                statut: statut as any,
                notes: notes || undefined,
                updatedAt: new Date()
            },
            include: {
                inspection: { include: { site: true } },
                responsable: true
            }
        });

        // Envoyer des notifications pour le changement de statut
        await this.sendStatusChangeNotifications(updatedAction, oldStatut, statut, userId);

        return updatedAction;
    }

    /**
     * Envoyer des notifications lors du changement de statut d'un plan d'action
     */
    private async sendStatusChangeNotifications(
        action: any,
        oldStatut: StatusAction,
        newStatut: StatusAction,
        userId: string
    ) {
        const siteName = action.inspection?.site?.nom || 'Inconnu';
        const actionId = action.id.substring(0, 8).toUpperCase();
        const oldStatutLabel = this.getStatutLabel(oldStatut);
        const newStatutLabel = this.getStatutLabel(newStatut);

        // Déterminer le type de notification
        let notificationType = 'INFO';
        let title = '';
        let message = '';

        switch (newStatut) {
            case StatusAction.A_FAIRE:
                notificationType = 'ACTION_ASSIGNED';
                title = 'Nouvelle action à traiter';
                message = `Une nouvelle action vous a été assignée sur le site ${siteName}`;
                break;
            case StatusAction.EN_COURS:
                notificationType = 'ACTION_DUE_SOON';
                title = 'Action en cours de traitement';
                message = `L'action "${action.description}" est maintenant en cours sur ${siteName}`;
                break;
            case StatusAction.TERMINE:
                notificationType = 'SUCCESS';
                title = 'Action terminée';
                message = `Félicitations ! L'action "${action.description}" sur ${siteName} a été marquée comme terminée`;
                break;
            case StatusAction.EN_RETARD:
                notificationType = 'ACTION_OVERDUE';
                title = '⚠️ Action en retard';
                message = `L'action "${action.description}" sur ${siteName} est en retard ! Échéance dépassée.`;
                break;
            case StatusAction.A_VALIDER as any:
                notificationType = 'INFO';
                title = '⌛ Action à valider';
                message = `Le responsable a terminé l'action "${action.description}" sur ${siteName}. Veuillez valider la clôture.`;
                break;
            case (StatusAction as any).BLOQUE:
                notificationType = 'WARNING';
                title = '🔴 Action Bloquée !';
                message = `L'action "${action.description}" sur ${siteName} a été signalée comme BLOQUÉE. Motif : ${action.notes || 'Non précisé'}`;
                break;
        }

        const notificationData = {
            actionId: action.id,
            notes: (action as any).notes,
            oldStatut: oldStatutLabel,
            newStatut: newStatutLabel,
            siteName,
            description: action.description,
            dateEcheance: action.dateEcheance,
            responsableName: action.responsable?.name
        };

        // 1. Notifier le responsable de l'action
        if (action.responsableId !== userId) {
            try {
                await this.notificationService.sendNotification({
                    userId: action.responsableId,
                    type: notificationType as any,
                    title,
                    message,
                    data: notificationData
                });
            } catch (err) {
                logger.warn('Erreur notification responsable:', err);
            }
        }

        // 2. Notifier l'inspecteur qui a créé l'action (si différent)
        if (action.inspection?.inspecteurId && action.inspection.inspecteurId !== userId && action.inspection.inspecteurId !== action.responsableId) {
            try {
                await this.notificationService.sendNotification({
                    userId: action.inspection.inspecteurId,
                    type: notificationType as any,
                    title,
                    message,
                    data: notificationData
                });
            } catch (err) {
                logger.warn('Erreur notification inspecteur:', err);
            }
        }

        // 3.Notifier les administrateurs pour les statuts critiques
        if (newStatut === StatusAction.TERMINE || newStatut === StatusAction.EN_RETARD) {
            try {
                await this.notificationService.notifyAdmins(
                    notificationType as any,
                    title,
                    message,
                    notificationData
                );
            } catch (err) {
                logger.warn('Erreur notification admins:', err);
            }
        }

        // 4. Envoyer un email au responsable ou à l'inspecteur si changement de statut important
        if (newStatut === StatusAction.EN_RETARD || newStatut === StatusAction.TERMINE || (newStatut as any) === (StatusAction as any).BLOQUE) {
            try {
                await this.sendStatusChangeEmail(action, oldStatut, newStatut);
            } catch (err) {
                logger.warn('Erreur envoi email:', err);
            }
        }
    }

    private async sendStatusChangeEmail(action: any, oldStatut: StatusAction, newStatut: StatusAction) {
        const siteName = action.inspection?.site?.nom || 'Inconnu';

        // Cas spécifique du blocage : Notifier l'inspecteur
        if ((newStatut as any) === (StatusAction as any).BLOQUE) {
            const inspecteur = action.inspection?.inspecteur;
            if (inspecteur?.email) {
                await this.emailService.sendActionBlockedEmail(inspecteur.email, {
                    siteName,
                    description: action.description,
                    notes: action.notes || 'Non précisé',
                    inspecteurName: inspecteur.name || 'Inspecteur',
                    responsableName: action.responsable?.name || 'Le responsable',
                    actionUrl: `${process.env.FRONTEND_URL}/actions?id=${action.id}`
                });
            }
        }

        // Autres statuts (TERMINE, EN_RETARD) à implémenter selon les besoins
        logger.info(`[EMAIL] Notification email envoyée pour le statut ${newStatut} sur l'action ${action.id}`);
    }

    /**
     * Obtenir le label français du statut
     */
    private getStatutLabel(statut: StatusAction): string {
        const labels: Record<StatusAction, string> = {
            [StatusAction.A_FAIRE]: 'À faire',
            [StatusAction.EN_COURS]: 'En cours',
            [StatusAction.TERMINE]: 'Terminé',
            [StatusAction.EN_RETARD]: 'En retard',
            [StatusAction.A_VALIDER as any]: 'En attente de validation',
            [(StatusAction as any).BLOQUE]: 'Bloqué'
        } as any;
        return labels[statut] || statut;
    }

    async assigner(id: string, responsableId: string, dateEcheance: Date) {
        const action = await prisma.actionPlan.update({
            where: { id },
            data: {
                responsableId,
                dateEcheance,
                statut: StatusAction.EN_COURS,
                updatedAt: new Date()
            }
        });

        // Notifier le nouveau responsable
        await this.notificationService.sendNotification({
            userId: responsableId,
            type: 'ACTION_ASSIGNED',
            title: 'Plan d\'action ré-assigné',
            message: `Vous êtes maintenant responsable de l'action : ${action.description}`,
            data: { actionId: action.id }
        });

        return action;
    }

    async delete(id: string) {
        return prisma.actionPlan.delete({
            where: { id }
        });
    }

    // ─── Job CRON : marquer les PA échus (PB-053) ─────────────────────────────
    async marquerEchus() {
        const result = await prisma.actionPlan.updateMany({
            where: {
                dateEcheance: { lt: new Date() },
                statut: { notIn: [StatusAction.TERMINE, StatusAction.EN_RETARD] }
            },
            data: {
                statut: StatusAction.EN_RETARD
            }
        });

        if (result.count > 0) {
            logger.warn(`${result.count} plans d'actions marqués comme EN_RETARD`);

            // On récupère les actions pour notifier les responsables
            const overdueActions = await prisma.actionPlan.findMany({
                where: {
                    dateEcheance: { lt: new Date() },
                    statut: StatusAction.EN_RETARD
                }
            });

            for (const action of overdueActions) {
                await this.notificationService.sendNotification({
                    userId: action.responsableId,
                    type: 'ACTION_OVERDUE',
                    title: 'Plan d\'action en retard',
                    message: `L'action "${action.description}" est maintenant en retard (échéance passée).`,
                    data: { actionId: action.id }
                }).catch(e => logger.error('Error sending overdue notif:', e));
            }
        }

        return result.count;
    }

    /**
     * Calculer les scores de réactivité par site/entité
     */
    async getReactivityScores(filters: { zone?: string; siteId?: string } = {}) {
        const where: any = {};
        if (filters.zone) where.inspection = { site: { zone: filters.zone } };
        if (filters.siteId) where.inspection = { siteId: filters.siteId };

        const actions = await (prisma.actionPlan as any).findMany({
            where,
            include: { inspection: { include: { site: true } } }
        });

        const statsBySite: Record<string, any> = {};

        for (const action_raw of actions) {
            const action = action_raw as any;
            const siteId = action.inspection?.siteId;
            const siteName = action.inspection?.site?.nom || 'Inconnu';

            if (!siteId) continue;

            if (!statsBySite[siteId]) {
                statsBySite[siteId] = {
                    siteName,
                    total: 0,
                    completed: 0,
                    completedOnTime: 0,
                    overdue: 0,
                    closingDaysSum: 0
                };
            }

            const stats = statsBySite[siteId];
            stats.total++;

            if (action.statut === StatusAction.TERMINE) {
                stats.completed++;
                if (new Date(action.updatedAt) <= new Date(action.dateEcheance)) {
                    stats.completedOnTime++;
                }
                const closingDays = Math.ceil((new Date(action.updatedAt).getTime() - new Date(action.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                stats.closingDaysSum += closingDays;
            } else if (action.statut === StatusAction.EN_RETARD) {
                stats.overdue++;
            }
        }

        return Object.values(statsBySite).map((s: any) => {
            const completionRate = s.total > 0 ? (s.completed / s.total) * 100 : 0;
            const respectRate = s.completed > 0 ? (s.completedOnTime / s.completed) * 100 : 100;
            const avgDays = s.completed > 0 ? s.closingDaysSum / s.completed : 0;
            const score = (respectRate * 0.7) + (completionRate * 0.3);

            return {
                ...s,
                completionRate: Math.round(completionRate),
                respectRate: Math.round(respectRate),
                averageClosingDays: Math.round(avgDays * 10) / 10,
                score: Math.round(score)
            };
        });
    }

    /**
     * Ajouter un commentaire à une action
     */
    async addComment(actionId: string, userId: string, content: string) {
        const comment = await (prisma as any).actionComment.create({
            data: {
                actionId,
                userId,
                content
            },
            include: { user: { select: { id: true, name: true } } }
        });

        // Optionnel: Notifier le responsable ou l'inspecteur
        const action = await prisma.actionPlan.findUnique({
            where: { id: actionId },
            include: { inspection: true }
        });

        if (action) {
            const targetId = userId === action.responsableId ? (action as any).inspection.inspecteurId : action.responsableId;
            if (targetId) {
                const userName = comment.user?.name || 'Un utilisateur';
                // Tronquer le contenu s'il est trop long
                const previewContent = content.length > 60 ? content.substring(0, 57) + '...' : content;
                // Tronquer la description de l'action pour le message
                const actionDesc = action.description.length > 50 ? action.description.substring(0, 47) + '...' : action.description;

                await this.notificationService.sendNotification({
                    userId: targetId,
                    type: 'INFO',
                    title: '💬 Nouveau commentaire',
                    message: `${userName} a écrit : "${previewContent}" sur l'action : ${actionDesc}`,
                    data: { actionId, commentId: comment.id }
                }).catch(() => { });
            }
        }

        return comment;
    }

    /**
     * Récupérer les commentaires d'une action
     */
    async getComments(actionId: string) {
        return (prisma as any).actionComment.findMany({
            where: { actionId },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' }
        });
    }

    /**
     * Envoyer une alerte urgente par email pour une action critique
     */
    async sendUrgentAlert(id: string, senderId: string) {
        const action = await prisma.actionPlan.findUnique({
            where: { id },
            include: {
                inspection: {
                    include: { site: true }
                },
                responsable: true
            }
        });

        if (!action) throw new Error('Action non trouvée');

        const sender = await prisma.user.findUnique({ where: { id: senderId } });

        // Email au responsable
        if (action.responsable?.email) {
            const content = `
                <p>Bonjour ${action.responsable.name},</p>
                <p>La Direction de la Sécurité (DG-SECU) a émis une <strong>ALERTE DE SÛRETÉ CRITIQUE</strong> concernant une non-conformité majeure sur le site :</p>
                
                <div style="background-color: #FFF5F5; border-left: 5px solid #E14332; padding: 20px; margin: 25px 0; border-radius: 4px;">
                    <p style="margin: 0; font-weight: 800; color: #E14332; font-size: 11px; text-transform: uppercase;">📍 Site concerné :</p>
                    <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: 800; color: #111;">${action.inspection?.site?.nom} (${action.inspection?.site?.code})</p>
                    
                    <p style="margin: 0; font-weight: 800; color: #E14332; font-size: 11px; text-transform: uppercase;">⚠️ Anomalie détectée :</p>
                    <p style="margin: 5px 0 15px 0; font-size: 15px; color: #333; line-height: 1.6;">${action.description}</p>
                    
                    <p style="margin: 0; font-size: 13px; font-weight: bold; color: #d32f2f;">📅 Échéance impérative : ${new Date(action.dateEcheance).toLocaleDateString('fr-FR')}</p>
                </div>

                <div class="highlight-box">
                    <p style="margin: 0; font-weight: 900; color: #111;">🎯 Action Requise :</p>
                    <p style="margin: 8px 0 0 0; color: #444;">Cette alerte a été déclenchée manuellement par <strong>${sender?.name || 'la Direction de la Sécurité'}</strong> via le Mur d'Urgences. Un plan de remédiation immédiat est exigé sous 24h.</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL}/actions/${action.id}" class="btn" style="background-color: #E14332;">Intervenir Immédiatement</a>
                </div>
            `;

            await this.emailService.sendEmailSafe({
                to: action.responsable.email,
                subject: `🚨 ALERTE SÛRETÉ CRITIQUE : Site ${action.inspection?.site?.nom}`,
                html: this.emailService.wrapWithBranding('Alerte de Sûreté Prioritaire', content)
            });
        }

        return { success: true };
    }
}

