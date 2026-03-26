import { Request, Response, NextFunction } from 'express';

// Interface pour les informations de rate limiting
export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetTime: Date;
  windowMs: number;
  isBlocked?: boolean;
}

// Stockage en mémoire pour les tentatives
const rateLimitStore = new Map<string, {
  count: number;
  firstAttempt: Date;
  lastAttempt: Date;
  windowMs: number;
  maxAttempts: number;
}>();

/**
 * Nettoyer les anciennes entrées du Map
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    const timeSinceFirstAttempt = now - data.firstAttempt.getTime();
    if (timeSinceFirstAttempt > data.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Extraire la clé unique pour le rate limiting
 */
function getRateLimitKey(req: Request, scope: string = 'ip'): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  switch (scope) {
    case 'email':
      const { email } = req.body;
      if (email) {
        return `email:${email.toLowerCase()}`;
      }
      return `ip:${ip}`;

    case 'ip':
    default:
      return `ip:${ip}`;
  }
}

/**
 * Obtenir les informations de rate limiting actuelles
 */
export function getRateLimitInfo(
  key: string,
  windowMs: number = 15 * 60 * 1000, // 15 minutes par défaut
  maxAttempts: number = 5 // 5 tentatives par défaut
): RateLimitInfo | null {
  const data = rateLimitStore.get(key);
  const now = Date.now();

  if (!data) {
    const resetTime = new Date(now + windowMs);
    return {
      remaining: maxAttempts,
      limit: maxAttempts,
      resetTime,
      windowMs,
      isBlocked: false
    };
  }

  const timeSinceFirstAttempt = now - data.firstAttempt.getTime();

  // Si la fenêtre de temps est expirée, réinitialiser
  if (timeSinceFirstAttempt > windowMs) {
    const resetTime = new Date(now + windowMs);
    return {
      remaining: maxAttempts,
      limit: maxAttempts,
      resetTime,
      windowMs,
      isBlocked: false
    };
  }

  const remaining = Math.max(0, maxAttempts - data.count);
  const resetTime = new Date(data.firstAttempt.getTime() + windowMs);
  const isBlocked = data.count >= maxAttempts;

  return {
    remaining,
    limit: maxAttempts,
    resetTime,
    windowMs,
    isBlocked
  };
}

/**
 * Middleware de rate limiting configurable
 */
export const rateLimitMiddleware = (
  config: {
    windowMs?: number;      // Fenêtre de temps en ms
    maxAttempts?: number;   // Nombre max de tentatives
    scope?: 'ip' | 'email' | 'global'; // Portée du rate limiting
    skipSuccessfulRequests?: boolean; // Ignorer les requêtes réussies
    message?: string;       // Message d'erreur personnalisé
  } = {}
) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes par défaut
    maxAttempts = 5,           // 5 tentatives par défaut
    scope = 'ip',              // Portée par IP par défaut
    skipSuccessfulRequests = false,
    message = 'Trop de tentatives. Veuillez réessayer plus tard.'
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Nettoyer périodiquement (10% de chance)
      if (Math.random() < 0.1) {
        cleanupOldEntries();
      }

      const key = getRateLimitKey(req, scope);
      const now = new Date();

      // Obtenir ou créer les données de rate limiting
      let data = rateLimitStore.get(key);

      if (!data) {
        // Première tentative
        data = {
          count: 1,
          firstAttempt: now,
          lastAttempt: now,
          windowMs,
          maxAttempts
        };
        rateLimitStore.set(key, data);
      } else {
        // Vérifier si la fenêtre de temps est expirée
        const timeSinceFirstAttempt = now.getTime() - data.firstAttempt.getTime();

        if (timeSinceFirstAttempt > windowMs) {
          // Réinitialiser le compteur
          data.count = 1;
          data.firstAttempt = now;
          data.lastAttempt = now;
          data.windowMs = windowMs;
          data.maxAttempts = maxAttempts;
        } else {
          // Incrémenter le compteur
          data.count++;
          data.lastAttempt = now;
        }

        rateLimitStore.set(key, data);
      }

      // Calculer les informations de rate limiting
      const rateLimitInfo = getRateLimitInfo(key, windowMs, maxAttempts);

      // Stocker dans la requête pour usage ultérieur
      if (rateLimitInfo) {
        (req as any).rateLimitInfo = rateLimitInfo;

        // Ajouter les headers
        res.setHeader('RateLimit-Limit', rateLimitInfo.limit.toString());
        res.setHeader('RateLimit-Remaining', Math.max(0, rateLimitInfo.remaining).toString());
        res.setHeader('RateLimit-Reset', Math.floor(rateLimitInfo.resetTime.getTime() / 1000).toString());
      }

      // Vérifier si le maximum est atteint
      if (data.count > maxAttempts) {
        const resetTime = new Date(data.firstAttempt.getTime() + windowMs);
        const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);

        res.setHeader('Retry-After', retryAfter);

        res.status(429).json({
          success: false,
          message,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter,
            resetTime: resetTime.toISOString(),
            limit: maxAttempts,
            scope
          }
        });
        return;
      }

      // Si la requête réussit et qu'on doit ignorer les succès
      if (skipSuccessfulRequests) {
        const originalJson = res.json;
        res.json = function (body: any) {
          if (body && body.success === true) {
            // Supprimer la clé du rate limiting
            rateLimitStore.delete(key);
          }
          return originalJson.call(this, body);
        };
      }

      next();

    } catch (error) {
      console.error('❌ Rate limiter error:', error);
      next(); // Continuer même en cas d'erreur
    }
  };
};

