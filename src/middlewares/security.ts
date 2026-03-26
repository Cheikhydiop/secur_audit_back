import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import logger  from '../utils/logger.js';

export const securityHeaders = [
  // Configuration de base de Helmet
  helmet(),

  // Politique de sécurité du contenu adaptée pour une app de paris
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // À remplacer en prod si possible
        "'unsafe-eval'", // Nécessaire pour certains frameworks
        'https://maps.googleapis.com', // Pour les localisations de combats
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: [
        "'self'",
        'data:',
        'https:',
        'blob:', // Pour les images de profils/fighters
      ],
      connectSrc: [
        "'self'",
        'wss:', // Pour les mises à jour en temps réel des combats
        'https://api.orange-sonatel.com', // Pour les paiements mobiles
        'https://api.wave.sn', // Pour les paiements Wave
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      frameSrc: ["'none'"], // Empêche l'embedding malveillant
      mediaSrc: ["'self'", 'blob:'], // Pour les vidéos/streaming de combats
      objectSrc: ["'none'"],
      workerSrc: ["'self'", 'blob:'],
      childSrc: ["'self'", 'blob:'],
      sandbox: [
        'allow-forms',
        'allow-scripts',
        'allow-same-origin',
        'allow-popups', // Pour les paiements externes
      ],
      upgradeInsecureRequests: [],
      formAction: ["'self'"], // Restreint les soumissions de formulaires
    },
    reportOnly: process.env.NODE_ENV === 'development',
  }),

  // Protection HSTS (seulement en production)
  ...(process.env.NODE_ENV === 'production'
    ? [
        helmet.hsts({
          maxAge: 31536000, // 1 an
          includeSubDomains: true,
          preload: true,
        }),
      ]
    : []),

  // Autres headers de sécurité
  helmet.dnsPrefetchControl({ allow: false }),
  helmet.frameguard({ action: 'deny' }), // Anti-clickjacking crucial pour les transactions
  helmet.ieNoOpen(),
  helmet.noSniff(),
  helmet.permittedCrossDomainPolicies({ permittedPolicies: 'none' }),
  helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }),
  helmet.xssFilter(),

  // Headers personnalisés pour l'application de paris
  (req: Request, res: Response, next: NextFunction) => {
    // Permissions-Policy adaptée aux besoins des paris
    res.setHeader(
      'Permissions-Policy',
      [
        'geolocation=()', // Désactivé sauf si nécessaire pour localiser les combats
        'camera=()',
        'microphone=()',
        'payment=(self https://api.orange-sonatel.com https://api.wave.sn)', // APIs de paiement autorisées
        'accelerometer=()',
        'gyroscope=()',
        'magnetometer=()',
        'picture-in-picture=()',
        'sync-xhr=()',
        'usb=()',
        'interest-cohort=()', // Désactive FLoC
      ].join(', ')
    );

    // Politiques de sécurité cross-origin
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    // Gestion du cache pour les données sensibles
    if (
      req.path.startsWith('/api/v1/wallet') ||
      req.path.startsWith('/api/v1/transactions') ||
      req.path.startsWith('/api/v1/bets')
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Sécurité des sessions
    if (req.path === '/api/v1/auth/logout') {
      res.setHeader('Clear-Site-Data', '"cache","cookies","storage"');
    }

    // Protection contre les attaques de type MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Header pour les API (facultatif mais utile)
    res.setHeader('X-API-Version', '1.0.0');

    next();
  },
];

// Middleware pour les rapports de violation CSP
export const cspViolationReport = (req: Request, res: Response) => {
  try {
    const violation = req.body;
    const clientIp = req.ip || req.socket.remoteAddress;
    
    // AppLogger.warn('CSP Violation Report', {
    //   violation,
    //   clientIp,
    //   userAgent: req.get('User-Agent'),
    //   path: req.path,
    //   timestamp: new Date().toISOString(),
    // });

    // En production, vous pourriez stocker ces violations en base
    // pour analyse des attaques
    if (process.env.NODE_ENV === 'production') {
      // TODO: Stocker en base de données pour monitoring
      // Voir modèle AuditLog pour structure potentielle
    }

    res.status(204).end();
  } catch (error) {
    logger.error('Error processing CSP violation report', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware de sécurité additionnel pour les routes sensibles
export const transactionSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Vérification des headers pour les transactions
  const requiredHeaders = [
    'X-Request-ID',
    'User-Agent',
    'Content-Type',
  ];

  const missingHeaders = requiredHeaders.filter(header => !req.get(header));
  
  if (missingHeaders.length > 0 && req.path.includes('/transactions')) {
    // AppLogger.warn('Missing security headers for transaction', {
    //   path: req.path,
    //   missingHeaders,
    //   ip: req.ip,
    // });
    
    return res.status(400).json({
      success: false,
      error: 'Missing required headers',
      missingHeaders,
    });
  }

  // Rate limiting implicite pour les transactions
  if (req.path.includes('/transactions') || req.path.includes('/withdraw')) {
    // Ici, vous pourriez intégrer un système de rate limiting
    // basé sur l'IP ou l'utilisateur
    logger.info(`Transaction attempt from ${req.ip}`, {
      userId: req.user?.id, // Supposant que l'utilisateur est attaché à req
      path: req.path,
      method: req.method,
    });
  }

  next();
};

// Middleware pour la sécurité des WebSockets (si utilisé pour les mises à jour en temps réel)
export const websocketSecurity = (ws: any, req: Request) => {
  // Validation de l'origine WebSocket
  const allowedOrigins = [
    'https://votre-domaine.com',
    'https://www.votre-domaine.com',
  ];
  
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    ws.close(1008, 'Origin not allowed');
    return;
  }

  // Vérification du token d'authentification
  const token = req.query.token as string;
  if (!token) {
    ws.close(1008, 'Authentication required');
    return;
  }

  // Logging des connexions WebSocket
  logger.info('WebSocket connection established', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
  });
};