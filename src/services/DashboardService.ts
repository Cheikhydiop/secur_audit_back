import { Service, Inject } from 'typedi';
import { RedisService } from './RedisService.js';

import prisma from '../config/prismaClient.js';
import { StatusInspection, StatusAction, UserRole, CriticiteQuestion, Criticite } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, format, subDays } from 'date-fns';

export interface SiteCompliance {
    siteId: string;
    siteNom: string;
    zone: string;
    type: string;
    prestataire: string;
    score: number;
    nbNonConformites: number;
    nbActions: number;
    statut: string;
}

export interface RegionCompliance {
    zone: string;
    nbSites: number;
    scoreMoyen: number;
    sitesConformes: number;
    sitesARisque: number;
}

export interface PrestataireStats {
    prestataire: string;
    nbSites: number;
    scoreMoyen: number;
    nbNonConformitesCritiques: number;
}

export interface CriticalNonConformite {
    id: string;
    siteNom: string;
    siteId: string;
    questionTexte: string;
    categorie: string;
    criticite: string;
    dateDetection: Date;
    statutAction: string;
    inspectionId: string;
}

export interface ActionPlanSummary {
    id: string;
    siteNom: string;
    description: string;
    responsableNom: string;
    dateEcheance: Date;
    criticite: string;
    statut: string;
    progression: number;
}

export interface DetailedSiteData {
    siteId: string;
    siteNom: string;
    region: string;
    type: string;
    prestataire: string;
    tauxConformite: number;
    nbNonConformites: number;
    nbPlanActions: number;
    statutGlobal: string;
    dernierAudit: Date | null;
}

@Service()
export class DashboardService {
    @Inject(() => RedisService)
    private redisService!: RedisService;

    private readonly CACHE_TTL = 300; // 5 minutes (en secondes)


