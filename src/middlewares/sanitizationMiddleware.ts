import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

/**
 * Configure xss options
 */
const xssOptions = {
    whiteList: {}, // Empty whitelist means strip all tags
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
};

/**
 * Clean a value recursively
 */
const cleanValue = (value: any): any => {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
        return xss(value, xssOptions);
    }

    if (Array.isArray(value)) {
        return value.map(cleanValue);
    }

    if (typeof value === 'object') {
        const cleaned: any = {};
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                cleaned[key] = cleanValue(value[key]);
            }
        }
        return cleaned;
    }

    return value;
};

/**
 * Middleware to sanitize request body, query, and params against XSS
 */
export const sanitizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.body) req.body = cleanValue(req.body);

        if (req.query) {
            const cleaned = cleanValue(req.query);
            // Don't reassign req.query directly as it might be read-only
            Object.keys(req.query).forEach(key => {
                delete (req.query as any)[key];
            });
            Object.assign(req.query, cleaned);
        }

        if (req.params) {
            const cleaned = cleanValue(req.params);
            // Don't reassign req.params directly
            Object.keys(req.params).forEach(key => {
                (req.params as any)[key] = cleaned[key];
            });
        }
    } catch (error) {
        console.error('Sanitization error:', error);
    } // Continue even if sanitization fails slightly, or just log

    next();
};
