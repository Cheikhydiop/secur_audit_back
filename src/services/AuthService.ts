import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  ValidationError,
  DatabaseError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  ForbiddenError
} from '../errors/customErrors.js';
import { SignUpDto as Register } from '../types/auth/sign-up.js';
import { SignInDto as Login } from '../types/auth/sign-in.js';
import UserValidator from '../utils/validators/userValidator.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { EmailVerificationService } from './EmailVerificationService.js';
import { SessionRepository } from '../repositories/SessionRepository.js';
import logger from '../utils/logger.js';
import { Request } from 'express';
import { EmailService } from './EmailService.js';
import { OtpCodeRepository } from '../repositories/OtpCodeRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { PrismaClient, $Enums } from '@prisma/client';
import { DeviceDetectionService } from './DeviceDetectionService.js';
import { MultiDeviceAuthService } from './MultiDeviceAuthService.js';
import { config } from '../config/env.js';
import { WebSocketService } from './WebSocketService.js';

type UserRole = $Enums.UserRole;
type DeviceType = $Enums.DeviceType;
type SessionStatus = $Enums.SessionStatus;

// Enum values from Prisma
const UserRole = $Enums.UserRole;
const DeviceType = $Enums.DeviceType;
const SessionStatus = $Enums.SessionStatus;

/**
 * Generate a signed JWT access token
 */
function generateToken(payload: { userId: string; role: string; email: string }): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessTokenExpiry as any
  });
}

// Types pour les nouvelles fonctionnalités
interface ChangePasswordData {
  currentPassword?: string;
  newPassword: string;
  otpCode?: string;
}

interface ForgotPasswordData {
  email: string;
}

interface ResetPasswordData {
  token: string;
  newPassword: string;
}

interface VerifyOtpOnlyData {
  otpCode: string;
}

interface UpdateProfileData {
  name?: string;
  phone?: string;
}

interface DeactivateAccountData {
  reason?: string;
}

