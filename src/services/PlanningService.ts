import { Service } from 'typedi';
import prisma from '../config/prismaClient.js';
import { StatusAction } from '@prisma/client';
import { startOfMonth, endOfMonth, isBefore, isAfter, startOfDay } from 'date-fns';
import { NotificationService } from './NotificationService.js';

@Service()
export class PlanningService {
    constructor(
        private notificationService: NotificationService
    ) { }

    /**
     * Démarrer une inspection
     */
    async startInspection(id: string, userId: string, gpsData?: { latitudeStart?: number | null; longitudeStart?: number | null; dateStart?: Date }) {
        const updateData: any = {
            statut: StatusAction.EN_COURS,
            startedById: userId,
        };

        if (gpsData) {
            if (gpsData.latitudeStart !== undefined && gpsData.latitudeStart !== null) updateData.latitudeStart = gpsData.latitudeStart;
            if (gpsData.longitudeStart !== undefined && gpsData.longitudeStart !== null) updateData.longitudeStart = gpsData.longitudeStart;
            if (gpsData.dateStart) updateData.dateStart = gpsData.dateStart;
        }

        const mission = await prisma.mission.update({
            where: { id },
            data: updateData,
            include: { site: true, inspecteur: true }
        });

        if (mission.inspecteurId) {
            try {
                await this.notificationService.sendNotification({
                    userId: mission.inspecteurId,
                    type: 'INFO',
                    title: 'Inspection démarrée',
                    message: `L'inspection "${mission.titre}" sur le site ${mission.site?.nom} est maintenant en cours.`,
                    data: { missionId: mission.id, siteId: mission.siteId, statut: 'EN_COURS' }
                });
            } catch (err) {
                console.error('Erreur notification démarrage:', err);
            }
        }

        return mission;
    }

    /**
     * Terminer une inspection
     */
    async finishInspection(id: string, userId: string, dateRealisation?: Date, gpsData?: { latitudeEnd?: number; longitudeEnd?: number; dateEnd?: Date }) {
        const mission = await prisma.mission.findUnique({
            where: { id },
            include: { site: true, inspecteur: true }
        });

        if (!mission) throw new Error('Mission non trouvée');
        if (mission.startedById && mission.startedById !== userId) {
            throw new Error('Vous ne pouvez terminer que les inspections que vous avez démarrées');
        }

        const now = dateRealisation || new Date();
        const datePrevue = startOfDay(mission.dateDeb);
        const dateReelle = startOfDay(now);

        let nouveauStatut: StatusAction;
        let message = '';

        if (isBefore(dateReelle, datePrevue)) {
            nouveauStatut = StatusAction.ANTICIPE;
            message = `Inspection "${mission.titre}" terminée en avance.`;
        } else if (isAfter(dateReelle, datePrevue)) {
            const joursRetard = Math.ceil((dateReelle.getTime() - datePrevue.getTime()) / (1000 * 60 * 60 * 24));
            nouveauStatut = joursRetard > 7 ? StatusAction.EN_RETARD : StatusAction.TERMINE;
            message = `Inspection "${mission.titre}" terminée avec ${joursRetard} jour(s) de retard.`;
        } else {
            nouveauStatut = StatusAction.TERMINE;
            message = `Inspection "${mission.titre}" terminée à la date prévue.`;
        }

        const updatedMission = await prisma.mission.update({
            where: { id },
            data: {
                statut: nouveauStatut,
                dateRealisation: now,
                dateFin: now,
                latitudeEnd: gpsData?.latitudeEnd,
                longitudeEnd: gpsData?.longitudeEnd,
                dateEnd: gpsData?.dateEnd || now
            },
            include: { site: true, inspecteur: true }
        });

        if (mission.inspecteurId) {
            try {
                await this.notificationService.sendNotification({
                    userId: mission.inspecteurId,
                    type: nouveauStatut === StatusAction.ANTICIPE ? 'SUCCESS' : 'INFO',
                    title: 'Inspection terminée',
                    message,
                    data: { missionId: mission.id, siteId: mission.siteId, statut: nouveauStatut }
                });
            } catch (err) {
                console.error('Erreur notification terminaison:', err);
            }
        }

        return { mission: updatedMission, message };
    }

    /**
     * Mettre à jour automatiquement le statut des missions en retard
     */
    async updateOverdueMissions() {
        const today = startOfDay(new Date());
        const missionsEnRetard = await prisma.mission.findMany({
            where: {
                statut: {
                    notIn: [StatusAction.TERMINE, StatusAction.ANTICIPE, StatusAction.EN_RETARD, 'ANNULE' as any, 'ARCHIVE' as any]
                },
                dateDeb: { lt: today }
            },
            include: { site: true, inspecteur: true }
        });

        for (const mission of missionsEnRetard) {
            await prisma.mission.update({
                where: { id: mission.id },
                data: { statut: StatusAction.EN_RETARD }
            });
        }
        return { total: missionsEnRetard.length };
    }

    /**
     * Obtenir les statistiques des inspections
     */
    async getInspectionStats(inspecteurId?: string) {
        const where: any = inspecteurId ? { inspecteurId } : {};

        const [total, planifies, enCours, termines, anticipes, enRetard, annules, archives] = await Promise.all([
            prisma.mission.count({ where }),
            prisma.mission.count({ where: { ...where, statut: StatusAction.A_FAIRE } }),
            prisma.mission.count({ where: { ...where, statut: StatusAction.EN_COURS } }),
            prisma.mission.count({ where: { ...where, statut: StatusAction.TERMINE } }),
            prisma.mission.count({ where: { ...where, statut: StatusAction.ANTICIPE } }),
            prisma.mission.count({ where: { ...where, statut: StatusAction.EN_RETARD } }),
            prisma.mission.count({ where: { ...where, statut: 'ANNULE' as any } }),
            prisma.mission.count({ where: { ...where, statut: 'ARCHIVE' as any } })
        ]);

        return {
            total,
            planifies,
            enCours,
            termines,
            anticipes,
            enRetard,
            annules,
            archives,
            terminesAVTemps: termines - enRetard,
            realisees: termines + anticipes
        };
    }