/**
 * Configuration de rate limiting par route
 */
export const rateLimitConfigs = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 10,           // 10 tentatives
    scope: 'email' as const,  // Par email
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
  },
  register: {
    windowMs: 60 * 60 * 1000, // 1 heure
    maxAttempts: 10,           // 10 tentatives
    scope: 'ip' as const,     // Par IP
    message: 'Trop de tentatives d\'inscription. Veuillez réessayer dans 1 heure.'
  },
  verifyEmail: {
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxAttempts: 10,           // 10 tentatives
    scope: 'email' as const,  // Par email
    message: 'Trop de tentatives de vérification. Veuillez réessayer dans 5 minutes.'
  },
  forgotPassword: {
    windowMs: 60 * 60 * 1000, // 1 heure
    maxAttempts: 10,           // 10 tentatives
    scope: 'email' as const,  // Par email
    message: 'Trop de demandes de réinitialisation. Veuillez réessayer dans 1 heure.'
  },
  resetPassword: {
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxAttempts: 10,           // 10 tentatives
    scope: 'email' as const,  // Par email
    message: 'Trop de tentatives de réinitialisation. Veuillez réessayer dans 5 minutes.'
  },
  general: {
    windowMs: 60 * 1000,      // 1 minute
    maxAttempts: 60,          // 60 requêtes/min
    scope: 'ip' as const,     // Par IP
    message: 'Trop de requêtes. Veuillez ralentir.'
  }
};

/**
 * Service de rate limiting pour utilisation dans les contrôleurs
 */
export class RateLimitService {
  /**
   * Vérifier le rate limiting pour une requête
   */
  static checkRateLimit(req: Request, configKey?: keyof typeof rateLimitConfigs) {
    const config = configKey ? rateLimitConfigs[configKey] : rateLimitConfigs.general;

    const key = getRateLimitKey(req, config.scope);
    const rateLimitInfo = getRateLimitInfo(key, config.windowMs, config.maxAttempts);

    return {
      isBlocked: rateLimitInfo?.isBlocked || false,
      rateLimitInfo,
      message: config.message
    };
  }

  /**
   * Réinitialiser le rate limiting pour une clé
   */
  static resetRateLimit(key: string): void {
    rateLimitStore.delete(key);
  }

  /**
   * Réinitialiser le rate limiting pour un email/IP
   */
  static resetForUser(req: Request, scope: 'ip' | 'email' = 'email'): void {
    const key = getRateLimitKey(req, scope);
    rateLimitStore.delete(key);
  }

