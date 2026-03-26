// middlewares/adminMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, AuthenticationError } from '../errors/customErrors.js';
import logger from '../utils/logger.js';



/**
 * Middleware pour vérifier que l'utilisateur est un administrateur
 * Ce middleware doit être utilisé APRÈS requireAuth
 */
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user) {
      throw new AuthenticationError('Utilisateur non authentifié', {
        reason: 'NO_USER_IN_REQUEST',
        suggestion: 'Utilisez requireAuth avant adminMiddleware'
      });
    }

    // Vérifier que l'utilisateur est actif
    if (!req.user.isActive) {
      throw new ForbiddenError('Compte désactivé', {
        reason: 'ACCOUNT_DEACTIVATED',
        userId: req.user.id
      });
    }

    // Vérifier le rôle admin
    if (req.user.role !== 'ADMIN') {
      logger.warn(`Tentative d'accès admin par utilisateur non-admin: ${req.user.id}`, {
        userId: req.user.id,
        userRole: req.user.role,
        requestedPath: req.path,
        method: req.method
      });

      throw new ForbiddenError('Accès réservé aux administrateurs', {
        reason: 'INSUFFICIENT_PERMISSIONS',
        requiredRole: 'ADMIN',
        userRole: req.user.role,
        suggestion: 'Cette action nécessite des privilèges administrateur'
      });
    }

    // Log de l'action admin (pour audit)
    logger.info(`Action admin: ${req.method} ${req.path}`, {
      adminId: req.user.id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip || req.socket.remoteAddress
    });

    next();
  } catch (error: any) {
    next(error);
  }
};

/**
 * Middleware pour vérifier que l'utilisateur est admin OU propriétaire de la ressource
 * Utile pour les endpoints où l'utilisateur peut gérer ses propres données OU un admin peut gérer toutes les données
 */
export const adminOrOwnerMiddleware = (
  resourceParam: string = 'userId',
  bodyParam: boolean = false
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user) {
        throw new AuthenticationError('Utilisateur non authentifié', {
          reason: 'NO_USER_IN_REQUEST'
        });
      }

      // Si c'est un admin, autoriser
      if (req.user.role === 'ADMIN' && req.user.isActive) {
        return next();
      }

      // Sinon, vérifier la propriété
      const resourceId = bodyParam
        ? req.body[resourceParam]
        : req.params[resourceParam];

      if (!resourceId) {
        throw new ForbiddenError('Identifiant de ressource manquant', {
          reason: 'MISSING_RESOURCE_ID',
          param: resourceParam
        });
      }

      if (req.user.id !== resourceId) {
        throw new ForbiddenError('Accès non autorisé à cette ressource', {
          reason: 'NOT_OWNER_OR_ADMIN',
          resourceId,
          userId: req.user.id
        });
      }

      next();
    } catch (error: any) {
      next(error);
    }
  };
};

/**
 * Middleware pour les super-admins seulement
 * Utilise un flag spécial ou une vérification supplémentaire
 */
export const superAdminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Utilisateur non authentifié', {
        reason: 'NO_USER_IN_REQUEST'
      });
    }

    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenError('Accès réservé aux super-administrateurs', {
        reason: 'NOT_SUPER_ADMIN'
      });
    }

    // Vérification supplémentaire pour super-admin
    // Par exemple, vérifier un email spécifique ou un flag dans la base de données
    const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',') || [];

    if (!req.user.email || !superAdminEmails.includes(req.user.email)) {
      throw new ForbiddenError('Privilèges super-administrateur requis', {
        reason: 'INSUFFICIENT_ADMIN_PRIVILEGES',
        suggestion: 'Cette action nécessite des privilèges super-administrateur'
      });
    }

    logger.warn(`Action super-admin: ${req.method} ${req.path}`, {
      superAdminId: req.user.id,
      superAdminEmail: req.user.email,
      method: req.method,
      path: req.path
    });

    next();
  } catch (error: any) {
    next(error);
  }
};

