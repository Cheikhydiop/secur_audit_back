/**
 * Routes centralisées — SmartAudit DG-SECU/Sonatel
 * Ce fichier est une alternative à l'enregistrement direct dans src/index.ts
 */
import { Express } from 'express';
import authRoutes from './auth.routes.js';
import siteRoutes from './site.routes.js';
import inspectionRoutes from './inspection.routes.js';
import questionRoutes from './question.routes.js';
import actionRoutes from './action.routes.js';
import planningRoutes from './planning.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import rapportRoutes from './rapport.routes.js';
import logRoutes from './log.routes.js';
import adminRoutes from './admin.routes.js';
import globalSettingRoutes from './global-setting.routes.js';
import questionnaireAdminRoutes from './questionnaire-admin.routes.js';
import { requireAuth, authorizeRoles } from '../middlewares/authMiddleware.js';

export default function registerRoutes(app: Express): void {
  // ─── Routes publiques ──────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);

  // ─── Routes protégées ─────────────────────────────────────────────────────
  app.use('/api/sites', requireAuth as any, siteRoutes);
  app.use('/api/inspections', requireAuth as any, inspectionRoutes);
  app.use('/api/questions', requireAuth as any, questionRoutes);
  app.use('/api/actions', requireAuth as any, actionRoutes);
  app.use('/api/planning', requireAuth as any, planningRoutes);
  app.use('/api/dashboard', requireAuth as any, dashboardRoutes);
  app.use('/api/rapports', requireAuth as any, rapportRoutes);
  app.use('/api/global-settings', globalSettingRoutes);
  app.use('/api/logs', requireAuth as any, authorizeRoles('ADMIN', 'SUPER_ADMIN') as any, logRoutes);
  app.use('/api/admin', requireAuth as any, authorizeRoles('ADMIN', 'SUPER_ADMIN') as any, adminRoutes);
  app.use('/api/admin/questionnaire', requireAuth as any, authorizeRoles('ADMIN', 'SUPER_ADMIN') as any, questionnaireAdminRoutes);
}
