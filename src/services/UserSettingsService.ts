/**
 * UserSettingsService — SmartAudit DG-SECU/Sonatel
 * Gestion des paramètres utilisateur
 */
import prisma from '../config/prismaClient.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../errors/customErrors.js';
import UserValidator from '../utils/validators/userValidator.js';

export class UserSettingsService {

  /**
   * Récupérer les paramètres d'un utilisateur
   */
  async getUserSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) throw new NotFoundError('Utilisateur introuvable');
    return user;
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Utilisateur introuvable');

    const updateData: any = {};

    if (data.name) {
      updateData.name = UserValidator.sanitizeName(data.name);
    }

    if (data.phone !== undefined) {
      if (data.phone && !UserValidator.isValidPhone(data.phone)) {
        throw new ValidationError('Numéro de téléphone invalide');
      }
      updateData.phone = data.phone || null;
    }

    return await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        updatedAt: true,
      }
    });
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Utilisateur introuvable');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new ValidationError('Mot de passe actuel incorrect');

    const validation = UserValidator.validatePassword(newPassword);
    if (!validation.valid) throw new ValidationError(validation.errors.join('. '));

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      }
    });

    return { message: 'Mot de passe modifié avec succès' };
  }

  /**
   * Mettre à jour les préférences utilisateur (Placeholder)
   */
  async updatePreferences(userId: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('Utilisateur introuvable');

    logger.info(`Préférences mises à jour pour ${userId}:`, data);
    return { success: true, message: 'Préférences enregistrées' };
  }
}
