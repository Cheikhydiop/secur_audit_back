/**
 * AuditMiddleware - SmartAudit DG-SECU/Sonatel
 * Middleware d'audit automatique pour tracer les actions des utilisateurs
 * Adapté au contexte métier: Inspections, Sites, Users, Actions, Planning
 */
import { Request, Response, NextFunction } from 'express';
import { LogService } from '../services/LogService.js';
import logger from '../utils/logger.js';

// ─── Actions métier SmartInspect ────────────────────────────────────────────
export enum AuditAction {
  // Authentification
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  DEVICE_VERIFIED = 'DEVICE_VERIFIED',

  // Utilisateurs
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_ACTIVATE = 'USER_ACTIVATE',
  USER_DEACTIVATE = 'USER_DEACTIVATE',
  USER_INVITE = 'USER_INVITE',

  // Sites
  SITE_CREATE = 'SITE_CREATE',
  SITE_UPDATE = 'SITE_UPDATE',
  SITE_DELETE = 'SITE_DELETE',

  // Inspections
  INSPECTION_START = 'INSPECTION_START',
  INSPECTION_UPDATE = 'INSPECTION_UPDATE',
  INSPECTION_SUBMIT = 'INSPECTION_SUBMIT',
  INSPECTION_VALIDATE = 'INSPECTION_VALIDATE',
  INSPECTION_REJECT = 'INSPECTION_REJECT',
  INSPECTION_DELETE = 'INSPECTION_DELETE',

  // Plans d'action
  ACTION_CREATE = 'ACTION_CREATE',
  ACTION_UPDATE = 'ACTION_UPDATE',
  ACTION_COMPLETE = 'ACTION_COMPLETE',
  ACTION_DELETE = 'ACTION_DELETE',

  // Planning
  PLANNING_CREATE = 'PLANNING_CREATE',
  PLANNING_UPDATE = 'PLANNING_UPDATE',
  PLANNING_DELETE = 'PLANNING_DELETE',
  PLANNING_START = 'PLANNING_START',
  PLANNING_COMPLETE = 'PLANNING_COMPLETE',

  // Rapports
  RAPPORT_GENERATE = 'RAPPORT_GENERATE',
  RAPPORT_DOWNLOAD = 'RAPPORT_DOWNLOAD',

  // Administration questionnaire
  QUESTIONNAIRE_CREATE = 'QUESTIONNAIRE_CREATE',
  QUESTIONNAIRE_UPDATE = 'QUESTIONNAIRE_UPDATE',
  QUESTION_CREATE = 'QUESTION_CREATE',
  QUESTION_UPDATE = 'QUESTION_UPDATE',
  QUESTION_DELETE = 'QUESTION_DELETE',
  RUBRIQUE_CREATE = 'RUBRIQUE_CREATE',
  RUBRIQUE_UPDATE = 'RUBRIQUE_UPDATE',

  // Système
  SYSTEM_ACCESS = 'SYSTEM_ACCESS',
}

export enum AuditEntity {
  USER = 'USER',
  SITE = 'SITE',
  INSPECTION = 'INSPECTION',
  ACTION = 'ACTION',
  PLANNING = 'PLANNING',
  RAPPORT = 'RAPPORT',
  QUESTION = 'QUESTION',
  RUBRIQUE = 'RUBRIQUE',
  QUESTIONNAIRE = 'QUESTIONNAIRE',
  SESSION = 'SESSION',
  SYSTEM = 'SYSTEM',
}

interface AuditConfig {
  action: AuditAction;
  entity: AuditEntity;
  getEntityId?: (req: Request, res: Response) => string | undefined;
  getDetails?: (req: Request, res: Response) => any;
  onlyOnSuccess?: boolean; // Si true, ne log que si statut 2xx
}

/**
 * Helper: retourne un paramètre de route en tant que string unique (jamais de tableau)
 */
function param(req: Request, key: string): string | undefined {
  const val = req.params[key];
  if (Array.isArray(val)) return val[0];
  return val;
}

