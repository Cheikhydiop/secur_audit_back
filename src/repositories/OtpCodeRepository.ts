import { PrismaClient } from '@prisma/client';
import { Service } from 'typedi';

export interface CreateOtpCodeData {
  userId: string;
  code: string;
  purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'PHONE_VERIFICATION' | 'LOGIN' | 'PASSWORD_CHANGE';
  expiresAt: Date;
}

export interface UpdateOtpCodeData {
  consumed?: boolean;
  consumedAt?: Date;
}

@Service()
export class OtpCodeRepository {
  constructor(private prisma: PrismaClient) { }

  /**
   * Créer un code OTP
   */
  async create(data: CreateOtpCodeData) {
    try {
      return await this.prisma.otpCode.create({
        data: {
          userId: data.userId,
          code: data.code,
          purpose: data.purpose,
          expiresAt: data.expiresAt,
          consumed: false,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la création du code OTP:', error);
      throw error;
    }
  }

  /**
   * Trouver un code OTP valide par utilisateur et code
   */
  async findValidToken(userId: string, code: string, purpose?: string) {
    try {
      const now = new Date();

      const whereCondition: any = {
        userId,
        code,
        consumed: false,
        expiresAt: { gt: now }
      };

      if (purpose) {
        whereCondition.purpose = purpose;
      }

      return await this.prisma.otpCode.findFirst({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              isActive: true,
              isEmailVerified: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la recherche du token OTP:', error);
      throw error;
    }
  }

  /**
   * Trouver un code OTP par ID
   */
  async findById(id: string) {
    try {
      return await this.prisma.otpCode.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la recherche du code OTP par ID:', error);
      throw error;
    }
  }

  /**
   * Marquer un code OTP comme utilisé
   */
  // /home/diop/Musique/Xbeur/inesic-api/src/repositories/OtpCodeRepository.ts

  async markAsUsed(id: string) {
    try {
      return await this.prisma.otpCode.update({
        where: { id },
        data: {
          consumed: true, // Ceci est le seul champ requis par Prisma
          // SUPPRIMER LA LIGNE SUIVANTE : consumedAt: new Date(),
        }
      });
    } catch (error: any) {
      // Il semble que vous ayez déjà une fonction de log d'erreur ici, 
      // assurez-vous de lancer la bonne erreur si nécessaire.
      throw error;
    }
  }
  /**
   * Supprimer les codes OTP d'un utilisateur
   */
  async deleteUserTokens(userId: string, purpose?: string) {
    try {
      const whereCondition: any = { userId };

      if (purpose) {
        whereCondition.purpose = purpose;
      }

      return await this.prisma.otpCode.deleteMany({
        where: whereCondition
      });
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des codes OTP:', error);
      throw error;
    }
  }

  /**
   * Supprimer les codes OTP expirés
   */
  async deleteExpiredTokens() {
    try {
      const now = new Date();

      return await this.prisma.otpCode.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { consumed: true }
          ]
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des codes OTP expirés:', error);
      throw error;
    }
  }

  /**
   * Vérifier si un code OTP est valide
   */
  async isValid(userId: string, code: string, purpose: string): Promise<boolean> {
    try {
      const otp = await this.findValidToken(userId, code, purpose);
      return !!otp;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du code OTP:', error);
      return false;
    }
  }

  /**
   * Obtenir les codes OTP d'un utilisateur
   */
  async findByUserId(userId: string, purpose?: string) {
    try {
      const whereCondition: any = { userId };

      if (purpose) {
        whereCondition.purpose = purpose;
      }

      return await this.prisma.otpCode.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              phone: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la recherche des codes OTP par utilisateur:', error);
      throw error;
    }
  }

  /**
   * Compter les tentatives récentes d'un utilisateur
   */
  async countRecentAttempts(userId: string, purpose: string, windowMinutes: number = 15): Promise<number> {
    try {
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

      return await this.prisma.otpCode.count({
        where: {
          userId,
          purpose,
          createdAt: {
            gte: windowStart
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors du comptage des tentatives récentes:', error);
      return 0;
    }
  }

  /**
   * Vérifier si l'utilisateur a dépassé le nombre maximum de tentatives
   */
  async hasExceededAttempts(userId: string, purpose: string, maxAttempts: number = 5): Promise<boolean> {
    try {
      const count = await this.countRecentAttempts(userId, purpose);
      return count >= maxAttempts;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des tentatives:', error);
      return false;
    }
  }

  /**
   * Générer et sauvegarder un code OTP
   */
  async generateAndSave(userId: string, purpose: string, expiresInMinutes: number = 15): Promise<string> {
    try {
      // Générer un code à 6 chiffres
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

      // Supprimer les anciens codes
      await this.deleteUserTokens(userId, purpose);

      // Créer le nouveau code
      await this.create({
        userId,
        code,
        purpose: purpose as any,
        expiresAt
      });

      return code;
    } catch (error) {
      console.error('❌ Erreur lors de la génération du code OTP:', error);
      throw error;
    }
  }

  /**
   * Vérifier et consommer un code OTP
   */
  async verifyAndConsume(userId: string, code: string, purpose: string): Promise<boolean> {
    try {
      const otp = await this.findValidToken(userId, code, purpose);

      if (!otp) {
        return false;
      }

      // Marquer comme utilisé
      await this.markAsUsed(otp.id);

      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification et consommation du code OTP:', error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques des codes OTP
   */
  async getStats(userId?: string) {
    try {
      const whereCondition: any = {};

      if (userId) {
        whereCondition.userId = userId;
      }

      const now = new Date();

      const [total, active, expired, consumed, recent] = await Promise.all([
        // Total
        this.prisma.otpCode.count({ where: whereCondition }),

        // Actifs (non consommés, non expirés)
        this.prisma.otpCode.count({
          where: {
            ...whereCondition,
            consumed: false,
            expiresAt: { gt: now }
          }
        }),

        // Expirés
        this.prisma.otpCode.count({
          where: {
            ...whereCondition,
            expiresAt: { lt: now }
          }
        }),

        // Consommés
        this.prisma.otpCode.count({
          where: {
            ...whereCondition,
            consumed: true
          }
        }),

        // Récent (dernières 24h)
        this.prisma.otpCode.count({
          where: {
            ...whereCondition,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      return {
        total,
        active,
        expired,
        consumed,
        recent,
        expiredPercentage: total > 0 ? (expired / total) * 100 : 0
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques OTP:', error);
      throw error;
    }
  }
}