export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_WINDOW_MS = 15 * 60 * 1000;

  constructor(
    private userRepository: UserRepository,
    private emailVerificationService: EmailVerificationService,
    private sessionRepository: SessionRepository,
    private emailService: EmailService,
    private otpCodeRepository: OtpCodeRepository,
    private auditLogRepository: AuditLogRepository,
    private prisma: PrismaClient,
    private webSocketService: WebSocketService
  ) { }

  /**
   * Génère un code de parrainage à partir du nom
   */
  private generateReferralCode(name: string): string {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
  }

  /**
   * Connexion d'un utilisateur
   */
  /**
   * Connexion d'un utilisateur
   */
  async login(loginData: Login, req?: Request): Promise<{
    user: any;
    token: string;
    refreshToken: string;
    sessionId: string;
    deviceInfo: any;
    message: string;
  }> {
    try {
      // Validation des données d'entrée
      const validatedData = UserValidator.validateLogin(loginData);

      // Recherche de l'utilisateur
      const user = await this.userRepository.findByEmail(validatedData.email);

      if (!user) {
        throw new AuthenticationError('Identifiants invalides', {
          email: validatedData.email,
          reason: 'USER_NOT_FOUND',
          ipAddress: req?.ip,
          timestamp: new Date().toISOString()
        });
      }

      // Vérification du statut du compte
      if (!user.isActive) {
        throw new AuthenticationError('Compte désactivé', {
          userId: user.id,
          email: user.email,
          reason: 'ACCOUNT_INACTIVE',
          suggestion: 'Contactez le support pour réactiver votre compte'
        });
      }

      // Vérification du mot de passe
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
      if (!isPasswordValid) {
        // Enregistrement de la tentative échouée
        await this.recordFailedLoginAttempt(user.id, req);

        throw new AuthenticationError('Mot de passe incorrect', {
          userId: user.id,
          email: user.email,
          reason: 'INVALID_PASSWORD',
          suggestion: 'Réinitialisez votre mot de passe si vous l\'avez oublié'
        });
      }

      // Réinitialiser les tentatives échouées en cas de succès
      await this.resetFailedLoginAttempts(user.id);

      // Mise à jour de la dernière connexion (no-op as per repo update)
      await this.userRepository.updateLastLogin(user.id, new Date());

      // 1. Détection de l'appareil
      const detectedDevice = DeviceDetectionService.parseDeviceInfo(req?.headers['user-agent'] || '');
      const deviceInfo = {
        deviceType: detectedDevice.deviceType,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent']
      };

      const deviceId = DeviceDetectionService.generateDeviceId(
        req?.headers['user-agent'] || '',
        req?.ip || ''
      );

      // 2. Vérifier si l'appareil est connu
      const isKnownDevice = await this.sessionRepository.isKnownDevice(user.id, deviceId);
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isKnownDevice && isAdmin) {
        // 3. Vérifier s'il y a d'autres sessions actives
        const multiDeviceAuthService = new MultiDeviceAuthService(
          this.prisma,
          this.emailService,
          this.webSocketService
        );

        const { hasActiveSessions, sessions } = await multiDeviceAuthService.checkActiveSessions(user.id);

        if (isAdmin) {
          logger.info(`🔒 Vérification requise pour ${user.email} (Admin: ${isAdmin})`);

          // 4. Créer session en attente + OTP
          const { session, otpCode } = await multiDeviceAuthService.createPendingSession(
            user.id,
            detectedDevice,
            req as any
          );

          if (!user.email) {
            throw new Error('Email requis pour la vérification de l\'appareil');
          }

          // 5. Envoyer email
          await this.emailService.sendDeviceVerificationOTP(
            user.email,
            user.name || 'Utilisateur',
            otpCode,
            detectedDevice
          );

          return {
            requiresDeviceVerification: true,
            sessionId: session.id,
            existingSessions: sessions.map((s: any) => ({
              deviceName: s.deviceName,
              lastActivity: s.lastActivity
            })),
            deviceInfo: detectedDevice,
            message: 'Vérification requise'
          } as any;
        }
      }

      // === CONNEXION NORMALE ===

      // Génération des tokens
      console.log('🔍 [AuthService] Generating token with entite:', user.entite);
      const token = generateToken({
        userId: user.id,
        role: user.role,
        email: user.email,
        entite: user.entite
      } as any);
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

      // Création de la session
      const session = await this.sessionRepository.createSession({
        userId: user.id,
        refreshToken,
        deviceType: detectedDevice.deviceType as any,
        deviceName: detectedDevice.deviceName,
        deviceId: deviceId,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
        expiresAt: sessionExpiry,
        status: SessionStatus.ACTIVE,
        isVerified: true
      });

      // Application des limites de sessions
      await this.sessionRepository.enforceSessionLimits(user.id);

      // Log d'audit
      await this.auditLogRepository.create({
        action: 'USER_LOGIN',
        table: 'users',
        recordId: user.id,
        userId: user.id,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent
      });

      // Nettoyage de la réponse
      const { password, ...userWithoutPassword } = user;

      logger.info(`✅ Connexion réussie: ${user.email} (${user.id})`, {
        userId: user.id,
        ip: deviceInfo.ipAddress,
        deviceType: deviceInfo.deviceType
      });


      return {
        user: userWithoutPassword,
        token,
        refreshToken,
        sessionId: session.id,
        deviceInfo,
        message: 'Connexion réussie'
      };

    } catch (error: any) {
      if (error instanceof AuthenticationError ||
        error instanceof ValidationError ||
        error instanceof ConflictError ||
        error instanceof NotFoundError) {
        throw error;
      }

      logger.error('❌ Échec de la connexion (erreur technique)', {
        email: loginData.email,
        errorMessage: error.message,
        errorStack: error.stack,
        ip: req?.ip,
        userAgent: req?.headers['user-agent']
      });

      throw new DatabaseError(error.message, {
        operation: 'LOGIN_OPERATION',
        entity: 'USER',
        originalError: error.message
      });
    }
  }

  async verifyDevice(sessionId: string, otpCode: string): Promise<{
    user: any;
    token: string;
    refreshToken: string;
    message: string;
  }> {
    const multiDeviceAuthService = new MultiDeviceAuthService(
      this.prisma,
      this.emailService,
      this.webSocketService
    );

    const result = await multiDeviceAuthService.verifyDeviceOTP(sessionId, otpCode);

    if (!result.success || !result.session) {
      throw new AuthenticationError(result.error || 'Vérification échouée');
    }

    const { session } = result;
    const user = await this.userRepository.findById(session.userId);

    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    // Génération des tokens
    const token = generateToken({
      userId: user.id,
      role: user.role,
      email: user.email
    });

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken: session.refreshToken,
      message: 'Appareil vérifié avec succès'
    };
  }

  async resendDeviceOTP(sessionId: string): Promise<void> {
    const multiDeviceAuthService = new MultiDeviceAuthService(
      this.prisma,
      this.emailService,
      this.webSocketService
    );

    const result = await multiDeviceAuthService.resendDeviceOTP(sessionId);

    if (!result.success) {
      throw new DatabaseError(result.error || 'Erreur lors du renvoi du code');
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(userData: Register, req?: Request): Promise<{
    user: any;
    token: string;
    deviceInfo: any;
    message: string;
  }> {
    try {
      // Validation des données
      const validatedData = UserValidator.validateRegister(userData);

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await this.userRepository.findByEmail(validatedData.email);
      if (existingUser) {
        throw new ConflictError('Cet email est déjà utilisé', {
          resource: 'USER',
          conflictingField: 'email',
          value: validatedData.email
        });
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Créer l'utilisateur
      const newUser = await this.userRepository.create({
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone ?? null,
        role: UserRole.INSPECTEUR, // Rôle par défaut
        isActive: true,
        isEmailVerified: false
      });

      // Envoi de l'email de vérification
      if (newUser.email) {
        await this.emailVerificationService.sendVerificationEmail(newUser.id, newUser.email);
      }

      // Génération du token
      const token = generateToken({
        userId: newUser.id,
        role: newUser.role,
        email: newUser.email
      });

      // Extraction des infos de l'appareil
      let deviceInfo = {
        deviceType: DeviceType.UNKNOWN as DeviceType,
        ipAddress: undefined as string | undefined,
        userAgent: undefined as string | undefined
      };

      if (req) {
        const extractedInfo = this.sessionRepository.extractDeviceInfoFromRequest(req);
        deviceInfo = {
          deviceType: extractedInfo.deviceType || DeviceType.UNKNOWN,
          ipAddress: extractedInfo.ipAddress,
          userAgent: extractedInfo.userAgent
        };
      }

      // Log d'audit
      await this.auditLogRepository.create({
        action: 'USER_SIGNUP',
        table: 'users',
        recordId: newUser.id,
        userId: newUser.id,
        newData: {
          email: newUser.email,
          phone: newUser.phone,
          name: newUser.name
        },
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent
      });

      // Nettoyage de la réponse
      const { password, ...userWithoutPassword } = newUser;

      logger.info(`✅ Inscription réussie: ${newUser.email} (${newUser.id})`, {
        userId: newUser.id,
        ip: deviceInfo.ipAddress
      });

      return {
        user: userWithoutPassword,
        token,
        deviceInfo,
        message: 'Inscription réussie. Veuillez vérifier votre email.'
      };

    } catch (error: any) {
      if (error instanceof ValidationError ||
        error instanceof ConflictError ||
        error instanceof AuthenticationError ||
        error instanceof NotFoundError) {
        throw error;
      }

      logger.error('❌ Échec de l\'inscription (erreur technique)', {
        email: userData?.email,
        errorMessage: error.message,
        errorStack: error.stack,
        ip: req?.ip
      });

      throw new DatabaseError(`Une erreur technique est survenue lors de l'inscription: ${error.message}`, {
        operation: 'REGISTER_OPERATION',
        entity: 'USER',
        originalError: error.message
      });
    }
  }

  /**
   * Vérification de l'email
   */
  async verifyEmail(userId: string, otpCode: string, req?: Request): Promise<{
    user: any;
    message: string;
  }> {
    try {
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        throw new NotFoundError('Utilisateur non trouvé', { userId });
      }

      const isValid = await this.emailVerificationService.verifyOTP(existingUser.email, otpCode, 'EMAIL_VERIFICATION');

      if (!isValid) {
        throw new AuthenticationError('Code OTP invalide ou expiré', {
          userId,
          reason: 'INVALID_OTP'
        });
      }

      const user = await this.userRepository.update(userId, {
        isEmailVerified: true,
        isActive: true
      });

      const { password, ...userWithoutPassword } = user;

      await this.auditLogRepository.create({
        action: 'EMAIL_VERIFIED',
        table: 'users',
        recordId: userId,
        userId: userId
      });

      return {
        user: userWithoutPassword,
        message: 'Email vérifié avec succès. Votre compte est maintenant actif.'
      };

    } catch (error: any) {
      if (error instanceof AuthenticationError ||
        error instanceof NotFoundError) {
        throw error;
      }

      throw new DatabaseError('Erreur lors de la vérification de l\'email');
    }
  }

  /**
   * Déconnexion d'un utilisateur
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    try {
      await this.sessionRepository.revokeSession(sessionId);

      await this.auditLogRepository.create({
        action: 'USER_LOGOUT',
        table: 'sessions',
        recordId: sessionId,
        userId: userId
      });
    } catch (error: any) {
      throw new DatabaseError('Erreur lors de la déconnexion');
    }
  }

  /**
   * Rafraîchissement du token
   */
  async refreshToken(refreshToken: string, req?: Request): Promise<{
    token: string;
    refreshToken: string;
  }> {
    try {
      const session = await this.sessionRepository.findByRefreshToken(refreshToken);

      if (!session || session.expiresAt < new Date() || session.status !== SessionStatus.ACTIVE) {
        throw new AuthenticationError('Session invalide ou expirée');
      }

      const user = await this.userRepository.findById(session.userId);

      if (!user || !user.isActive) {
        throw new AuthenticationError('Compte désactivé ou introuvable');
      }

      const newToken = generateToken({
        userId: user.id,
        role: user.role,
        email: user.email
      });

      const newRefreshToken = crypto.randomBytes(40).toString('hex');
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours
      await this.sessionRepository.rotateRefreshToken(refreshToken, newRefreshToken, newExpiry);

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };

    } catch (error: any) {
      if (error instanceof AuthenticationError) throw error;
      throw new DatabaseError('Erreur lors du rafraîchissement du token');
    }
  }

  /**
   * MOT DE PASSE OUBLIÉ
   */
  async forgotPassword(data: ForgotPasswordData, req?: Request): Promise<{ message: string }> {
    try {
      const { email } = data;
      const user = await this.userRepository.findByEmail(email);

      if (!user || !user.isActive || !user.isEmailVerified) {
        return { message: 'Si cet email existe et est vérifié, un lien de réinitialisation a été envoyé.' };
      }

      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, type: 'password_reset' },
        config.jwt.secret,
        { expiresIn: '15m' }
      );

      await this.otpCodeRepository.create({
        userId: user.id,
        code: resetToken,
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      await this.sendPasswordResetEmail(user.email, user.name, resetToken);

      return { message: 'Lien de réinitialisation envoyé.' };
    } catch (error: any) {
      throw new DatabaseError('Erreur lors de la demande de réinitialisation');
    }
  }

  /**
   * RÉINITIALISATION DU MOT DE PASSE
   */
  async resetPassword(data: ResetPasswordData, req?: Request): Promise<{ message: string }> {
    try {
      const { token, newPassword } = data;

      logger.info(`🔑 Tentative de réinitialisation avec token: ${token.substring(0, 20)}...`);

      // Vérifier et décoder le token
      let decoded: any;
      try {
        decoded = jwt.verify(token, config.jwt.secret);
      } catch (error: any) {
        logger.warn(`❌ Token JWT invalide: ${error.message}`);
        throw new AuthenticationError('Token invalide ou expiré', {
          reason: 'INVALID_RESET_TOKEN'
        });
      }

      // Vérifier que c'est un token de réinitialisation
      if (!decoded.type || decoded.type !== 'password_reset') {
        logger.warn(`❌ Type de token invalide: ${decoded.type}`);
        throw new AuthenticationError('Type de token invalide', {
          reason: 'INVALID_TOKEN_TYPE'
        });
      }

      // Vérifier l'OTP
      const otpRecord = await this.otpCodeRepository.findValidToken(
        decoded.userId,
        token,
        'PASSWORD_RESET'
      );

      if (!otpRecord) {
        logger.warn(`❌ Token OTP invalide ou déjà utilisé pour l'utilisateur: ${decoded.userId}`);
        throw new AuthenticationError('Token invalide ou déjà utilisé', {
          reason: 'INVALID_OTP'
        });
      }

      logger.info(`✅ Token OTP valide trouvé pour l'utilisateur: ${decoded.userId}`);

      // Récupérer l'utilisateur
      const user = await this.userRepository.findById(decoded.userId);

      if (!user) {
        logger.warn(`❌ Utilisateur non trouvé: ${decoded.userId}`);
        throw new NotFoundError('Utilisateur non trouvé', { userId: decoded.userId });
      }

      // Vérifier si le compte est actif
      if (!user.isActive) {
        logger.warn(`❌ Compte désactivé: ${user.email}`);
        throw new AuthenticationError('Compte désactivé', {
          userId: user.id,
          reason: 'ACCOUNT_INACTIVE'
        });
      }

      logger.info(`👤 Utilisateur trouvé pour réinitialisation: ${user.email}`);

      // Hash du nouveau mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Mettre à jour le mot de passe
      await this.userRepository.updatePassword(user.id, hashedPassword);
      logger.info(`🔐 Mot de passe mis à jour pour: ${user.email}`);

      // Marquer l'OTP comme utilisé
      await this.otpCodeRepository.markAsUsed(otpRecord.id);
      logger.info(`✅ Token OTP marqué comme utilisé: ${otpRecord.id}`);

      // Révoquer toutes les sessions existantes (sécurité)
      await this.sessionRepository.revokeAllUserSessions(user.id);
      logger.info(`🔒 Toutes les sessions révoquées pour: ${user.email}`);

      // Log d'audit
      await this.auditLogRepository.create({
        action: 'PASSWORD_RESET_COMPLETED',
        table: 'users',
        recordId: user.id,
        userId: user.id,
        ipAddress: req?.ip
      });

      logger.info(`✅ Mot de passe réinitialisé pour: ${user.email}`);

      return { message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' };

    } catch (error: any) {
      if (error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw error;
      }

      logger.error('❌ Échec de la réinitialisation du mot de passe', {
        errorMessage: error.message,
        errorStack: error.stack
      });

      throw new DatabaseError('Une erreur technique est survenue. Veuillez réessayer.', {
        operation: 'RESET_PASSWORD_OPERATION',
        entity: 'USER',
        originalError: error.message
      });
    }
  }

  /**
   * CHANGEMENT DE MOT DE PASSE (quand l'utilisateur est connecté)
   */
  async changePassword(userId: string, data: ChangePasswordData, req?: Request): Promise<{ message: string }> {
    try {
      const { currentPassword, newPassword } = data;

      logger.info(`🔐 Demande de changement de mot de passe pour l'utilisateur: ${userId}`);

      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('Utilisateur non trouvé', { userId });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword!, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Mot de passe actuel incorrect');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.userRepository.updatePassword(user.id, hashedPassword);

      await this.auditLogRepository.create({
        action: 'PASSWORD_CHANGED',
        table: 'users',
        recordId: user.id,
        userId: user.id,
        ipAddress: req?.ip
      });

      return { message: 'Mot de passe changé avec succès.' };
    } catch (error: any) {
      if (error instanceof AuthenticationError || error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erreur lors du changement de mot de passe');
    }
  }

  /**
   * DEMANDER UN OTP POUR LE CHANGEMENT DE MOT DE PASSE
   */
  async requestPasswordChangeOTP(userId: string): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) throw new NotFoundError('Utilisateur non trouvé');

      const code = await this.otpCodeRepository.generateAndSave(userId, 'PASSWORD_CHANGE', 15);
      await this.emailService.sendPasswordChangeOTP(user.email, user.name, code);

      await this.auditLogRepository.create({
        action: 'PASSWORD_CHANGE_OTP_REQUESTED',
        table: 'users',
        recordId: userId,
        userId: userId
      });

      return { message: 'Un code de confirmation a été envoyé à votre adresse email.' };
    } catch (error: any) {
      logger.error('❌ Échec demande OTP changement MDP', { userId, err: error.message });
      throw new DatabaseError('Impossible d\'envoyer le code de vérification.');
    }
  }

  /**
   * CHANGER LE MOT DE PASSE AVEC OTP
   */
  async changePasswordWithOTP(userId: string, data: { otpCode: string, newPassword: string }, req?: Request): Promise<{ message: string }> {
    try {
      const { otpCode, newPassword } = data;

      const isValid = await this.otpCodeRepository.verifyAndConsume(userId, otpCode, 'PASSWORD_CHANGE');
      if (!isValid) {
        throw new AuthenticationError('Code de confirmation invalide ou expiré');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.userRepository.updatePassword(userId, hashedPassword);

      await this.auditLogRepository.create({
        action: 'PASSWORD_CHANGED_WITH_OTP',
        table: 'users',
        recordId: userId,
        userId: userId,
        ipAddress: req?.ip
      });

      return { message: 'Mot de passe modifié avec succès.' };
    } catch (error: any) {
      if (error instanceof AuthenticationError) throw error;
      throw new DatabaseError('Erreur lors de la modification du mot de passe.');
    }
  }

  /**
   * MISE À JOUR DU PROFIL
   */
  async updateProfile(userId: string, data: UpdateProfileData, req?: Request): Promise<{
    user: any;
    message: string;
  }> {
    try {
      const { name, phone } = data;

      if (phone) {
        const existingUser = await this.userRepository.findByPhone(phone);
        if (existingUser && existingUser.id !== userId) {
          throw new ConflictError('Ce numéro de téléphone est déjà utilisé');
        }
      }

      const updatedUser = await this.userRepository.update(userId, {
        ...(name && { name }),
        ...(phone && { phone })
      });

      if (!updatedUser) throw new NotFoundError('Utilisateur non trouvé');

      const { password, ...userWithoutPassword } = updatedUser;

      await this.auditLogRepository.create({
        action: 'PROFILE_UPDATED',
        table: 'users',
        recordId: userId,
        userId: userId,
        oldData: { name: userWithoutPassword.name, phone: userWithoutPassword.phone },
        newData: data,
        ipAddress: req?.ip
      });

      return {
        user: userWithoutPassword,
        message: 'Profil mis à jour avec succès'
      };
    } catch (error: any) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erreur lors de la mise à jour du profil');
    }
  }

  /**
   * DÉSACTIVATION DU COMPTE
   */
  async deactivateAccount(userId: string, data: DeactivateAccountData = {}, req?: Request): Promise<{ message: string }> {
    try {
      await this.userRepository.update(userId, { isActive: false });
      await this.sessionRepository.revokeAllUserSessions(userId);

      await this.auditLogRepository.create({
        action: 'ACCOUNT_DEACTIVATED',
        table: 'users',
        recordId: userId,
        userId: userId,
        ipAddress: req?.ip
      });

      return { message: 'Compte désactivé avec succès.' };
    } catch (error: any) {
      throw new DatabaseError('Erreur lors de la désactivation du compte');
    }
  }

  /**
   * RÉACTIVATION DU COMPTE
   */
  async reactivateAccount(email: string, password: string, req?: Request): Promise<{
    user: any;
    token: string;
    message: string;
  }> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) throw new AuthenticationError('Identifiants invalides');

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) throw new AuthenticationError('Mot de passe incorrect');

      if (user.isActive) throw new ConflictError('Le compte est déjà actif');

      const updatedUser = await this.userRepository.update(user.id, { isActive: true });
      if (!updatedUser) throw new NotFoundError('Utilisateur non trouvé');

      const token = generateToken({
        userId: updatedUser.id,
        role: updatedUser.role,
        email: updatedUser.email!,
      });

      const { password: _, ...userWithoutPassword } = updatedUser;

      await this.auditLogRepository.create({
        action: 'ACCOUNT_REACTIVATED',
        table: 'users',
        recordId: user.id,
        userId: user.id,
        ipAddress: req?.ip
      });

      return {
        user: userWithoutPassword,
        token,
        message: 'Compte réactivé avec succès.'
      };
    } catch (error: any) {
      if (error instanceof AuthenticationError || error instanceof ConflictError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Erreur lors de la réactivation du compte');
    }
  }

  /**
   * RÉCUPÉRATION DU PROFIL
   */
  async getProfile(userId: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) throw new NotFoundError('Utilisateur non trouvé');

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Erreur lors de la récupération du profil');
    }
  }

  /**
   * RÉCUPÉRATION DES SESSIONS
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await this.sessionRepository.findSessionsByUser(userId);
      return sessions.map(session => ({
        id: session.id,
        deviceType: session.deviceType,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        status: session.status
      }));
    } catch (error: any) {
      throw new DatabaseError('Erreur lors de la récupération des sessions');
    }
  }

  /**
   * RÉVOCATION D'UNE SESSION SPÉCIFIQUE
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    try {
      const session = await this.sessionRepository.findSessionById(sessionId);
      if (!session) throw new NotFoundError('Session non trouvée');

      if (session.userId !== userId) {
        throw new ForbiddenError('Vous n\'êtes pas autorisé à révoquer cette session');
      }

      await this.sessionRepository.revokeSession(sessionId);

      await this.auditLogRepository.create({
        action: 'SESSION_REVOKED',
        table: 'sessions',
        recordId: sessionId,
        userId: userId
      });
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) throw error;
      throw new DatabaseError('Erreur lors de la révocation de la session');
    }
  }

  /**
   * Vérifie l'OTP et réinitialise le flag mustChangePassword sans changer le MDP
   */
  async verifyOTPOnly(userId: string, data: VerifyOtpOnlyData, req?: Request): Promise<{ message: string }> {
    try {
      const { otpCode } = data;

      if (!otpCode) {
        throw new ValidationError('Le code OTP est requis');
      }

      // Vérifier le code
      const isValid = await this.otpCodeRepository.verifyAndConsume(userId, otpCode, 'PASSWORD_CHANGE');

      if (!isValid) {
        throw new ValidationError('Code de confirmation invalide ou expiré');
      }

      // Réinitialiser le flag mustChangePassword
      await this.prisma.user.update({
        where: { id: userId },
        data: { mustChangePassword: false }
      });

      await this.auditLogRepository.create({
        action: 'PASSWORD_CHANGE_BY_OTP_VERIFIED',
        table: 'users',
        recordId: userId,
        userId: userId,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent']
      });

      return { message: 'Identité vérifiée avec succès' };
    } catch (error: any) {
      if (error instanceof ValidationError) throw error;
      logger.error('❌ Erreur lors de la vérification OTP seule:', error);
      throw new DatabaseError('Erreur lors de la vérification du code');
    }
  }


  // ==================== MÉTHODES PRIVÉES ====================

  private async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
    await this.emailService.sendPasswordResetEmail(email, name, resetToken);
  }

  private async recordFailedLoginAttempt(userId: string, req?: Request): Promise<void> {
    logger.warn(`⚠️ Échec de connexion pour ${userId}`);
  }

  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    // No-op
  }
}