import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';
import { cacheMiddleware } from '../middlewares/cache.middleware.js';


const router = Router();
const ctrl = new DashboardController();

router.use(authenticate);

// Cache 60s : les KPI du dashboard changent peu souvent
const cache60 = cacheMiddleware(60, true);

// ============ KPI & Synthèse ============

// GET /api/dashboard/kpis         → KPIs globaux avec toutes les métriques
router.get('/kpis', cache60, ctrl.getKpis);

// GET /api/dashboard/filters      → Filtres disponibles (régions, prestataires, types, inspecteurs)
router.get('/filters', cache60, ctrl.getAvailableFilters);

// ============ Conformité ============

// GET /api/dashboard/conformite-par-site    → Taux de conformité par site (bar chart)
router.get('/conformite-par-site', cache60, ctrl.getConformiteParSite);

// GET /api/dashboard/conformite-par-region → Taux de conformité par région/zone
router.get('/conformite-par-region', cache60, ctrl.getConformiteParRegion);

// GET /api/dashboard/conformite-par-prestataire → Taux de conformité par société de gardiennage
router.get('/conformite-par-prestataire', cache60, ctrl.getConformiteParPrestataire);

// GET /api/dashboard/conformite   → Taux de conformité par site / rubrique (legacy)
router.get('/conformite', cache60, ctrl.getConformite);

// ============ Non-conformités ============

// GET /api/dashboard/non-conformites-critiques → Liste des non-conformités critiques
router.get('/non-conformites-critiques', cache60, ctrl.getNonConformitesCritiques);

// ============ Plans d'actions ============

// GET /api/dashboard/plans-actions → Liste des plans d'actions
router.get('/plans-actions', cache60, ctrl.getPlansActions);

// GET /api/dashboard/actions-stats → Statistiques des plans d'actions (donut)
router.get('/actions-stats', cache60, ctrl.getActionsStats);

// GET /api/dashboard/actions      → Funnel des plans d'actions (legacy)
router.get('/actions', cache60, ctrl.getActionsStats);

// ============ Tableau comparatif ============

// GET /api/dashboard/tableau-sites → Tableau comparatif détaillé des sites
router.get('/tableau-sites', cache60, ctrl.getTableauSites);

// ============ Évolution ============

// GET /api/dashboard/evolution    → Évolution mensuelle / annuelle
router.get('/evolution', cache60, ctrl.getEvolution);

// ============ Site Rubriques ============

// GET /api/dashboard/site-rubriques/:siteId → Stats des rubriques pour un site spécifique
router.get('/site-rubriques/:siteId', ctrl.getSiteRubriqueStats);

// ============ Admin ============

// GET /api/dashboard/inspecteurs  → Classement inspecteurs (admin only)
router.get('/inspecteurs', authorize(['ADMIN', 'SUPER_ADMIN', 'DIRIGEANT']), cache60, ctrl.getClassementInspecteurs);



// ============ Export & Rapports ============

// GET /api/dashboard/export      → Générer un rapport de synthèse PDF/Excel
router.get('/export', ctrl.exportDashboard);

export default router;
