import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { InvitationController } from '../controllers/InvitationController.js';
import { requireAuth, authorizeRoles, requirePasswordChanged } from '../middlewares/authMiddleware.js';
import { audit } from '../middlewares/AuditMiddleware.js';

const router = Router();
const ctrl = new AuthController();

// ─── Authentification ──────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur
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
 *                 example: admin@sonatel.sn
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin123!
 *     responses:
 *       200:
 *         description: Connexion réussie
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
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Identifiants invalides
 */
router.post('/login', audit.login(), ctrl.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Déconnexion utilisateur
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
router.post('/logout', requireAuth, audit.logout(), ctrl.logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/profile', requireAuth, ctrl.getProfile);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rafraîchir le token d'accès
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nouveau token d'accès
 */
router.post('/refresh', ctrl.refreshToken);
router.post('/verify-device', ctrl.verifyDevice);
router.post('/resend-device-otp', ctrl.resendDeviceOTP);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Demander la réinitialisation du mot de passe
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email de réinitialisation envoyé
 */
router.post('/forgot-password', ctrl.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé
 */
router.post('/reset-password', ctrl.resetPassword);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Changer le mot de passe
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mot de passe changé
 */
router.post('/change-password', requireAuth, audit.changePassword(), ctrl.changePassword);

/**
 * @swagger
 * /api/auth/request-password-change-otp:
 *   post:
 *     summary: Demander un OTP pour changer le mot de passe
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP envoyé par email
 */
router.post('/request-password-change-otp', requireAuth, ctrl.requestPasswordChangeOTP);

/**
 * @swagger
 * /api/auth/change-password-otp:
 *   post:
 *     summary: Changer le mot de passe avec un OTP
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otpCode
 *               - newPassword
 *             properties:
 *               otpCode:
 *                 type: string
 *               newPassword:
 *                 type: string
 *         description: Mot de passe changé
 */
router.post('/change-password-otp', requireAuth, audit.changePassword(), ctrl.changePasswordWithOTP);
router.post('/verify-otp-only', requireAuth, ctrl.verifyOTPOnly);

// ─── Invitation (PB-015) ───────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/invite:
 *   post:
 *     summary: Inviter un nouvel utilisateur (Super Admin ou Admin uniquement)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [SUPER_ADMIN, ADMIN, INSPECTEUR, DIRIGEANT]
 *     responses:
 *       201:
 *         description: Invitation envoyée
 */
router.post('/invite', requireAuth, authorizeRoles('SUPER_ADMIN', 'ADMIN'), audit.inviteUser(), InvitationController.invite);

/**
 * @swagger
 * /api/auth/activate:
 *   post:
 *     summary: Activer un compte depuis le lien d'invitation
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Compte activé
 */
router.post('/activate', InvitationController.activate);

// ─── Vérification email ────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   get:
 *     summary: Vérifier l'email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email vérifié
 */
router.get('/verify-email/:token', ctrl.verifyEmail);

// ─── Gestion des sessions ───────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Récupérer les sessions actives de l'utilisateur
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions récupérées
 */
router.get('/sessions', requireAuth, ctrl.getSessions);

/**
 * @swagger
 * /api/auth/sessions/{sessionId}:
 *   delete:
 *     summary: Révoquer une session spécifique
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session révoquée
 */
router.delete('/sessions/:sessionId', requireAuth, ctrl.revokeSession);

export default router;
