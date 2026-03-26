import { Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService.js';

import { Container } from 'typedi';
import { RapportService } from '../services/RapportService.js';
// On n'instancie plus à l'extérieur pour éviter les problèmes d'ordre d'initialisation du container

export class DashboardController {

    private get service(): DashboardService {
        return Container.get(DashboardService);
    }

    private get rapportService(): RapportService {
        return Container.get(RapportService);
    }

    // GET /api/dashboard/kpis
    getKpis = async (req: Request, res: Response): Promise<void> => {
        try {
            const { periode, region, site, prestataire, typeSite, startDate, endDate } = req.query;
            const user = (req as any).user;
            const inspecteurId = user.role === 'INSPECTEUR' ? user.id : undefined;

            const data = await this.service.getEnhancedKpis({
                periode: periode as string,
                region: region as string,
                site: site as string,
                inspecteurId,
                prestataire: prestataire as string,
                typeSite: typeSite as string,
                startDate: startDate as string,
                endDate: endDate as string
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/conformite-par-site
    getConformiteParSite = async (req: Request, res: Response): Promise<void> => {
        try {
            const { region, prestataire, typeSite, periode, tri, startDate, endDate } = req.query;
            const data = await this.service.getConformiteParSite({
                region: region as string,
                prestataire: prestataire as string,
                typeSite: typeSite as string,
                periode: periode as string,
                tri: tri as string,
                startDate: startDate as string,
                endDate: endDate as string
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/conformite-par-region
    getConformiteParRegion = async (req: Request, res: Response): Promise<void> => {
        try {
            const { periode, prestataire, typeSite, startDate, endDate } = req.query;
            const data = await this.service.getConformiteParRegion({
                periode: periode as string,
                prestataire: prestataire as string,
                typeSite: typeSite as string,
                startDate: startDate as string,
                endDate: endDate as string
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/conformite-par-prestataire
    getConformiteParPrestataire = async (req: Request, res: Response): Promise<void> => {
        try {
            const { region, typeSite, periode, startDate, endDate } = req.query;
            const data = await this.service.getConformiteParPrestataire({
                region: region as string,
                typeSite: typeSite as string,
                periode: periode as string,
                startDate: startDate as string,
                endDate: endDate as string
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/non-conformites-critiques
    getNonConformitesCritiques = async (req: Request, res: Response): Promise<void> => {
        try {
            const { region, prestataire, typeSite, criticite, statut, startDate, endDate, periode } = req.query;
            const data = await this.service.getNonConformitesCritiques({
                region: region as string,
                prestataire: prestataire as string,
                typeSite: typeSite as string,
                criticite: criticite as string,
                statut: statut as string,
                startDate: startDate as string,
                endDate: endDate as string,
                periode: periode as string
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/plans-actions
    getPlansActions = async (req: Request, res: Response): Promise<void> => {
        try {
            const { region, prestataire, typeSite, statut, criticite, startDate, endDate, periode } = req.query;
            const data = await this.service.getPlansActions({
                region: region as string,
                prestataire: prestataire as string,
                typeSite: typeSite as string,
                statut: statut as string,
                criticite: criticite as string,
                startDate: startDate as string,
                endDate: endDate as string,
                periode: periode as string
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/actions-stats
    getActionsStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const { startDate, endDate, periode } = req.query;
            const user = (req as any).user;
            const inspecteurId = user.role === 'INSPECTEUR' ? user.id : undefined;
            const data = await this.service.getActionsStats(
                inspecteurId,
                periode as string,
                startDate as string,
                endDate as string
            );
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/tableau-sites
    getTableauSites = async (req: Request, res: Response): Promise<void> => {
        try {
            const { region, prestataire, typeSite, periode, tri, startDate, endDate } = req.query;
            const data = await this.service.getTableauSites({
                region: region as string,
                prestataire: prestataire as string,
                typeSite: typeSite as string,
                periode: periode as string,
                tri: tri as string,
                startDate: startDate as string,
                endDate: endDate as string
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/filters
    getAvailableFilters = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.service.getAvailableFilters();
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/evolution
    getEvolution = async (req: Request, res: Response): Promise<void> => {
        try {
            const { siteId, periode, region, prestataire, typeSite } = req.query;
            const user = (req as any).user;
            const inspecteurId = user.role === 'INSPECTEUR' ? user.id : undefined;
            const data = await this.service.getEvolution({
                siteId: siteId as string,
                inspecteurId,
                periode: periode as string,
                region: region as string,
                prestataire: prestataire as string,
                typeSite: typeSite as string
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // Legacy endpoints for backward compatibility
    getConformite = async (req: Request, res: Response): Promise<void> => {
        try {
            const { siteId, rubrike, periode } = req.query;
            const user = (req as any).user;
            const inspecteurId = user.role === 'INSPECTEUR' ? user.id : undefined;

            const data = await this.service.getConformite({
                siteId: siteId as string,
                rubrike: rubrike as string,
                periode: periode as string,
                inspecteurId
            });
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/site-rubriques/:siteId - Get rubric stats for a specific site
    getSiteRubriqueStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const { siteId } = req.params;
            const { periode, startDate, endDate, inspectionId } = req.query;

            if (!siteId || Array.isArray(siteId)) {
                res.status(400).json({ success: false, message: 'siteId is required' });
                return;
            }

            const data = await this.service.getSiteRubriqueStats(
                siteId,
                (periode as string) || '6months',
                startDate as string,
                endDate as string,
                inspectionId as string
            );
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };


    getClassementInspecteurs = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await this.service.getClassementInspecteurs();
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/dashboard/export
    exportDashboard = async (req: Request, res: Response): Promise<void> => {
        try {
            const filters = req.query;
            const user = (req as any).user;
            const inspecteurId = user.role === 'INSPECTEUR' ? user.id : undefined;

            // Gather all data for the report
            const [kpis, evolution, sites] = await Promise.all([
                this.service.getEnhancedKpis({
                    periode: filters.periode as string,
                    region: filters.region as string,
                    site: filters.site as string,
                    prestataire: filters.prestataire as string,
                    typeSite: filters.typeSite as string,
                    inspecteurId
                }),
                this.service.getEvolution({
                    periode: filters.periode as string,
                    region: filters.region as string,
                    siteId: filters.site as string,
                    prestataire: filters.prestataire as string,
                    typeSite: filters.typeSite as string,
                    inspecteurId
                }),
                this.service.getTableauSites({
                    periode: filters.periode as string,
                    region: filters.region as string,
                    prestataire: filters.prestataire as string,
                    typeSite: filters.typeSite as string
                })
            ]);

            const report = await this.rapportService.generateDashboardReport(
                filters,
                { kpis: (kpis as any).data || kpis, evolution, sites: (sites as any).data || sites },
                user.id
            );

            res.json({ success: true, data: report });
        } catch (err: any) {
            console.error('Export Error:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    };
}
