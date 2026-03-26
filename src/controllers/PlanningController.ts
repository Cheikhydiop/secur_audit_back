import { Request, Response } from 'express';
import { Container } from 'typedi';
import { PlanningService } from '../services/PlanningService.js';
import { PlanningImportService } from '../services/PlanningImportService.js';

const planningService = Container.get(PlanningService);
const importService = Container.get(PlanningImportService);

export class PlanningController {

    // GET /api/planning → Planning de l'inspecteur connecté
    getMyPlanning = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.id;
            const mois = req.query.mois ? Number(req.query.mois) : undefined;
            const annee = req.query.annee ? Number(req.query.annee) : undefined;
            const data = await planningService.getPlanningInspecteur(userId, mois, annee);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/planning/site/:siteId → Missions disponibles pour un site (filtrées par entité)
    getMissionsBySite = async (req: Request, res: Response): Promise<void> => {
        try {
            const siteId = req.params['siteId'] as string;
            const userEntite = (req as any).user.entite;
            const userRole = (req as any).user.role;

            let missions;

            // Admin et Super Admin voient toutes les missions du site
            if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
                missions = await planningService.getMissionsBySite(siteId);
            } else {
                // Les autres utilisateurs ne voient que les missions de leur entité
                missions = await planningService.getMissionsBySiteAndEntite(siteId, userEntite);
            }

            // Enrichir les données avec le nombre de jours de retard
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const enrichedMissions = missions.map(mission => {
                const datePrevue = new Date(mission.dateDeb);
                datePrevue.setHours(0, 0, 0, 0);

                const joursRetard = Math.ceil((today.getTime() - datePrevue.getTime()) / (1000 * 60 * 60 * 24));

                return {
                    ...mission,
                    joursRetard: mission.statut === 'EN_RETARD' || (mission.statut === 'A_FAIRE' && joursRetard > 0) ? joursRetard : 0,
                    dateDeb: mission.dateDeb.toISOString()
                };
            });

            res.json({ success: true, data: enrichedMissions });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/planning/pending → Missions en attente (A_FAIRE et EN_RETARD) 
    getPendingMissions = async (req: Request, res: Response): Promise<void> => {
        try {
            const userEntite = (req as any).user.entite;
            const userRole = (req as any).user.role;
            const showAll = req.query.all === 'true';

            console.log('🔍 [getPendingMissions] userEntite:', userEntite, '| userRole:', userRole, '| showAll:', showAll);

            // Import from prisma config
            const { StatusAction } = await import('@prisma/client');
            const prismaCentral = (await import('../config/prismaClient.js')).default;

            const whereClause: any = showAll ? {} : { statut: { in: [StatusAction.A_FAIRE, StatusAction.EN_RETARD] } };

            const missions = await prismaCentral.mission.findMany({
                where: whereClause,
                include: {
                    site: { select: { id: true, nom: true, code: true, zone: true, type: true } },
                    inspecteur: { select: { id: true, name: true, email: true, entite: true } }
                },
                orderBy: { dateDeb: 'asc' }
            });

            // Enrichir avec le nombre de jours de retard/avance
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Normaliser l'entité de l'utilisateur pour la comparaison
            const userEntiteNormalized = userEntite ? userEntite.toUpperCase().trim() : '';

            const enrichedMissions = (missions as any[]).map((mission: any) => {
                const datePrevue = new Date(mission.dateDeb);
                datePrevue.setHours(0, 0, 0, 0);

                const joursDiff = Math.ceil((today.getTime() - datePrevue.getTime()) / (1000 * 60 * 60 * 24));

                // Vérifier si la mission appartient à l'entité de l'utilisateur
                const missionEntite = (mission.inspecteur?.entite || '').toUpperCase().trim();
                const belongsToUserEntite = userEntiteNormalized === missionEntite;

                return {
                    ...mission,
                    joursRestants: joursDiff < 0 ? Math.abs(joursDiff) : 0,
                    joursRetard: joursDiff > 0 ? joursDiff : 0,
                    belongsToUserEntite, // Indicateur pour le frontend
                    isEditable: belongsToUserEntite || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
                };
            });

            res.json({ success: true, data: enrichedMissions, userEntite: userEntiteNormalized });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/planning/global → Planning tous inspecteurs (Admin)
    getPlanningGlobal = async (req: Request, res: Response): Promise<void> => {
        try {
            const mois = req.query.mois ? Number(req.query.mois) : undefined;
            const annee = req.query.annee ? Number(req.query.annee) : undefined;
            const data = await planningService.getPlanningGlobal(mois, annee);
            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // GET /api/planning/stats → Statistiques des inspections
    getStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;
            const inspecteurId = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
                ? (req.query.inspecteurId as string) || undefined
                : userId;

            const stats = await planningService.getInspectionStats(inspecteurId);
            res.json({ success: true, data: stats });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    /**
     * POST /api/planning/import → Importer une roadmap Excel
     */
    importRoadmap = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: 'Fichier Excel requis (champ "file")' });
                return;
            }

            const { year } = req.body;

            const result = await importService.importRoadmap(
                req.file.buffer,
                year ? Number(year) : 2026
            );

            res.status(200).json(result);
        } catch (err: any) {
            console.error('❌ [PlanningController] Import Error:', err.message);
            res.status(500).json({ success: false, message: err.message });
        }
    };