  /**
   * Obtenir les statistiques
   */
  static getStats() {
    const now = Date.now();
    const stats = {
      totalKeys: rateLimitStore.size,
      recentAttempts: 0,
      blockedKeys: 0
    };

    for (const [key, data] of rateLimitStore.entries()) {
      const timeSinceLastAttempt = now - data.lastAttempt.getTime();

      // Tentatives récentes (dernières 5 minutes)
      if (timeSinceLastAttempt < 5 * 60 * 1000) {
        stats.recentAttempts++;
      }

      // Clés bloquées
      if (data.count >= data.maxAttempts) {
        stats.blockedKeys++;
      }
    }

    return stats;
  }
}

/**
 * Middleware pour ajouter les infos de rate limiting aux réponses
 */
export const rateLimitInfoMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;

  res.json = function (data: any) {
    // Ajouter les infos de rate limiting si disponibles
    const rateLimitInfo = (req as any).rateLimitInfo as RateLimitInfo | undefined;

    if (rateLimitInfo && data && typeof data === 'object') {
      if (!data.rateLimitInfo) {
        const remainingTime = Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000);

        data.rateLimitInfo = {
          remaining: rateLimitInfo.remaining,
          limit: rateLimitInfo.limit,
          resetTime: rateLimitInfo.resetTime.toISOString(),
          remainingSeconds: remainingTime > 0 ? remainingTime : 0,
          isBlocked: rateLimitInfo.isBlocked || false
        };
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Utilitaire pour gérer les tentatives de connexion
 */
export class LoginAttemptManager {
  private static readonly MAX_ATTEMPTS = 10;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  private static attempts = new Map<string, {
    count: number;
    firstAttempt: Date;
    lastAttempt: Date;
    isBlocked: boolean;
  }>();

  /**
   * Enregistrer une tentative échouée
   */
  static recordFailedAttempt(clientIp: string) {
    const now = new Date();
    let attempt = this.attempts.get(clientIp);

    if (!attempt) {
      attempt = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        isBlocked: false
      };
    } else {
      const timeSinceFirstAttempt = now.getTime() - attempt.firstAttempt.getTime();

      // Si la fenêtre est expirée, réinitialiser
      if (timeSinceFirstAttempt > this.WINDOW_MS) {
        attempt = {
          count: 1,
          firstAttempt: now,
          lastAttempt: now,
          isBlocked: false
        };
      } else {
        attempt.count++;
        attempt.lastAttempt = now;
        attempt.isBlocked = attempt.count >= this.MAX_ATTEMPTS;
      }
    }

    this.attempts.set(clientIp, attempt);

    const resetTime = new Date(attempt.firstAttempt.getTime() + this.WINDOW_MS);
    const remaining = Math.max(0, this.MAX_ATTEMPTS - attempt.count);

    return {
      count: attempt.count,
      remaining,
      isBlocked: attempt.isBlocked,
      resetTime,
      remainingSeconds: Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
    };
  }

  /**
   * Vérifier si une IP est bloquée
   */
  static isBlocked(clientIp: string): boolean {
    const attempt = this.attempts.get(clientIp);
    if (!attempt) return false;

    const now = new Date();
    const timeSinceFirstAttempt = now.getTime() - attempt.firstAttempt.getTime();

    // Si la fenêtre est expirée, réinitialiser
    if (timeSinceFirstAttempt > this.WINDOW_MS) {
      this.attempts.delete(clientIp);
      return false;
    }

    return attempt.isBlocked;
  }

  /**
   * Obtenir le statut des tentatives
   */
  static getAttemptStatus(clientIp: string) {
    const attempt = this.attempts.get(clientIp);
    if (!attempt) return null;

    const now = new Date();
    const timeSinceFirstAttempt = now.getTime() - attempt.firstAttempt.getTime();
    const resetTime = new Date(attempt.firstAttempt.getTime() + this.WINDOW_MS);

    return {
      count: attempt.count,
      isBlocked: attempt.isBlocked,
      resetTime,
      timeUntilReset: resetTime.getTime() - now.getTime()
    };
  }

  /**
   * Effacer les tentatives échouées
   */
  static clearFailedAttempts(clientIp: string): void {
    this.attempts.delete(clientIp);
  }

  /**
   * Nettoyer les anciennes entrées
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, attempt] of this.attempts.entries()) {
      if (now - attempt.lastAttempt.getTime() > this.WINDOW_MS * 2) {
        this.attempts.delete(key);
      }
    }
  }
}