    async getPlanningInspecteur(inspecteurId: string, mois?: number, annee?: number) {
        const dateFilter: any = {};
        if (mois !== undefined && annee !== undefined) {
            const date = new Date(annee, mois);
            dateFilter.gte = startOfMonth(date);
            dateFilter.lte = endOfMonth(date);
        }

        return prisma.mission.findMany({
            where: {
                inspecteurId,
                ...(mois !== undefined ? { dateDeb: dateFilter } : {})
            },
            include: { site: true },
            orderBy: { dateDeb: 'asc' }
        });
    }

    async getPlanningGlobal(mois?: number, annee?: number) {
        const dateFilter: any = {};
        if (mois !== undefined && annee !== undefined) {
            const date = new Date(annee, mois);
            dateFilter.gte = startOfMonth(date);
            dateFilter.lte = endOfMonth(date);
        }

        return prisma.mission.findMany({
            where: mois !== undefined ? { dateDeb: dateFilter } : {},
            include: { site: true, inspecteur: true },
            orderBy: { dateDeb: 'asc' }
        });
    }

    async findById(id: string) {
        return prisma.mission.findUnique({
            where: { id },
            include: { site: true, inspecteur: true }
        });
    }

    async getPendingMissionsByEntite(entite: string) {
        const entiteNormalized = entite.toUpperCase().trim();
        return prisma.mission.findMany({
            where: {
                OR: [
                    { inspecteur: { entite: { equals: entiteNormalized as any } } },
                    { entite: { equals: entiteNormalized as any } }
                ] as any,
                statut: { in: [StatusAction.A_FAIRE, StatusAction.EN_RETARD] }
            },
            include: { site: true, inspecteur: true },
            orderBy: { dateDeb: 'asc' }
        });
    }

    async create(data: any) {
        return (prisma.mission.create as any)({
            data: { ...data, statut: StatusAction.A_FAIRE },
            include: { site: true, inspecteur: true }
        });
    }

    async update(id: string, data: any) {
        return prisma.mission.update({
            where: { id },
            data,
            include: { site: true, inspecteur: true }
        });
    }

    async delete(id: string) {
        await prisma.mission.delete({ where: { id } });
        return true;
    }

    async updateStatus(id: string, statut: string) {
        return prisma.mission.update({
            where: { id },
            data: { statut: statut as any },
            include: { site: true, inspecteur: true }
        });
    }

    async getMissionsBySite(siteId: string) {
        return prisma.mission.findMany({
            where: { siteId, statut: { in: [StatusAction.A_FAIRE, StatusAction.EN_RETARD] } },
            include: { inspecteur: true },
            orderBy: { dateDeb: 'asc' }
        });
    }

    async getMissionsBySiteAndEntite(siteId: string, entite: string) {
        return prisma.mission.findMany({
            where: {
                siteId,
                OR: [
                    { inspecteur: { entite: entite as any } },
                    { entite: entite as any }
                ] as any,
                statut: { in: [StatusAction.A_FAIRE, StatusAction.EN_RETARD] }
            },
            include: { inspecteur: true },
            orderBy: { dateDeb: 'asc' }
        });
    }

    async verifyEntiteAccess(missionId: string, userEntite: string, userRole: string): Promise<{ authorized: boolean; message?: string }> {
        if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return { authorized: true };

        const mission = await (prisma.mission.findUnique as any)({
            where: { id: missionId },
            include: { inspecteur: { select: { entite: true } } }
        });

        if (!mission) return { authorized: false, message: 'Mission non trouvée' };

        const missionEntite = (mission.entite || mission.inspecteur?.entite || '').trim().toUpperCase();
        const userEntiteNormalized = (userEntite || '').trim().toUpperCase();

        if (missionEntite !== userEntiteNormalized) {
            return { authorized: false, message: `Accès refusé. Entité cible: ${missionEntite}` };
        }

        return { authorized: true };
    }

    /**
     * Reconduire tout le planning d'une année vers l'année suivante
     */
    async renewYearPlanning(sourceYear: number, targetYear: number) {
        const start = startOfMonth(new Date(sourceYear, 0, 1));
        const end = endOfMonth(new Date(sourceYear, 11, 31));

        const sourceMissions = await prisma.mission.findMany({
            where: { dateDeb: { gte: start, lte: end } }
        });

        if (sourceMissions.length === 0) throw new Error(`Aucun planning en ${sourceYear}`);

        const newMissions = sourceMissions.map(m => {
            const dateDeb = new Date(m.dateDeb);
            dateDeb.setFullYear(targetYear);
            const dateFin = new Date(m.dateFin);
            dateFin.setFullYear(targetYear);

            return {
                titre: m.titre,
                description: m.description,
                type: m.type,
                dateDeb: dateDeb,
                dateFin: dateFin,
                statut: StatusAction.A_FAIRE,
                siteId: m.siteId,
                inspecteurId: null as any,
                entite: (m as any).entite,
            };
        });

        const created = await (prisma.mission.createMany as any)({ data: newMissions });
        return { count: created.count };
    }
}
