// middlewares/authMiddleware.ts — SmartAudit DG-SECU/Sonatel
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prismaClient.js';
import { AuthenticationError, ForbiddenError } from '../errors/customErrors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Extrait le token JWT depuis les headers Authorization ou cookie
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // Support cookie-based token
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
};

/**
 * Récupère l'utilisateur depuis la base de données
 */
const fetchUser = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      mustChangePassword: true,
    }
  });
};

// ==================== MIDDLEWARES ====================

/**
 * Middleware d'authentification principal
 * Vérifie le JWT et attache l'utilisateur à req.user
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('Token d\'authentification manquant');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new AuthenticationError('Token invalide ou expiré');
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      throw new AuthenticationError('Token invalide : userId manquant');
    }

    const user = await fetchUser(userId);

    if (!user) {
      throw new AuthenticationError('Utilisateur introuvable');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Compte désactivé. Contactez l\'administrateur.');
    }

    // Attach user to request
    (req as any).user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      mustChangePassword: user.mustChangePassword,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de vérification de rôle
 * Usage: authorizeRoles('ADMIN', 'SUPER_ADMIN')
 */
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      next(new AuthenticationError('Non authentifié'));
      return;
    }
    if (!roles.includes(user.role)) {
      next(new ForbiddenError(`Accès refusé. Rôles requis: ${roles.join(', ')}`));
      return;
    }
    next();
  };
};

/**
 * Middleware : vérifie que le mot de passe a été changé
 * Bloque si mustChangePassword = true (PB-016)
 */
export const requirePasswordChanged = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  if (user?.mustChangePassword) {
    res.status(403).json({
      success: false,
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Vous devez changer votre mot de passe avant de continuer.',
      redirectTo: '/change-password'
    });
    return;
  }
  next();
};

/**
 * Middleware de vérification de rôle admin
 * Usage: requireAdmin
 */
export const requireAdmin = authorizeRoles('ADMIN', 'SUPER_ADMIN');

/**
 * Middleware optionnel : attache l'utilisateur si token présent, sans bloquer
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      next();
      return;
    }
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    if (userId) {
      const user = await fetchUser(userId);
      if (user && user.isActive) {
        (req as any).user = { ...user, userId: user.id };
      }
    }
  } catch {
    // Ignore errors for optional auth
  }
  next();
};

// Legacy exports for backward compatibility
export const authenticate = requireAuth;
export const protect = requireAuth;
export const requireRole = authorizeRoles;
export default requireAuth;
