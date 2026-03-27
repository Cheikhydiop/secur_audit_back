import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { Container } from 'typedi';
import logger from '../utils/logger.js';

export class AuthController {
  private get authService(): AuthService {
    return Container.get(AuthService);
  }

  // POST /api/auth/login
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body, req);
      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/verify-device
  verifyDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId, otpCode } = req.body;
      const result = await this.authService.verifyDevice(sessionId, otpCode);
      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/resend-device-otp
  resendDeviceOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId } = req.body;
      await this.authService.resendDeviceOTP(sessionId);
      res.json({
        success: true,
        message: 'Nouveau code envoyé avec succès'
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/logout
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const sessionId = (req as any).sessionId; // Assuming middleware sets this

      if (userId && sessionId) {
        await this.authService.logout(userId, sessionId);
      }

      res.json({ success: true, message: 'Déconnexion réussie' });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/auth/profile
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Non authentifié' });
        return;
      }
      const user = await this.authService.getProfile(userId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/refresh
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken, req);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/forgot-password
  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.forgotPassword(req.body, req);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/reset-password
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.resetPassword(req.body, req);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/change-password
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const result = await this.authService.changePassword(userId, req.body, req);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/request-password-change-otp
  requestPasswordChangeOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const result = await this.authService.requestPasswordChangeOTP(userId);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/change-password-otp
  changePasswordWithOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const result = await this.authService.changePasswordWithOTP(userId, req.body, req);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/verify-otp-only
  verifyOTPOnly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const result = await this.authService.verifyOTPOnly(userId, req.body, req);
      res.json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  };



  // GET /api/auth/verify-email/:token
  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const userId = req.query.userId ? String(req.query.userId) : '';
      const result = await this.authService.verifyEmail(userId, String(token || ''), req);
      res.json({ success: true, message: result.message, data: result.user });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/auth/sessions
  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Non authentifié' });
        return;
      }
      const sessions = await this.authService.getUserSessions(userId);
      res.json({ success: true, data: sessions });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/auth/sessions/:sessionId
  revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const { sessionId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Non authentifié' });
        return;
      }

      await this.authService.revokeSession(userId, String(sessionId));
      res.json({ success: true, message: 'Session révoquée avec succès' });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/register
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body, req);
      res.status(201).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/resend-verification
  resendVerificationCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const user = await (this.authService as any).userRepository.findByEmail(email);
      if (user) {
        await (this.authService as any).emailVerificationService.sendVerificationEmail(user.id, user.email);
      }
      res.json({ success: true, message: 'Code de vérification renvoyé' });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/auth/profile
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const result = await this.authService.updateProfile(userId, req.body, req);
      res.json({ success: true, data: result.user, message: result.message });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/deactivate
  deactivateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      await (this.authService as any).deactivateAccount(userId, req.body, req);
      res.json({ success: true, message: 'Compte désactivé avec succès' });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/reactivate
  reactivateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      await (this.authService as any).reactivateAccount(email, password, req);
      res.json({ success: true, message: 'Demande de réactivation envoyée' });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/auth/sessions
  revokeAllSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Non authentifié' });
        return;
      }
      await (this.authService as any).sessionRepository.revokeAllUserSessions(userId);
      res.json({ success: true, message: 'Toutes les sessions ont été révoquées' });
    } catch (error) {
      next(error);
    }
  };
}
