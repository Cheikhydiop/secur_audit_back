/**
 * InvitationController — SmartAudit DG-SECU/Sonatel
 * PB-015 : Système d'invitation par email
 */
import { Request, Response, NextFunction } from 'express';
import { InvitationService } from '../services/InvitationService.js';
import { EmailService } from '../services/EmailService.js';
import prisma from '../config/prismaClient.js';

const emailService = new EmailService();
const invitationService = new InvitationService(prisma, emailService);

export class InvitationController {

  /**
   * POST /api/auth/invite
   * Super-Admin invite un utilisateur par email
   */
  static async invite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, role, name, entite } = req.body;
      const invitedById = (req as any).user?.id;

      if (!email || !role) {
        res.status(400).json({ success: false, message: 'Email et rôle requis' });
        return;
      }

      const validRoles = ['ADMIN', 'INSPECTEUR', 'DIRIGEANT'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ success: false, message: `Rôle invalide. Valeurs acceptées: ${validRoles.join(', ')}` });
        return;
      }

      // Validation de l'entité (si fournie)
      const validEntites = ['SEC', 'CPS', 'SUR'];
      if (entite && !validEntites.includes(entite)) {
        res.status(400).json({ success: false, message: `Entité invalide. Valeurs acceptées: ${validEntites.join(', ')}` });
        return;
      }

      await invitationService.inviteUser({ email, role, name, entite }, invitedById);

      res.status(201).json({
        success: true,
        message: `Invitation envoyée à ${email}. Le lien est valable 48 heures.`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/activate
   * Activation du compte depuis le lien d'invitation
   */
  static async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, name, password } = req.body;

      if (!token || !name || !password) {
        res.status(400).json({ success: false, message: 'Token, nom et mot de passe requis' });
        return;
      }

      const result = await invitationService.activateAccount({ token, name, password });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:id/resend-invitation
   * Renvoyer l'invitation (si token expiré)
   */
  static async resendInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params['id'] as string;
      await invitationService.resendInvitation(userId);
      res.status(200).json({ success: true, message: 'Invitation renvoyée avec succès' });
    } catch (error) {
      next(error);
    }
  }
}
