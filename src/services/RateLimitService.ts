// src/services/RateLimitService.ts
import { Request } from 'express';
import { RateLimitUtils, RateLimitInfo } from '../utils/RateLimitInfo.js';

export class RateLimitService {
  private static readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_ATTEMPTS = 5;
  
  /**
   * Vérifie si une requête est bloquée par le rate limiting
   */
  static checkRateLimit(req: Request): {
    isBlocked: boolean;
    rateLimitInfo: RateLimitInfo | null;
    remainingAttempts: number;
  } {
    const rateLimitInfo = RateLimitUtils.getRateLimitInfo(req);
    
    if (!rateLimitInfo) {
      return {
        isBlocked: false,
        rateLimitInfo: null,
        remainingAttempts: this.MAX_ATTEMPTS
      };
    }
    
    return {
      isBlocked: rateLimitInfo.remaining <= 0,
      rateLimitInfo,
      remainingAttempts: rateLimitInfo.remaining
    };
  }
  
  /**
   * Génère une réponse d'erreur pour le rate limiting
   */
  static createRateLimitError(rateLimitInfo: RateLimitInfo) {
    return RateLimitUtils.createRateLimitError(rateLimitInfo);
  }
  
  /**
   * Vérifie si l'utilisateur approche de la limite
   */
  static isApproachingLimit(rateLimitInfo: RateLimitInfo): boolean {
    return RateLimitUtils.isApproachingLimit(rateLimitInfo);
  }
}