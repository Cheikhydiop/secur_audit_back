import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Middleware d'authentification JWT
 * Vérifie le token Bearer dans le header Authorization
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Token manquant ou invalide' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-production');
        (req as any).user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token expiré ou invalide' });
    }
};
