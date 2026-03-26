import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware de cache HTTP avec ETags
 * Réduit la bande passante pour les réponses GET qui n'ont pas changé.
 * Le client envoie son ETag, si la donnée n'a pas changé → 304 Not Modified.
 *
 * Usage : app.use(cacheMiddleware()) ou router.get('/route', cacheMiddleware(60), handler)
 * @param maxAgeSeconds  - Durée de cache navigateur (default: 0 = no-store pour API)
 * @param privateCaching - true = cache navigateur seulement (pas de CDN)
 */
export function cacheMiddleware(
    maxAgeSeconds: number = 0,
    privateCaching: boolean = true
) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Ne s'applique qu'aux requêtes GET/HEAD
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return next();
        }

        const originalJson = res.json.bind(res);

        res.json = function (body: any) {
            try {
                const bodyStr = JSON.stringify(body);
                const etag = `"${crypto.createHash('sha1').update(bodyStr).digest('hex').slice(0, 16)}"`;

                res.setHeader('ETag', etag);

                if (maxAgeSeconds > 0) {
                    const cacheControl = privateCaching
                        ? `private, max-age=${maxAgeSeconds}`
                        : `public, max-age=${maxAgeSeconds}`;
                    res.setHeader('Cache-Control', cacheControl);
                } else {
                    // Par défaut : pas de mise en cache côté CDN, mais ETag activé
                    res.setHeader('Cache-Control', 'no-cache');
                }

                // Vérifier si le client a déjà cette version
                const clientEtag = req.headers['if-none-match'];
                if (clientEtag === etag) {
                    res.removeHeader('Content-Type');
                    res.removeHeader('Content-Length');
                    res.status(304).end();
                    return res;
                }
            } catch {
                // En cas d'erreur de sérialisation, continuer normalement
            }

            return originalJson(body);
        };

        next();
    };
}

/**
 * Middleware pour désactiver explicitement le cache (mutations)
 */
export function noCache(req: Request, res: Response, next: NextFunction) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
}