    /**
     * Enhanced KPIs for security audit dashboard
     */
    async getEnhancedKpis(filters: { periode?: string; region?: string; inspecteurId?: string; site?: string; prestataire?: string; typeSite?: string; startDate?: string; endDate?: string }) {
        const cacheKey = `dashboard:kpis:${JSON.stringify(filters)}`;
        try {
            const cached = await this.redisService.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (err) {
            // Ignorer l'erreur cache
        }

        const { startDate, endDate } = this.calculateDateRange(filters.periode, filters.startDate, filters.endDate);


        // Build site filters
        const siteWhere: any = {};
        if (filters.region) siteWhere.zone = filters.region;
        if (filters.prestataire) siteWhere.prestataire = filters.prestataire;
        if (filters.typeSite) siteWhere.type = filters.typeSite;

        // Get all sites with their latest inspection scores
        const sitesWithScores = await prisma.site.findMany({
            where: siteWhere,
            include: {
                inspections: {
                    where: {
                        statut: StatusInspection.VALIDEE,
                        date: { gte: startDate, lte: endDate },
                        ...(filters.inspecteurId && { inspecteurId: filters.inspecteurId }),
                        ...(filters.site && { siteId: filters.site })
                    },
                    orderBy: { date: 'desc' },
                    take: 1,
                    include: {
                        actions: true
                    }
                }
            }
        });

        // Calculate KPIs
        let totalSites = sitesWithScores.length;
        let sitesWithAudit = sitesWithScores.filter(s => s.inspections.length > 0);
        let sitesConformes = 0;
        let sitesRisque = 0;
        let totalScore = 0;
        let totalNcCritiques = 0;
        let totalActions = 0;
        let actionsAValider = 0;
        let actionsEnRetard = 0;
        let actionsTerminees = 0;

        sitesWithScores.forEach(site => {
            const latestInsp = site.inspections[0];
            const score = latestInsp?.score || 0;
            totalScore += score;

            if (score >= 90) sitesConformes++;
            if (score < 70) sitesRisque++;

            // Count actions from the inspection
            const actions = latestInsp?.actions || [];
            totalActions += actions.length;

            actions.forEach((action: any) => {
                if (action.statut === StatusAction.EN_RETARD) actionsEnRetard++;
                if (action.statut === StatusAction.TERMINE) actionsTerminees++;
                if (action.statut === StatusAction.A_VALIDER) actionsAValider++;
                if (action.criticite === CriticiteQuestion.CRITIQUE) totalNcCritiques++;
            });
        });

        const tauxConformiteGlobal = totalSites > 0 ? Math.round(totalScore / totalSites) : 0;

        // Use all actions from the database to calculate completion rate, for consistency with the totals displayed
        const allActionsCount = await prisma.actionPlan.count({
            where: filters.inspecteurId ? {
                inspection: { inspecteurId: filters.inspecteurId }
            } : {}
        });
        const tauxCloture = allActionsCount > 0 ? Math.round(((allActionsCount - (totalActions - actionsTerminees)) / allActionsCount) * 100) : 0;

        // --- TREND CALCULATION ---
        const { prevStart, prevEnd } = this.calculatePreviousRange(filters.periode, startDate, endDate);

        // Fetch prev scores
        const prevSitesWithScores = await prisma.site.findMany({
            where: siteWhere,
            include: {
                inspections: {
                    where: {
                        statut: StatusInspection.VALIDEE,
                        date: { gte: prevStart, lte: prevEnd },
                        ...(filters.inspecteurId && { inspecteurId: filters.inspecteurId }),
                        ...(filters.site && { siteId: filters.site })
                    },
                    orderBy: { date: 'desc' },
                    take: 1
                }
            }
        });

        const prevTotalScore = prevSitesWithScores.reduce((acc, s) => acc + (s.inspections[0]?.score || 0), 0);
        const prevTauxConformiteGlobal = prevTotalScore > 0 ? Math.round(prevTotalScore / (prevSitesWithScores.filter(s => s.inspections.length > 0).length || 1)) : 0;
        const prevSitesRisque = prevSitesWithScores.filter(s => s.inspections.length > 0 && (s.inspections[0]?.score || 0) < 70).length;
        // --- END TREND ---

        // Get inspections in selected range
        const inspectionsInRange = await prisma.inspection.count({
            where: {
                date: { gte: startDate, lte: endDate },
                statut: StatusInspection.VALIDEE
            }
        });

        // Get total actions (open + closed)
        // const allActionsCount = await prisma.actionPlan.count({
        //     where: filters.inspecteurId ? {
        //         inspection: { inspecteurId: filters.inspecteurId }
        //     } : {}
        // });

        const result = {
            tauxConformiteGlobal,
            nbInspectionsMois: inspectionsInRange,
            nbTotalSites: totalSites,
            nbSitesAudites: sitesWithAudit.length,
            nbSitesConformes: sitesConformes,
            nbSitesRisque: sitesRisque,
            nbNonConformitesCritiques: totalNcCritiques,
            nbPlanActionsTotal: allActionsCount,
            nbPlanActionsOuverts: totalActions - actionsTerminees,
            nbPlanActionsEnRetard: actionsEnRetard,
            nbPlanActionsAValider: actionsAValider,
            tauxClotureActions: tauxCloture,
            trends: {
                tauxConformiteGlobal: tauxConformiteGlobal - prevTauxConformiteGlobal,
                sitesRisque: sitesRisque - prevSitesRisque
            }
        };

        try {
            await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
        } catch (err) { }

        return result;
    }



    /**
     * Get detailed site comparison data
     */
    async getTableauSites(filters: { region?: string; prestataire?: string; typeSite?: string; tri?: string; periode?: string; startDate?: string; endDate?: string }) {
        const { startDate, endDate } = this.calculateDateRange(filters.periode, filters.startDate, filters.endDate);
        const siteWhere: any = {};
        if (filters.region) siteWhere.zone = filters.region;
        if (filters.prestataire) siteWhere.prestataire = filters.prestataire;
        if (filters.typeSite) siteWhere.type = filters.typeSite;

        const sites = await prisma.site.findMany({
            where: siteWhere,
            include: {
                inspections: {
                    where: {
                        statut: StatusInspection.VALIDEE,
                        date: { gte: startDate, lte: endDate }
                    },
                    orderBy: { date: 'desc' },
                    take: 1,
                    include: {
                        actions: true
                    }
                }
            }
        });

        // Fallback : dernière inspection disponible pour les sites sans inspection dans la période
        const sitesWithoutInspection = sites.filter(s => s.inspections.length === 0);
        const fallbackMap: Record<string, any> = {};

        if (sitesWithoutInspection.length > 0) {
            const fallbacks = await prisma.inspection.findMany({
                where: {
                    siteId: { in: sitesWithoutInspection.map(s => s.id) },
                    statut: StatusInspection.VALIDEE
                },
                orderBy: { date: 'desc' },
                distinct: ['siteId'],
                include: { actions: true }
            });
            fallbacks.forEach(insp => { fallbackMap[insp.siteId] = insp; });
        }

        const sitesData: DetailedSiteData[] = sites.map(site => {
            const latestInsp = site.inspections[0] || fallbackMap[site.id] || null;
            const horsperiode = !site.inspections[0] && !!fallbackMap[site.id];
            const actions = latestInsp?.actions || [];
            const score = latestInsp?.score || 0;
            const openActions = actions.filter((a: any) => a.statut !== StatusAction.TERMINE);
            const ncCount = openActions.length;

            let statutGlobal = 'NON_AUDITE';
            if (score >= 90) statutGlobal = 'CONFORME';
            else if (score >= 70) statutGlobal = 'VIGILANCE';
            else if (score > 0) statutGlobal = 'CRITIQUE';

            return {
                siteId: site.id,
                siteNom: site.nom,
                region: site.zone || 'Non défini',
                type: site.type || 'Technique',
                prestataire: site.prestataire || 'Non défini',
                tauxConformite: score,
                nbNonConformites: ncCount,
                nbPlanActions: openActions.length,
                statutGlobal,
                dernierAudit: latestInsp?.date || null,
                horsperiode
            };
        });

        // Sort based on tri parameter
        let sortedSites = [...sitesData];
        switch (filters.tri) {
            case 'score_asc':
                sortedSites.sort((a, b) => a.tauxConformite - b.tauxConformite);
                break;
            case 'score_desc':
                sortedSites.sort((a, b) => b.tauxConformite - a.tauxConformite);
                break;
            case 'nom':
                sortedSites.sort((a, b) => a.siteNom.localeCompare(b.siteNom));
                break;
            case 'region':
                sortedSites.sort((a, b) => a.region.localeCompare(b.region));
                break;
            default:
                sortedSites.sort((a, b) => a.tauxConformite - b.tauxConformite);
        }

        return sortedSites;
    }

    /**
     * Get compliance data grouped by site
     * Si aucune inspection dans la période, on retourne le dernier score disponible (horsperiode: true)
     */
    async getConformiteParSite(filters: { region?: string; prestataire?: string; typeSite?: string; periode?: string; tri?: string; startDate?: string; endDate?: string }) {
        const cacheKey = `dashboard:conformite-sites:${JSON.stringify(filters)}`;
        try {
            const cached = await this.redisService.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (err) { }

        const { startDate, endDate } = this.calculateDateRange(filters.periode, filters.startDate, filters.endDate);

        const siteWhere: any = {};
        if (filters.region) siteWhere.zone = filters.region;
        if (filters.prestataire) siteWhere.prestataire = filters.prestataire;
        if (filters.typeSite) siteWhere.type = filters.typeSite;

        // Récupérer les sites avec inspections dans la période
        const sites = await prisma.site.findMany({
            where: siteWhere,
            include: {
                inspections: {
                    where: {
                        statut: StatusInspection.VALIDEE,
                        date: { gte: startDate, lte: endDate }
                    },
                    orderBy: { date: 'desc' },
                    take: 1,
                    include: { actions: true }
                }
            }
        });

        // Pour les sites sans inspection dans la période, récupérer la dernière inspection disponible
        const sitesWithoutInspection = sites.filter(s => s.inspections.length === 0);
        const fallbackMap: Record<string, any> = {};

        if (sitesWithoutInspection.length > 0) {
            const fallbacks = await prisma.inspection.findMany({
                where: {
                    siteId: { in: sitesWithoutInspection.map(s => s.id) },
                    statut: StatusInspection.VALIDEE
                },
                orderBy: { date: 'desc' },
                distinct: ['siteId'],
                include: { actions: true }
            });
            fallbacks.forEach(insp => { fallbackMap[insp.siteId] = insp; });
        }

        const sitesData = sites.map(site => {
            const latestInsp = site.inspections[0] || fallbackMap[site.id] || null;
            const horsperiode = !site.inspections[0] && !!fallbackMap[site.id];
            const actions = latestInsp?.actions || [];
            const score = latestInsp?.score || 0;

            let statut = 'NON_AUDITE';
            if (score >= 90) statut = 'CONFORME';
            else if (score >= 70) statut = 'VIGILANCE';
            else if (score > 0) statut = 'CRITIQUE';

            return {
                siteId: site.id,
                siteNom: site.nom,
                zone: site.zone || 'Non défini',
                type: site.type || 'Technique',
                prestataire: site.prestataire || 'Non défini',
                score,
                nbNonConformites: actions.filter((a: any) => a.statut !== StatusAction.TERMINE).length,
                nbActions: actions.length,
                statut,
                dernierAudit: latestInsp?.date || null,
                horsperiode
            };
        });

        // Sort based on tri parameter
        let sortedSites = [...sitesData];
        switch (filters.tri) {
            case 'score_asc':
                sortedSites.sort((a, b) => a.score - b.score);
                break;
            case 'score_desc':
                sortedSites.sort((a, b) => b.score - a.score);
                break;
            case 'nom':
                sortedSites.sort((a, b) => a.siteNom.localeCompare(b.siteNom));
                break;
            default:
                sortedSites.sort((a, b) => a.score - b.score);
        }

        try {
            await this.redisService.set(cacheKey, JSON.stringify(sortedSites), this.CACHE_TTL);
        } catch (err) { }

        return sortedSites;
    }


    /**
     * Get compliance data grouped by region/zone
     */
    async getConformiteParRegion(filters: { periode?: string; prestataire?: string; typeSite?: string; startDate?: string; endDate?: string }) {
        const cacheKey = `dashboard:conformite-region:${JSON.stringify(filters)}`;
        try {
            const cached = await this.redisService.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (err) { }

        const { startDate, endDate } = this.calculateDateRange(filters.periode, filters.startDate, filters.endDate);
        const siteWhere: any = {};
        if (filters.prestataire) siteWhere.prestataire = filters.prestataire;
        if (filters.typeSite) siteWhere.type = filters.typeSite;

        const sites = await prisma.site.findMany({
            where: siteWhere,
            include: {
                inspections: {
                    where: {
                        statut: StatusInspection.VALIDEE,
                        date: { gte: startDate, lte: endDate }
                    },
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: { score: true }
                }
            }
        });

        // Group by zone
        const zonesStats: Record<string, { totalScore: number; count: number; sites: any[] }> = {};

        sites.forEach(site => {
            const zone = site.zone || 'Non défini';
            if (!zonesStats[zone]) {
                zonesStats[zone] = { totalScore: 0, count: 0, sites: [] };
            }

            const score = site.inspections[0]?.score || 0;
            if (site.inspections.length > 0) {
                zonesStats[zone].totalScore += score;
                zonesStats[zone].count += 1;
            }

            zonesStats[zone].sites.push({
                siteId: site.id,
                siteNom: site.nom,
                score
            });
        });

        const result = Object.entries(zonesStats).map(([zone, stats]) => {
            const scoreMoyen = stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0;
            const sitesConformes = stats.sites.filter(s => s.score >= 90).length;
            const sitesRisque = stats.sites.filter(s => s.score < 70).length;

            return {
                zone,
                nbSites: sites.filter(s => (s.zone || 'Non défini') === zone).length,
                nbSitesAudites: stats.count,
                scoreMoyen,
                sitesConformes,
                sitesRisque,
                sites: stats.sites
            };
        }).sort((a, b) => a.scoreMoyen - b.scoreMoyen);

        try {
            await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
        } catch (err) { }

        return result;
    }



    /**
     * Get compliance data grouped by security company (prestataire)
     */
    async getConformiteParPrestataire(filters: { region?: string; typeSite?: string; periode?: string; startDate?: string; endDate?: string }) {
        const cacheKey = `dashboard:conformite-presta:${JSON.stringify(filters)}`;
        try {
            const cached = await this.redisService.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (err) { }

        const { startDate, endDate } = this.calculateDateRange(filters.periode, filters.startDate, filters.endDate);

        const siteWhere: any = {};
        if (filters.region) siteWhere.zone = filters.region;
        if (filters.typeSite) siteWhere.type = filters.typeSite;

        const sites = await prisma.site.findMany({
            where: siteWhere,
            include: {
                inspections: {
                    where: {
                        statut: StatusInspection.VALIDEE,
                        date: { gte: startDate, lte: endDate }
                    },
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: { id: true, score: true }
                }
            }
        });

        // Group by prestataire
        const prestaStats: Record<string, { totalScore: number; count: number; sites: string[]; ncCritiques: number }> = {};

        // To count NC Critiques, we need to know which inspections were the latest for these sites
        const latestInspectionIds = sites.map(s => s.inspections[0]?.id).filter(Boolean);

        // Fetch NC critiques for these latest inspections
        const ncCritiquesCount = await prisma.actionPlan.groupBy({
            where: {
                inspectionId: { in: latestInspectionIds as string[] },
                criticite: 'ELEVEE',
                statut: { not: StatusAction.TERMINE }
            },
            by: ['inspectionId'],
            _count: { _all: true }
        });

        // Map inspectionId to NC count
        const ncMap: Record<string, number> = {};
        ncCritiquesCount.forEach((item: any) => {
            ncMap[item.inspectionId] = item._count._all;
        });

        sites.forEach(site => {
            const presta = site.prestataire || 'Non défini';
            if (!prestaStats[presta]) {
                prestaStats[presta] = { totalScore: 0, count: 0, sites: [], ncCritiques: 0 };
            }

            const latestInsp = site.inspections[0];
            const score = latestInsp?.score || 0;
            if (site.inspections.length > 0) {
                prestaStats[presta].totalScore += score;
                prestaStats[presta].count += 1;
                prestaStats[presta].ncCritiques += ncMap[latestInsp.id] || 0;
            }

            prestaStats[presta].sites.push(site.nom);
        });

        const result = Object.entries(prestaStats).map(([prestataire, stats]) => ({
            prestataire,
            nbSites: sites.filter(s => (s.prestataire || 'Non défini') === prestataire).length,
            nbSitesAudites: stats.count,
            scoreMoyen: stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0,
            nbNonConformitesCritiques: stats.ncCritiques
        })).sort((a, b) => a.scoreMoyen - b.scoreMoyen);

        try {
            await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
        } catch (err) { }

        return result;
    }



    /**
     * Get critical non-conformities list
     */
    async getNonConformitesCritiques(filters: { region?: string; prestataire?: string; typeSite?: string; criticite?: string; statut?: string; periode?: string; startDate?: string; endDate?: string }) {
        const { startDate, endDate } = this.calculateDateRange(filters.periode, filters.startDate, filters.endDate);
        const actionWhere: any = {
            criticite: { in: [Criticite.ELEVEE, Criticite.MOYENNE] },
            inspection: {
                date: { gte: startDate, lte: endDate }
            }
        };

        if (filters.criticite) {
            actionWhere.criticite = filters.criticite as any;
        }

        if (filters.statut) {
            actionWhere.statut = filters.statut as any;
        }

        const actions = await prisma.actionPlan.findMany({
            where: actionWhere,
            include: {
                inspection: {
                    include: {
                        site: true
                    }
                },
                responsable: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return actions.map(action => ({
            id: action.id,
            siteId: action.inspection.site.id,
            siteNom: action.inspection.site.nom,
            zone: action.inspection.site.zone,
            description: action.description,
            criticite: action.criticite,
            dateDetection: action.createdAt,
            dateEcheance: action.dateEcheance,
            statut: action.statut,
            responsable: action.responsable.name,
            inspectionId: action.inspectionId
        }));
    }

    /**
     * Get action plans summary
     */
    async getPlansActions(filters: { region?: string; prestataire?: string; typeSite?: string; statut?: string; criticite?: string; periode?: string; startDate?: string; endDate?: string }) {
        const { startDate, endDate } = this.calculateDateRange(filters.periode, filters.startDate, filters.endDate);
        const actionWhere: any = {
            inspection: {
                date: { gte: startDate, lte: endDate }
            }
        };

        if (filters.statut) {
            actionWhere.statut = filters.statut as any;
        }
        if (filters.criticite) {
            actionWhere.criticite = filters.criticite as any;
        }

        const actions = await prisma.actionPlan.findMany({
            where: actionWhere,
            include: {
                inspection: {
                    include: {
                        site: true
                    }
                },
                responsable: {
                    select: { name: true }
                }
            },
            orderBy: [
                { criticite: 'desc' },
                { dateEcheance: 'asc' }
            ]
        });

        return actions.map(action => {
            let progression = 0;
            if (action.statut === StatusAction.TERMINE) progression = 100;
            else if (action.statut === StatusAction.EN_COURS) progression = 50;
            else if (action.statut === StatusAction.A_FAIRE) progression = 0;

            // Check if overdue
            const isOverdue = action.dateEcheance < new Date() && action.statut !== StatusAction.TERMINE;

            return {
                id: action.id,
                siteId: action.inspection.site.id,
                siteNom: action.inspection.site.nom,
                zone: action.inspection.site.zone,
                description: action.description,
                responsableNom: action.responsable.name,
                dateEcheance: action.dateEcheance,
                criticite: action.criticite,
                statut: isOverdue ? 'EN_RETARD' : action.statut,
                progression,
                notes: action.notes
            };
        });
    }

    /**
     * Get action plans statistics (for donut chart)
     */
    async getActionsStats(inspecteurId?: string, periode?: string, startDate?: string, endDate?: string) {
        const cacheKey = `dashboard:actions-stats:${inspecteurId || 'all'}:${periode || 'default'}:${startDate || ''}:${endDate || ''}`;
        try {
            const cached = await this.redisService.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (err) { }

        const { startDate: start, endDate: end } = this.calculateDateRange(periode, startDate, endDate);

        const where: any = {
            inspection: {
                date: { gte: start, lte: end }
            }
        };
        if (inspecteurId) {
            where.inspection = { inspecteurId };
        }

        const now = new Date();

        // Get counts by statut
        const stats = await prisma.actionPlan.groupBy({
            where,
            by: ['statut'],
            _count: true
        });

        const result = {
            aFaire: 0,
            enCours: 0,
            termine: 0,
            enRetard: 0,
            aValider: 0,
            total: 0
        };

        stats.forEach(s => {
            if (s.statut === StatusAction.A_FAIRE) result.aFaire = s._count;
            if (s.statut === StatusAction.EN_COURS) result.enCours = s._count;
            if (s.statut === StatusAction.TERMINE) result.termine = s._count;
            if (s.statut === StatusAction.EN_RETARD) result.enRetard = s._count;
            if (s.statut === StatusAction.A_VALIDER) result.aValider = s._count;
            result.total += s._count;
        });

        // Also count overdue items
        const overdueCount = await prisma.actionPlan.count({
            where: {
                ...where,
                dateEcheance: { lt: now },
                statut: { notIn: [StatusAction.TERMINE] }
            }
        });

        result.enRetard = overdueCount;

        try {
            await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
        } catch (err) { }

        return result;
    }
    /**
     * Get evolution of compliance over time with INTELLIGENT CARRY-FORWARD
     * If a month has no audits, we carry forward the score from the previous month
     * instead of dropping to zero, as it reflects the current state until a new audit is done.
     */
    async getEvolution(filters: { siteId?: string; inspecteurId?: string; periode?: string; region?: string; prestataire?: string; typeSite?: string }) {
        const cacheKey = `dashboard:evolution:v3:${JSON.stringify(filters)}`;
        try {
            const cached = await this.redisService.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (err) { }

        const now = new Date();
        const monthsCount = filters.periode === '365' ? 12 : filters.periode === '90' ? 3 : 6;
        const months = Array.from({ length: monthsCount }).map((_, i) => subMonths(now, monthsCount - 1 - i));

        // Build base site filter
        const siteWhere: any = {};
        if (filters.region && filters.region !== 'all') siteWhere.zone = filters.region;
        if (filters.prestataire && filters.prestataire !== 'all') siteWhere.prestataire = filters.prestataire;
        if (filters.typeSite && filters.typeSite !== 'all') siteWhere.type = filters.typeSite;
        if (filters.siteId && filters.siteId !== 'all') siteWhere.id = filters.siteId;

        let lastGlobalScore = 0;
        const lastRegionScores: Record<string, number> = {};

        // 1. Get GLOBAL evolution with carry-forward
        const evolution = await Promise.all(months.map(async date => {
            const start = startOfMonth(date);
            const end = endOfMonth(date);

            const where: any = {
                statut: StatusInspection.VALIDEE,
                date: { gte: start, lte: end },
                site: Object.keys(siteWhere).length > 0 ? siteWhere : undefined
            };
            if (filters.inspecteurId) where.inspecteurId = filters.inspecteurId;

            const result = await prisma.inspection.aggregate({
                where,
                _avg: { score: true },
                _count: true
            });

            // Carry forward logic
            let score = 0;
            const hasData = result._count > 0;

            if (hasData) {
                score = Math.round(result._avg.score || 0);
                lastGlobalScore = score;
            } else {
                score = lastGlobalScore;
            }

            return {
                mois: format(date, 'MMM yyyy'),
                moisCourt: format(date, 'MMM'),
                score,
                hasData
            };
        }));

        // 2. Get REGION evolution with carry-forward
        const evolutionParRegion = await Promise.all(months.map(async date => {
            const start = startOfMonth(date);
            const end = endOfMonth(date);

            const inspections = await prisma.inspection.findMany({
                where: {
                    statut: StatusInspection.VALIDEE,
                    date: { gte: start, lte: end },
                    site: Object.keys(siteWhere).length > 0 ? siteWhere : undefined
                },
                include: { site: true },
                orderBy: { date: 'desc' },
                distinct: ['siteId']
            });

            const zones: Record<string, { total: number; count: number }> = {};
            inspections.forEach(insp => {
                const zone = insp.site.zone || 'Non défini';
                if (!zones[zone]) zones[zone] = { total: 0, count: 0 };
                zones[zone].total += insp.score || 0;
                zones[zone].count += 1;
            });

            const result: any = { mois: format(date, 'MMM') };

            // Apply carry forward per region
            const allZones = await prisma.site.findMany({ select: { zone: true }, distinct: ['zone'] });
            allZones.forEach(z => {
                const zone = z.zone || 'Non défini';
                if (zones[zone] && zones[zone].count > 0) {
                    const score = Math.round(zones[zone].total / zones[zone].count);
                    result[zone] = score;
                    lastRegionScores[zone] = score;
                } else {
                    result[zone] = lastRegionScores[zone] || 0;
                }
            });

            return result;
        }));

        // 3. GENERATE SMART INSIGHT
        let insight = "Données stables sur la période.";
        if (evolution.length >= 2) {
            const last = evolution[evolution.length - 1];
            const prev = evolution[evolution.length - 2];
            const diff = last.score - prev.score;

            if (diff > 5) insight = `Hausse significative de la conformité (+${diff}%) ce mois-ci. Bravo !`;
            else if (diff < -5) insight = `Baisse de la conformité (${diff}%) détectée. Une attention particulière est requise.`;
            else if (diff > 0) insight = "Tendance positive légère de la conformité globale.";
            else if (diff < 0) insight = "Légère baisse de la conformité. À surveiller.";
        }

        const finalResult = {
            global: evolution,
            parRegion: evolutionParRegion,
            insight
        };

        try {
            await this.redisService.set(cacheKey, JSON.stringify(finalResult), this.CACHE_TTL);
        } catch (err) { }

        return finalResult;
    }



    /**
     * Get available filters (regions, prestataires, types, etc.)
     */
    async getAvailableFilters() {
        const [zones, prestataires, types, inspecteurs, allSites] = await Promise.all([
            prisma.site.findMany({
                select: { zone: true },
                distinct: ['zone'],
                where: { zone: { not: null } }
            }),
            prisma.site.findMany({
                select: { prestataire: true },
                distinct: ['prestataire'],
                where: { prestataire: { not: null } }
            }),
            prisma.site.findMany({
                select: { type: true },
                distinct: ['type'],
                where: { type: { not: null } }
            }),
            prisma.user.findMany({
                select: { id: true, name: true },
                where: { role: UserRole.INSPECTEUR, isActive: true }
            }),
            prisma.site.findMany({
                select: { id: true, nom: true, zone: true, prestataire: true, type: true },
                where: { status: 'actif' }
            })
        ]);

        return {
            regions: zones.map(z => z.zone).filter(Boolean),
            prestataires: prestataires.map(p => p.prestataire).filter(Boolean),
            typesSites: types.map(t => ({ id: t.type, name: t.type })).filter(Boolean),
            inspecteurs: inspecteurs,
            sites: allSites.map(s => ({
                id: s.id,
                nom: s.nom,
                zone: s.zone,
                prestataire: s.prestataire,
                type: s.type
            }))
        };
    }

    // Legacy methods for compatibility
    async getKpis(filters: { periode?: string; region?: string; inspecteurId?: string }) {
        return this.getEnhancedKpis(filters);
    }

    async getConformite(filters: { siteId?: string; rubrike?: string; periode?: string; inspecteurId?: string }) {
        const siteWhere: any = {};
        if (filters.siteId) siteWhere.id = filters.siteId;

        const inspections = await prisma.inspection.findMany({
            where: {
                statut: StatusInspection.VALIDEE,
                ...(filters.siteId && { siteId: filters.siteId }),
                ...(filters.inspecteurId && { inspecteurId: filters.inspecteurId })
            },
            select: { score: true, reponses: true, site: { select: { nom: true, zone: true } } },
            take: 50,
            orderBy: { date: 'desc' }
        });

        const rubriquesStats: Record<string, { total: number; count: number }> = {};
        const sitesStats: Record<string, { total: number; count: number }> = {};

        inspections.forEach(insp => {
            const siteNom = insp.site.nom;
            if (!sitesStats[siteNom]) sitesStats[siteNom] = { total: 0, count: 0 };
            sitesStats[siteNom].total += insp.score || 0;
            sitesStats[siteNom].count += 1;

            const reponses = insp.reponses as any[];
            if (Array.isArray(reponses)) {
                reponses.forEach(rep => {
                    if (rep.valeur === 'NON_APPLICABLE') return;
                    const rub = rep.rubrique || 'Autre';
                    if (!rubriquesStats[rub]) rubriquesStats[rub] = { total: 0, count: 0 };

                    const p = rep.ponderation || 1;
                    rubriquesStats[rub].total += (rep.valeur === 'CONFORME' ? 100 : 0) * p;
                    rubriquesStats[rub].count += p;
                });
            }
        });

        const parRubrique = Object.entries(rubriquesStats).map(([name, stats]) => ({
            name,
            score: Math.round(stats.total / stats.count)
        }));

        const parSite = Object.entries(sitesStats).map(([name, stats]) => ({
            name,
            score: Math.round(stats.total / stats.count)
        }));

        return { parRubrique, parSite };
    }

    async getClassementInspecteurs() {
        const inspections = await prisma.inspection.findMany({
            where: { statut: StatusInspection.VALIDEE },
            select: {
                score: true,
                inspecteur: { select: { name: true } }
            }
        });

        const stats: Record<string, { totalScore: number; count: number }> = {};
        inspections.forEach(insp => {
            const name = insp.inspecteur.name;
            if (!stats[name]) stats[name] = { totalScore: 0, count: 0 };
            stats[name].totalScore += insp.score || 0;
            stats[name].count += 1;
        });

        return Object.entries(stats)
            .map(([name, s]) => ({
                name,
                nbInspections: s.count,
                scoreMoyen: Math.round(s.totalScore / s.count)
            }))
            .sort((a, b) => b.scoreMoyen - a.scoreMoyen)
            .slice(0, 10);
    }

    // Get rubric statistics for a specific site over a period
    async getSiteRubriqueStats(siteId: string, periode: string = '6months', customStartDate?: string, customEndDate?: string, inspectionId?: string) {
        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;
        let visitsStartDate: Date; // For last 3 months visits

        if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
            visitsStartDate = subMonths(endDate, 3);
        } else {
            switch (periode) {
                case '1year':
                    startDate = subMonths(now, 12);
                    visitsStartDate = subMonths(now, 3);
                    break;
                case '6months':
                    startDate = subMonths(now, 6);
                    visitsStartDate = subMonths(now, 3);
                    break;
                case '3months':
                    startDate = subMonths(now, 3);
                    visitsStartDate = subMonths(now, 3);
                    break;
                default:
                    startDate = subMonths(now, 6);
                    visitsStartDate = subMonths(now, 3);
                    break;
            }
        }

        // Get all inspections for this site in the period
        const inspections = await prisma.inspection.findMany({
            where: inspectionId ? {
                id: inspectionId,
                siteId: siteId,
                statut: StatusInspection.VALIDEE
            } : {
                siteId: siteId,
                date: { gte: startDate, lte: endDate },
                statut: StatusInspection.VALIDEE
            },
            select: {
                id: true,
                date: true,
                score: true,
                reponses: true
            },
            orderBy: { date: 'desc' }
        });

        // Get visits in the last 3 months
        const recentVisits = inspections.filter(i => new Date(i.date) >= visitsStartDate);

        // Calculate stats per month for the histogram
        const monthlyStats: Record<string, {
            month: string;
            rubricStats: Record<string, { total: number; count: number; conformes: number; nonConformes: number }>;
            globalScore: number;
            totalQuestions: number;
            totalConformes: number;
            totalNonConformes: number;
        }> = {};

        // Initialize monthly stats
        const monthsToShow = customStartDate && customEndDate
            ? (Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))))
            : (periode === '1year' ? 12 : periode === '3months' ? 3 : 6);

        for (let i = 0; i < monthsToShow; i++) {
            const d = new Date(endDate);
            d.setMonth(d.getMonth() - i);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyStats[monthKey] = {
                month: monthKey,
                rubricStats: {},
                globalScore: 0,
                totalQuestions: 0,
                totalConformes: 0,
                totalNonConformes: 0
            };
        }

        // Process each inspection
        inspections.forEach(insp => {
            const inspDate = new Date(insp.date);
            const monthKey = `${inspDate.getFullYear()}-${String(inspDate.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyStats[monthKey]) return;

            const reponses = insp.reponses as any[];
            if (Array.isArray(reponses)) {
                reponses.forEach(rep => {
                    if (rep.valeur === 'NON_APPLICABLE') return;

                    const rub = rep.rubrique || 'Autre';
                    const p = rep.ponderation || 1;
                    const isConforme = rep.valeur === 'CONFORME';

                    if (!monthlyStats[monthKey].rubricStats[rub]) {
                        monthlyStats[monthKey].rubricStats[rub] = { total: 0, count: 0, conformes: 0, nonConformes: 0 };
                    }

                    monthlyStats[monthKey].rubricStats[rub].total += (isConforme ? 100 : 0) * p;
                    monthlyStats[monthKey].rubricStats[rub].count += p;
                    if (isConforme) {
                        monthlyStats[monthKey].rubricStats[rub].conformes += 1;
                    } else {
                        monthlyStats[monthKey].rubricStats[rub].nonConformes += 1;
                    }

                    monthlyStats[monthKey].totalQuestions += 1;
                    if (isConforme) {
                        monthlyStats[monthKey].totalConformes += 1;
                    } else {
                        monthlyStats[monthKey].totalNonConformes += 1;
                    }
                });

                // Calculate global score for this month
                const monthData = monthlyStats[monthKey];
                let totalWeight = 0;
                let totalScore = 0;
                Object.values(monthData.rubricStats).forEach(rs => {
                    totalScore += rs.total;
                    totalWeight += rs.count;
                });
                monthData.globalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
            }
        });

        // Calculate aggregated stats across all inspections
        const overallRubriqueStats: Record<string, {
            name: string;
            score: number;
            conforme: number;
            nonConforme: number;
            tauxConformite: number;
            tauxNonConformite: number;
            couleur: string;
        }> = {};

        inspections.forEach(insp => {
            const reponses = insp.reponses as any[];
            if (Array.isArray(reponses)) {
                reponses.forEach(rep => {
                    if (rep.valeur === 'NON_APPLICABLE') return;

                    const rub = rep.rubrique || 'Autre';
                    const isConforme = rep.valeur === 'CONFORME';

                    if (!overallRubriqueStats[rub]) {
                        overallRubriqueStats[rub] = {
                            name: rub,
                            score: 0,
                            conforme: 0,
                            nonConforme: 0,
                            tauxConformite: 0,
                            tauxNonConformite: 0,
                            couleur: 'red'
                        };
                    }

                    if (isConforme) {
                        overallRubriqueStats[rub].conforme += 1;
                    } else {
                        overallRubriqueStats[rub].nonConforme += 1;
                    }
                });
            }
        });

        // Calculate percentages and assign colors
        const rubriquesResult = Object.values(overallRubriqueStats).map(rub => {
            const total = rub.conforme + rub.nonConforme;
            rub.tauxConformite = total > 0 ? Math.round((rub.conforme / total) * 100) : 0;
            rub.tauxNonConformite = total > 0 ? Math.round((rub.nonConforme / total) * 100) : 0;
            rub.score = rub.tauxConformite;

            // Assign color based on compliance rate
            if (rub.tauxConformite <= 60) {
                rub.couleur = 'red'; // Non-conformité / commentaire
            } else if (rub.tauxConformite <= 89) {
                rub.couleur = 'orange'; // Risque modéré
            } else {
                rub.couleur = 'green'; // Conforme
            }

            return rub;
        });

        // Calculate global rate
        let totalConforme = 0;
        let totalNonConforme = 0;
        rubriquesResult.forEach(rub => {
            totalConforme += rub.conforme;
            totalNonConforme += rub.nonConforme;
        });
        const totalQuestions = totalConforme + totalNonConforme;
        const globalTauxConformite = totalQuestions > 0 ? Math.round((totalConforme / totalQuestions) * 100) : 0;

        // Determine global color
        let globalCouleur: string;
        if (globalTauxConformite <= 60) {
            globalCouleur = 'red';
        } else if (globalTauxConformite <= 89) {
            globalCouleur = 'orange';
        } else {
            globalCouleur = 'green';
        }

        return {
            rubriques: rubriquesResult,
            global: {
                score: globalTauxConformite,
                conforme: totalConforme,
                nonConforme: totalNonConforme,
                tauxConformite: globalTauxConformite,
                tauxNonConformite: totalQuestions > 0 ? Math.round((totalNonConforme / totalQuestions) * 100) : 0,
                couleur: globalCouleur
            },
            visitsLast3Months: recentVisits.length,
            monthlyStats: Object.values(monthlyStats).reverse(),
            totalInspections: inspections.length,
            lastInspectionDate: inspections.length > 0 ? inspections[0].date : null
        };
    }

    private calculateDateRange(periode?: string, customStart?: string, customEnd?: string) {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        if (customStart && customEnd && periode === 'custom') {
            startDate = new Date(customStart);
            endDate = new Date(customEnd);
        } else {
            switch (periode) {
                case '7':
                    startDate = subDays(now, 7);
                    break;
                case '30':
                    startDate = subDays(now, 30);
                    break;
                case '90':
                    startDate = subMonths(now, 3);
                    break;
                case '365':
                    startDate = subMonths(now, 12);
                    break;
                default:
                    startDate = subMonths(now, 1);
            }
        }
        return { startDate, endDate };
    }

    private calculatePreviousRange(periode?: string, start?: Date, end?: Date) {
        if (!start || !end) return { prevStart: new Date(), prevEnd: new Date() };

        const durationMs = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - durationMs);

        return { prevStart, prevEnd };
    }
}