/**
 * Middleware d'audit générique – à utiliser sur n'importe quelle route
 * 
 * @example
 * router.post('/inspections', requireAuth, auditMiddleware({
 *   action: AuditAction.INSPECTION_START,
 *   entity: AuditEntity.INSPECTION,
 *   getEntityId: (req, res) => res.locals.createdId,
 * }), ctrl.create);
 */
export function auditMiddleware(config: AuditConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Intercepter le json() de la réponse pour capturer l'ID créé
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      res.locals.responseBody = body;
      return originalJson(body);
    };

    // Exécuter le handler suivant
    res.on('finish', async () => {
      try {
        const userId = (req as any).user?.id || (req as any).user?.userId;
        if (!userId) return; // Pas d'utilisateur authentifié

        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

        // Si on ne log que les succès
        if (config.onlyOnSuccess && !isSuccess) return;

        // Récupérer les infos
        const responseBody = res.locals.responseBody;
        const entityId = config.getEntityId
          ? config.getEntityId(req, res)
          : (responseBody?.data?.id || req.params.id || req.params.inspectionId || req.params.siteId || req.params.userId || '');

        const details = config.getDetails
          ? config.getDetails(req, res)
          : undefined;

        const ipAddress = req.ip ||
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.socket.remoteAddress ||
          '';

        await LogService.log({
          userId,
          action: config.action,
          entity: config.entity,
          entityId: entityId ?? '',
          details: {
            ...details,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            success: isSuccess,
          },
          ipAddress,
          userAgent: req.get('User-Agent'),
        });

      } catch (auditErr) {
        // Ne jamais faire planter l'application à cause de l'audit
        logger.error('[AuditMiddleware] Erreur interne audit:', auditErr);
      }
    });

    next();
  };
}

/**
 * Raccourcis pour les actions courantes
 */