/**
 * Middleware pour loguer les actions administratives critiques
 */
export const logAdminAction = (actionName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next();
    }

    // Éviter de logger le body s'il contient des mots de passe
    const safeBody = { ...req.body };
    if (safeBody.password) delete safeBody.password;
    if (safeBody.currentPassword) delete safeBody.currentPassword;
    if (safeBody.newPassword) delete safeBody.newPassword;
    if (safeBody.token) delete safeBody.token;
    if (safeBody.refreshToken) delete safeBody.refreshToken;

    logger.info(`Action admin critique: ${actionName}`, {
      action: actionName,
      adminId: req.user.id,
      adminEmail: req.user.email,
      method: req.method,
      path: req.path,
      body: safeBody,
      params: req.params,
      query: req.query,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    next();
  };
};

/**
 * Middleware pour vérifier les permissions spécifiques d'admin
 * Permet de créer des rôles admin avec différents niveaux d'accès
 */
export const requireAdminPermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Utilisateur non authentifié', {
          reason: 'NO_USER_IN_REQUEST'
        });
      }

      if (req.user.role !== 'ADMIN') {
        throw new ForbiddenError('Accès réservé aux administrateurs', {
          reason: 'NOT_ADMIN'
        });
      }

      // NOTE: Cette partie nécessiterait une table de permissions dans votre base de données
      // Pour l'instant, on vérifie juste si c'est un admin
      // Vous pourriez étendre votre modèle User pour inclure un champ "permissions: string[]"

      // Exemple d'implémentation future:
      // const userPermissions = req.user.permissions || [];
      // const hasPermission = permissions.every(p => userPermissions.includes(p));
      // 
      // if (!hasPermission) {
      //   throw new ForbiddenError('Permissions insuffisantes', {
      //     reason: 'MISSING_PERMISSIONS',
      //     required: permissions,
      //     current: userPermissions
      //   });
      // }

      next();
    } catch (error: any) {
      next(error);
    }
  };
};

/**
 * Middleware pour limiter le taux de requêtes admin
 * Prévient les abus même par les admins
 */
export const adminRateLimiter = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next();
    }

    const key = `admin_${req.user.id}`;
    const now = Date.now();
    const userRequests = requests.get(key);

    if (!userRequests || now > userRequests.resetTime) {
      // Nouvelle fenêtre
      requests.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (userRequests.count >= maxRequests) {
      logger.warn(`Rate limit dépassé pour admin: ${req.user.id}`, {
        adminId: req.user.id,
        count: userRequests.count,
        maxRequests
      });

      throw new ForbiddenError('Trop de requêtes', {
        reason: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }

    userRequests.count++;
    next();
  };
};

/**
 * Middleware pour vérifier l'authentification à deux facteurs pour les actions admin sensibles
 */
export const require2FAForAdminAction = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Utilisateur non authentifié', {
        reason: 'NO_USER_IN_REQUEST'
      });
    }

    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenError('Accès réservé aux administrateurs', {
        reason: 'NOT_ADMIN'
      });
    }

    // Vérifier si un code 2FA a été fourni
    const twoFactorCode = req.headers['x-2fa-code'] || req.body.twoFactorCode;

    if (!twoFactorCode) {
      throw new ForbiddenError('Code d\'authentification à deux facteurs requis', {
        reason: '2FA_REQUIRED',
        suggestion: 'Fournissez un code 2FA valide pour cette action sensible'
      });
    }

    // NOTE: Implémenter la vérification 2FA ici
    // Exemple: vérifier le code OTP dans la base de données
    // const isValid = await verify2FACode(req.user.id, twoFactorCode);
    // if (!isValid) {
    //   throw new ForbiddenError('Code 2FA invalide');
    // }

    next();
  } catch (error: any) {
    next(error);
  }
};

// Export par défaut
export default {
  adminMiddleware,
  adminOrOwnerMiddleware,
  superAdminMiddleware,
  logAdminAction,
  requireAdminPermission,
  adminRateLimiter,
  require2FAForAdminAction
};