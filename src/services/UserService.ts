import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/tokenUtils.js';
import {
  ValidationError,
  DatabaseError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ConflictError
} from '../errors/customErrors.js';
import { SignUpDto as Register } from '../types/auth/sign-up.js';
import { SignInDto as Login } from '../types/auth/sign-in.js';
import { UserRepository } from '../repositories/UserRepository.js'; // Vérifiez ce chemin
import { EmailVerificationService } from './EmailVerificationService.js';
import { SessionRepository, DeviceType, SessionStatus } from '../repositories/SessionRepository.js';
import logger from '../utils/logger.js';
import { Request } from 'express';
import { RateLimitUtils } from '../utils/RateLimitInfo.js';

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailVerificationService: EmailVerificationService,
    private sessionRepository: SessionRepository,
    private prisma: PrismaClient // Injected for complex queries/aggregations not yet in repositories
  ) {
    logger.info('UserService initialized');
  }

  /**
   * Récupère un utilisateur par son ID
   */
  async getUserById(userId: string) {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('Utilisateur non trouvé');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Error fetching user', error);
      throw new DatabaseError('Erreur lors de la récupération de l\'utilisateur');
    }
  }

  /**
   * Recherche un utilisateur par son numéro de téléphone
   */
  async findByPhone(phone: string) {
    try {
      const user = await this.userRepository.findByPhone(phone);
      if (!user) {
        throw new NotFoundError('Aucun utilisateur trouvé avec ce numéro');
      }
      return {
        id: user.id,
        name: user.name,
        phone: user.phone
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Error finding user by phone', error);
      throw new DatabaseError('Erreur lors de la recherche de l\'utilisateur');
    }
  }

  /**
   * Liste tous les utilisateurs (Admin)
   */
  async listUsers(limit: number = 20, offset: number = 0) {
    try {
      const page = Math.floor(offset / limit) + 1;
      const result = await this.userRepository.findAll(page, limit);
      return result;
    } catch (error) {
      logger.error('Error listing users', error);
      throw new DatabaseError('Erreur lors du listing des utilisateurs');
    }
  }

  /**
   * Récupère les statistiques de base d'un utilisateur
   */
  async getUserStats(userId: string) {
    try {
      const [inspectionsCount, actionsCount] = await Promise.all([
        this.prisma.inspection.count({ where: { inspecteurId: userId } }),
        this.prisma.actionPlan.count({ where: { responsableId: userId } })
      ]);

      return {
        totalInspections: inspectionsCount,
        totalActions: actionsCount
      };
    } catch (error) {
      logger.error('Error getting user stats', error);
      throw new DatabaseError('Erreur lors du calcul des statistiques');
    }
  }

  /**
   * Placeholder for referrals (removed as per schema)
   */
  async getReferrals(_userId: string) {
    return [];
  }

  /**
   * Met à jour les informations d'un utilisateur
   */
  async updateUser(userId: string, data: any) {
    try {
      const user = await this.userRepository.update(userId, data);
      logger.info(`User updated: ${userId}`);
      return user;
    } catch (error) {
      logger.error('Error updating user', error);
      throw new DatabaseError('Erreur lors de la mise à jour de l\'utilisateur');
    }
  }

  /**
   * Change le mot de passe d'un utilisateur
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('Utilisateur non trouvé');
      }

      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Mot de passe actuel incorrect');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.userRepository.updatePassword(userId, hashedPassword);

      logger.info(`Password changed for user: ${userId}`);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthenticationError) throw error;
      logger.error('Error changing password', error);
      throw new DatabaseError('Erreur lors du changement de mot de passe');
    }
  }

  /**
   * Désactive un compte utilisateur
   */
  async deactivateAccount(userId: string) {
    try {
      await this.userRepository.update(userId, { isActive: false });
      logger.info(`Account deactivated: ${userId}`);
    } catch (error) {
      logger.error('Error deactivating account', error);
      throw new DatabaseError('Erreur lors de la désactivation du compte');
    }
  }

  /**
   * Réactive un compte utilisateur
   */
  async reactivateAccount(userId: string) {
    try {
      await this.userRepository.update(userId, { isActive: true });
      logger.info(`Account reactivated: ${userId}`);
    } catch (error) {
      logger.error('Error reactivating account', error);
      throw new DatabaseError('Erreur lors de la réactivation du compte');
    }
  }

  /**
   * Supprime un utilisateur (Admin)
   */
  async deleteUser(userId: string) {
    try {
      await this.userRepository.delete(userId);
      logger.info(`User deleted: ${userId}`);
    } catch (error) {
      logger.error('Error deleting user', error);
      throw new DatabaseError('Erreur lors de la suppression de l\'utilisateur');
    }
  }
}