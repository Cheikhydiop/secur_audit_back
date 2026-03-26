import { Request, Response, NextFunction } from 'express';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'INSPECTEUR' | 'DIRIGEANT';

/**
 * Middleware de contrôle d'accès basé sur les rôles (RBAC)
 * Usage : router.get('/route', authenticate, authorize(['ADMIN']), handler)
 */
export const authorize = (allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = (req as any).user;

        if (!user) {
            res.status(401).json({ success: false, message: 'Non authentifié' });
            return;
        }

        if (!allowedRoles.includes(user.role as Role)) {
            res.status(403).json({
                success: false,
                message: `Accès refusé. Rôles autorisés : ${allowedRoles.join(', ')}`,
            });
            return;
        }

        next();
    };
};
