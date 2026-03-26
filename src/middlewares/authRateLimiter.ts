// src/middlewares/authRateLimiter.ts
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { RateLimitUtils } from '../utils/RateLimitInfo.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par windowMs
  keyGenerator: (req: Request) => {
    // Combiner IP + email pour une meilleure précision
    return `${req.ip}-${req.body.email || 'unknown'}`;
  },
  skipSuccessfulRequests: true, // Ne pas compter les succès
  handler: (req: Request, res: Response) => {
    // Obtenir les infos de rate limiting
    const rateLimitInfo = RateLimitUtils.getRateLimitInfo(req);
    
    const message = rateLimitInfo 
      ? RateLimitUtils.generateWarningMessage(rateLimitInfo)
      : 'Too many attempts, please try again later';
    
    res.status(429).json({
      success: false,
      message: message,
      code: 'RATE_LIMIT_EXCEEDED',
      ...(rateLimitInfo && {
        retryAfter: Math.ceil(rateLimitInfo.windowMs / 1000),
        resetTime: rateLimitInfo.resetTime
      })
    });
  },
  standardHeaders: true, // Retourne les headers RFC 6585
  legacyHeaders: false // Désactive les headers X-RateLimit-*
});