export const audit = {
  // Auth
  login: () => auditMiddleware({ action: AuditAction.USER_LOGIN, entity: AuditEntity.USER }),
  logout: () => auditMiddleware({ action: AuditAction.USER_LOGOUT, entity: AuditEntity.USER }),
  changePassword: () => auditMiddleware({ action: AuditAction.PASSWORD_CHANGE, entity: AuditEntity.USER }),

  // Sites
  createSite: () => auditMiddleware({
    action: AuditAction.SITE_CREATE,
    entity: AuditEntity.SITE,
    getEntityId: (req, res) => res.locals.responseBody?.data?.id,
    getDetails: (req) => ({ nom: req.body.nom, code: req.body.code }),
    onlyOnSuccess: true,
  }),
  updateSite: () => auditMiddleware({
    action: AuditAction.SITE_UPDATE,
    entity: AuditEntity.SITE,
    getEntityId: (req) => param(req, 'id'),
    getDetails: (req) => ({ changes: req.body }),
    onlyOnSuccess: true,
  }),
  deleteSite: () => auditMiddleware({
    action: AuditAction.SITE_DELETE,
    entity: AuditEntity.SITE,
    getEntityId: (req) => param(req, 'id'),
    onlyOnSuccess: true,
  }),

  // Inspections
  startInspection: () => auditMiddleware({
    action: AuditAction.INSPECTION_START,
    entity: AuditEntity.INSPECTION,
    getEntityId: (req, res) => res.locals.responseBody?.data?.id,
    getDetails: (req) => ({ siteId: req.body.siteId }),
    onlyOnSuccess: true,
  }),
  updateInspection: () => auditMiddleware({
    action: AuditAction.INSPECTION_UPDATE,
    entity: AuditEntity.INSPECTION,
    getEntityId: (req) => param(req, 'id'),
    onlyOnSuccess: true,
  }),
  submitInspection: () => auditMiddleware({
    action: AuditAction.INSPECTION_SUBMIT,
    entity: AuditEntity.INSPECTION,
    getEntityId: (req) => param(req, 'id'),
    getDetails: (req, res) => ({ score: res.locals.responseBody?.data?.score }),
    onlyOnSuccess: true,
  }),
  deleteInspection: () => auditMiddleware({
    action: AuditAction.INSPECTION_DELETE,
    entity: AuditEntity.INSPECTION,
    getEntityId: (req) => param(req, 'id'),
    onlyOnSuccess: true,
  }),

  // Users
  createUser: () => auditMiddleware({
    action: AuditAction.USER_CREATE,
    entity: AuditEntity.USER,
    getEntityId: (req, res) => res.locals.responseBody?.data?.id,
    getDetails: (req) => ({ email: req.body.email, role: req.body.role }),
    onlyOnSuccess: true,
  }),
  updateUser: () => auditMiddleware({
    action: AuditAction.USER_UPDATE,
    entity: AuditEntity.USER,
    getEntityId: (req) => param(req, 'id'),
    getDetails: (req) => ({ changes: req.body }),
    onlyOnSuccess: true,
  }),
  inviteUser: () => auditMiddleware({
    action: AuditAction.USER_INVITE,
    entity: AuditEntity.USER,
    getDetails: (req) => ({ email: req.body.email, role: req.body.role }),
    onlyOnSuccess: true,
  }),
  activateUser: () => auditMiddleware({
    action: AuditAction.USER_ACTIVATE,
    entity: AuditEntity.USER,
    getEntityId: (req) => param(req, 'id'),
    onlyOnSuccess: true,
  }),
  deactivateUser: () => auditMiddleware({
    action: AuditAction.USER_DEACTIVATE,
    entity: AuditEntity.USER,
    getEntityId: (req) => param(req, 'id'),
    onlyOnSuccess: true,
  }),

  // Actions (plans)
  createAction: () => auditMiddleware({
    action: AuditAction.ACTION_CREATE,
    entity: AuditEntity.ACTION,
    getEntityId: (req, res) => res.locals.responseBody?.data?.id,
    getDetails: (req) => ({ description: req.body.description, criticite: req.body.criticite }),
    onlyOnSuccess: true,
  }),
  updateAction: () => auditMiddleware({
    action: AuditAction.ACTION_UPDATE,
    entity: AuditEntity.ACTION,
    getEntityId: (req) => param(req, 'id'),
    getDetails: (req) => ({ newStatut: req.body.statut }),
    onlyOnSuccess: true,
  }),

  // Planning
  createPlanning: () => auditMiddleware({
    action: AuditAction.PLANNING_CREATE,
    entity: AuditEntity.PLANNING,
    getEntityId: (req, res) => res.locals.responseBody?.data?.id,
    onlyOnSuccess: true,
  }),
  updatePlanning: () => auditMiddleware({
    action: AuditAction.PLANNING_UPDATE,
    entity: AuditEntity.PLANNING,
    getEntityId: (req) => param(req, 'id'),
    onlyOnSuccess: true,
  }),
  startPlanning: () => auditMiddleware({
    action: AuditAction.PLANNING_START,
    entity: AuditEntity.PLANNING,
    getEntityId: (req) => param(req, 'id'),
    onlyOnSuccess: true,
  }),

  // Rapports
  generateRapport: () => auditMiddleware({
    action: AuditAction.RAPPORT_GENERATE,
    entity: AuditEntity.RAPPORT,
    getEntityId: (req) => param(req, 'id') ?? req.body.inspectionId,
    onlyOnSuccess: true,
  }),
};

// Ré-export de l'ancien AuditMiddleware pour compatibilité
export class AuditMiddleware {
  constructor(private auditService: any) { }

  audit(config: any) {
    return auditMiddleware({
      action: config.action,
      entity: config.resourceType as AuditEntity,
    });
  }

  auditUserRegister() {
    return auditMiddleware({ action: AuditAction.USER_CREATE, entity: AuditEntity.USER });
  }

  auditUserLogin() {
    return auditMiddleware({ action: AuditAction.USER_LOGIN, entity: AuditEntity.USER });
  }

  auditFailedLogin() {
    return auditMiddleware({ action: AuditAction.USER_LOGIN_FAILED, entity: AuditEntity.USER });
  }

  auditPasswordChange() {
    return auditMiddleware({ action: AuditAction.PASSWORD_CHANGE, entity: AuditEntity.USER });
  }
}

export enum AuditResourceType {
  USER = 'USER',
  SITE = 'SITE',
  INSPECTION = 'INSPECTION',
  ACTION = 'ACTION',
  SESSION = 'SESSION',
  SYSTEM = 'SYSTEM',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}