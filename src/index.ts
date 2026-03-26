import 'reflect-metadata';
import express from 'express';
import { Container } from 'typedi';
console.log('🚀 Backend script started...');
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import http from 'http';
import { WebSocketService } from './services/WebSocketService.js';



// Swagger
import { swaggerSpec } from './config/swagger.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import siteRoutes from './routes/site.routes.js';
import inspectionRoutes from './routes/inspection.routes.js';
import questionRoutes from './routes/question.routes.js';
import actionRoutes from './routes/action.routes.js';
import planningRoutes from './routes/planning.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import rapportRoutes from './routes/rapport.routes.js';
import logRoutes from './routes/log.routes.js';
import adminRoutes from './routes/admin.routes.js';
import photoRoutes from './routes/photo.routes.js';
import notificationRoutes from './routes/notificationRoutes.js';

import { initializeServices } from './container/ServiceContainer.js';

dotenv.config();

// Initialisation du container de services
try {
  await initializeServices();
} catch (error) {
  console.error('Failed to initialize services:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globaux ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
// Compression niveau 6 (optimal perf/cpu), seulement si > 1ko
app.use(compression({ level: 6, threshold: 1024 }));
// Limiter le corps des requêtes à 10mb (protection DoS — 50mb était trop large)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// En production : format compact ; en développement : format lisible
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Routes API ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rapports', rapportRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Route santé ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    project: 'Questionnaire de Contrôle des Sites SONATEL API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Swagger Documentation ─────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Gestionnaire 404 (doit être après toutes les routes) ─────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'NotFoundError',
      message: `Route ${_req.method} ${_req.path} non trouvée`,
      code: 'ROUTE_NOT_FOUND',
    },
  });
});

// ─── Démarrage serveur avec HTTP keep-alive ────────────────────────────────────
const server = http.createServer(app);

// keep-alive > timeout des load-balancers courants (~30% gain perf réseau)
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// Initialisation des WebSockets
Container.get(WebSocketService).initialize(server);

server.listen(PORT, () => {



  console.log(`\n🚀 Questionnaire de Contrôle des Sites SONATEL API démarrée sur http://localhost:${PORT}`);
  console.log(`📋 Environnement : ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 Documentation Swagger : http://localhost:${PORT}/api-docs`);
  console.log(`🔧 Pool PostgreSQL : max=${process.env.DB_POOL_MAX || 10} connexions`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = (signal: string) => {
  console.log(`\n🛑 ${signal} reçu — arrêt propre en cours...`);
  server.close(() => {
    console.log('✅ Serveur HTTP fermé proprement');
    process.exit(0);
  });
  // Forcer l'arrêt après 10s si quelque chose bloque
  setTimeout(() => { process.exit(1); }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;