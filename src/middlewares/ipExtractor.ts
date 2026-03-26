// src/middlewares/ipExtractor.ts
import { Request, Response, NextFunction } from 'express';

export const ipExtractor = (req: Request, res: Response, next: NextFunction) => {
  try {
    const extractClientIp = (req: Request): string => {
      // 1. Vérifier x-forwarded-for (le plus courant)
      const xForwardedFor = req.headers['x-forwarded-for'];
      if (xForwardedFor) {
        const ipList = Array.isArray(xForwardedFor) 
          ? xForwardedFor[0] 
          : xForwardedFor;
        
        const clientIp = ipList.split(',')[0].trim();
        if (clientIp && clientIp !== '') {
          return clientIp;
        }
      }

      // 2. Vérifier les autres headers
      const headersToCheck = [
        'x-real-ip',
        'x-client-ip',
        'cf-connecting-ip',
        'fastly-client-ip',
        'true-client-ip',
        'x-cluster-client-ip'
      ];

      for (const header of headersToCheck) {
        const value = req.headers[header];
        if (value) {
          const ip = Array.isArray(value) ? value[0] : value;
          if (ip) return ip;
        }
      }

      // 3. Vérifier req.ip (set par Express)
      if (req.ip) {
        // Convertir ::1 en 127.0.0.1 pour la cohérence
        if (req.ip === '::1' || req.ip === '::ffff:127.0.0.1') {
          return '127.0.0.1';
        }
        return req.ip;
      }

      // 4. Vérifier la connexion socket
      const socketIp = req.socket?.remoteAddress;
      if (socketIp) {
        if (socketIp === '::1' || socketIp === '::ffff:127.0.0.1') {
          return '127.0.0.1';
        }
        return socketIp.replace('::ffff:', '');
      }

      // 5. Vérifier l'ancienne API de connexion
      const connectionIp = (req.connection as any)?.remoteAddress;
      if (connectionIp) {
        if (connectionIp === '::1' || connectionIp === '::ffff:127.0.0.1') {
          return '127.0.0.1';
        }
        return connectionIp.replace('::ffff:', '');
      }

      return '127.0.0.1'; // Fallback à localhost au lieu de 'unknown'
    };

    const clientIp = extractClientIp(req);
    
    // Stocker dans l'objet request
    req.clientIp = clientIp;
    
    // Pour le développement, ajouter un header de test
    if (process.env.NODE_ENV === 'development' && !req.headers['x-forwarded-for']) {
      // Ajouter un header simulé pour les tests
      req.headers['x-test-ip'] = '192.168.1.100';
    }

    next();
  } catch (error) {
    console.error('Error in ipExtractor:', error);
    req.clientIp = '127.0.0.1'; // Toujours retourner une IP valide
    next();
  }
};

// Déclaration de type
declare global {
  namespace Express {
    interface Request {
      clientIp: string;
    }
  }
}