    renewYearPlanning = async (req: Request, res: Response): Promise<void> => {
        try {
            const { sourceYear, targetYear } = req.body;
            if (!sourceYear || !targetYear) {
                res.status(400).json({ success: false, message: 'Année source et cible requises' });
                return;
            }

            const result = await planningService.renewYearPlanning(Number(sourceYear), Number(targetYear));
            res.status(200).json({ success: true, ...result });
        } catch (err: any) {
            console.error('❌ [PlanningController] Renew Error:', err.message);
            res.status(500).json({ success: false, message: err.message });
        }
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const data = await planningService.findById(req.params['id'] as string);

            if (!data) {
                res.status(404).json({ success: false, message: 'Mission non trouvée' });
                return;
            }

            // Sécurité : Un inspecteur ne voit que ses missions ou missions de son entité
            if (user.role === 'INSPECTEUR' && data.inspecteurId !== user.id && data.inspecteur?.entite !== user.entite) {
                res.status(403).json({ success: false, message: 'Accès non autorisé à cette mission' });
                return;
            }

            res.json({ success: true, data });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    };

    // POST /api/planning → Créer une mission (Admin assigne site + inspecteur + date)
    create = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log('🚀 [PlanningController] Creating mission:', req.body);
            const data = await planningService.create(req.body);
            res.status(201).json({ success: true, data, message: 'Mission planifiée, inspecteur notifié' });
        } catch (err: any) {
            console.error('❌ [PlanningController] Create Error:', err.message);
            res.status(400).json({ success: false, message: err.message });
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            const missionId = req.params['id'] as string;

            // Seul l'Admin peut modifier les détails structurels d'une mission
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                res.status(403).json({ success: false, message: 'Seul un administrateur peut modifier une mission planifiée' });
                return;
            }

            console.log(`🚀 [PlanningController] Updating mission ${missionId}:`, req.body);
            const data = await planningService.update(missionId, req.body);
            res.json({ success: true, data, message: 'Mission mise à jour' });
        } catch (err: any) {
            console.error('❌ [PlanningController] Update Error:', err.message);
            res.status(400).json({ success: false, message: err.message });
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = (req as any).user;
            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                res.status(403).json({ success: false, message: 'Suppression non autorisée' });
                return;
            }
            await planningService.delete(req.params['id'] as string);
            res.json({ success: true, message: 'Mission supprimée' });
        } catch (err: any) {
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // POST /api/planning/:id/start → Démarrer une inspection
    startInspection = async (req: Request, res: Response): Promise<void> => {
        try {
            const missionId = req.params['id'] as string;
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;
            const userEntite = (req as any).user.entite;

            console.log('🔍 [startInspection] userId:', userId, '| userRole:', userRole, '| userEntite:', userEntite);

            // Extract GPS data from request body (optional)
            const { latitude, longitude, latitudeStart, longitudeStart } = req.body;
            const gpsData = {
                latitudeStart: latitudeStart || latitude || null,
                longitudeStart: longitudeStart || longitude || null,
                dateStart: new Date()
            };

            // Vérifier les permissions d'entité (sécurité)
            // ONLY inspectors need entity check; admins can start any mission
            if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
                const entiteCheck = await planningService.verifyEntiteAccess(missionId, userEntite, userRole);
                if (!entiteCheck.authorized) {
                    res.status(403).json({ success: false, message: entiteCheck.message });
                    return;
                }
            }

            const mission = await planningService.startInspection(missionId, userId, gpsData);
            res.json({ success: true, data: mission, message: 'Inspection démarrée' });
        } catch (err: any) {
            console.error('❌ [PlanningController] Start Error:', err.message);
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // POST /api/planning/:id/finish → Terminer une inspection
    finishInspection = async (req: Request, res: Response): Promise<void> => {
        try {
            const missionId = req.params['id'] as string;
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;
            const { dateRealisation, gpsData } = req.body;

            // Vérifier les permissions
            // Les administrateurs peuvent terminer n'importe quelle mission
            // Les inspecteurs ne peuvent terminer que les missions qu'ils ont démarrées
            if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
                const mission = await planningService.findById(missionId);
                if (!mission) {
                    res.status(404).json({ success: false, message: 'Mission non trouvée' });
                    return;
                }
                // La vérification startedById est faite dans le service
            }

            // ... (rest of checks)

            const result = await planningService.finishInspection(
                missionId,
                userId,
                dateRealisation ? new Date(dateRealisation) : undefined,
                gpsData
            );
            res.json({ success: true, data: result.mission, message: result.message });
        } catch (err: any) {
            console.error('❌ [PlanningController] Finish Error:', err.message);
            res.status(400).json({ success: false, message: err.message });
        }
    };

    // PATCH /api/planning/:id/status → Mettre à jour le statut d'une mission
    updateStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const missionId = req.params['id'] as string;
            const { statut } = req.body;
            const userId = (req as any).user.id;
            const userRole = (req as any).user.role;

            // Validation du statut
            const validStatuts = ['A_FAIRE', 'EN_COURS', 'TERMINE', 'EN_RETARD', 'ANTICIPE'];
            if (!statut || !validStatuts.includes(statut)) {
                res.status(400).json({
                    success: false,
                    message: `Statut invalide. Les statuts valides sont: ${validStatuts.join(', ')}`
                });
                return;
            }

            // Vérifier que l'utilisateur peut modifier cette mission
            // Admin peut modifier toutes les missions
            // Inspecteur ne peut modifier que ses propres missions
            if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
                const mission = await planningService.findById(missionId);
                if (!mission) {
                    res.status(404).json({ success: false, message: 'Mission non trouvée' });
                    return;
                }
                if (mission.inspecteurId !== userId) {
                    res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que vos propres missions' });
                    return;
                }
            }

            const updatedMission = await planningService.updateStatus(missionId, statut);
            res.json({
                success: true,
                data: updatedMission,
                message: `Statut mis à jour: ${statut}`
            });
        } catch (err: any) {
            console.error('❌ [PlanningController] UpdateStatus Error:', err.message);
            res.status(400).json({ success: false, message: err.message });
        }
    };
}
