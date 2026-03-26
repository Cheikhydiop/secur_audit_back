import express from 'express';
import { Container } from 'typedi';
import { AuthController } from '../controllers/AuthController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { rateLimitMiddleware, rateLimitConfigs } from '../middlewares/rateLimitMiddleware.js';
import { ServiceContainer } from '../container/ServiceContainer.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { AuditMiddleware } from '../middlewares/AuditMiddleware.js';
import { AuditService } from '../services/AuditService.js';

export const createAuthRoutes = () => {
  const router = express.Router();
  const authController = Container.get(AuthController);
  const auditMiddleware = new AuditMiddleware(Container.get(AuditService));

  // ==================== ROUTES PUBLIQUES ====================

  // ==================== ROUTES PUBLIQUES ====================

  /**
   * @swagger
   * tags:
   *   name: Auth
   *   description: Authentication management
   */

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *               - name
   *               - phone
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 6
   *               name:
   *                 type: string
   *               phone:
   *                 type: string
   *     responses:
   *       201:
   *         description: User successfully registered
   *       400:
   *         description: Validation error
   */
  // Inscription
  router.post(
    '/register',
    rateLimitMiddleware(rateLimitConfigs.register),
    auditMiddleware.auditUserRegister(),
    asyncHandler(authController.register)
  );

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 accessToken:
   *                   type: string
   *                 refreshToken:
   *                   type: string
   *                 user:
   *                   type: object
   *       401:
   *         description: Invalid credentials
   */
  // Connexion
  router.post(
    '/login',
    rateLimitMiddleware(rateLimitConfigs.login),
    auditMiddleware.auditUserLogin(),
    auditMiddleware.auditFailedLogin(),
    asyncHandler(authController.login)
  );

  /**
   * @swagger
   * /api/auth/verify-email:
   *   post:
   *     summary: Verify email address
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *             properties:
   *               token:
   *                 type: string
   *     responses:
   *       200:
   *         description: Email verified successfully
   *       400:
   *         description: Invalid or expired token
   */
  // Vérification email
  router.post(
    '/verify-email',
    rateLimitMiddleware(rateLimitConfigs.verifyEmail),
    asyncHandler(authController.verifyEmail)
  );

  // Renvoyer code de vérification
  router.post(
    '/resend-verification',
    rateLimitMiddleware(rateLimitConfigs.verifyEmail),
    asyncHandler(authController.resendVerificationCode)
  );

  // Vérifier appareil (multi-device)
  router.post(
    '/verify-device',
    rateLimitMiddleware(rateLimitConfigs.verifyEmail),
    asyncHandler(authController.verifyDevice)
  );

  // Renvoyer code OTP appareil
  router.post(
    '/resend-device-otp',
    rateLimitMiddleware(rateLimitConfigs.verifyEmail),
    asyncHandler(authController.resendDeviceOTP)
  );

  // Rafraîchissement token
  router.post(
    '/refresh-token',
    asyncHandler(authController.refreshToken)
  );

  // Mot de passe oublié
  router.post(
    '/forgot-password',
    rateLimitMiddleware(rateLimitConfigs.forgotPassword),
    asyncHandler(authController.forgotPassword)
  );

  // Réinitialisation mot de passe
  router.post(
    '/reset-password',
    rateLimitMiddleware(rateLimitConfigs.resetPassword),
    asyncHandler(authController.resetPassword)
  );

  // Réactivation compte
  router.post(
    '/reactivate',
    asyncHandler(authController.reactivateAccount)
  );

  // ==================== ROUTES PROTÉGÉES ====================

  // Déconnexion
  router.post(
    '/logout',
    requireAuth,
    asyncHandler(authController.logout)
  );

  // Mise à jour profil
  router.put(
    '/profile',
    requireAuth,
    asyncHandler(authController.updateProfile)
  );

  // Récupération profil
  router.get(
    '/profile',
    requireAuth,
    asyncHandler(authController.getProfile)
  );

  // Changement mot de passe
  router.post(
    '/change-password',
    requireAuth,
    auditMiddleware.auditPasswordChange(),
    asyncHandler(authController.changePassword)
  );

  // Désactivation compte
  router.post(
    '/deactivate',
    requireAuth,
    asyncHandler(authController.deactivateAccount)
  );

  // Liste sessions
  router.get(
    '/sessions',
    requireAuth,
    asyncHandler(authController.getSessions)
  );

  // Révocation session spécifique
  router.delete(
    '/sessions/:sessionId',
    requireAuth,
    asyncHandler(authController.revokeSession)
  );

  // Révocation toutes les sessions
  router.delete(
    '/sessions',
    requireAuth,
    asyncHandler(authController.revokeAllSessions)
  );

  // ==================== ROUTES ADMIN ====================

  // Routes admin seulement
  router.get(
    '/admin/users',
    requireRole('ADMIN'),
    asyncHandler(authController.getProfile) // À remplacer par une vraie méthode admin
  );

  // ==================== ROUTES DE TEST ====================

  // Route de test pour le rate limiting (développement uniquement)
  if (process.env.NODE_ENV === 'development') {
    router.get('/rate-limit-test', (req, res) => {
      const rateLimitInfo = (req as any).rateLimitInfo;

      res.json({
        success: true,
        message: 'Rate limit test',
        data: {
          clientIp: req.ip,
          rateLimitInfo: rateLimitInfo || 'No rate limit info',
          headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'user-agent': req.headers['user-agent']
          }
        }
      });
    });

    // Route de test d'authentification
    router.get('/auth-test', requireAuth, (req, res) => {
      res.json({
        success: true,
        message: 'Authentification réussie',
        data: {
          user: req.user
        }
      });
    });

    // Route de test de rôle admin
    router.get('/admin-test', requireRole('ADMIN'), (req, res) => {
      res.json({
        success: true,
        message: 'Accès admin autorisé',
        data: {
          user: req.user
        }
      });
    });
  }

  return router;
};