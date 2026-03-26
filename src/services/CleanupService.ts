/**
 * CleanupService — SmartAudit DG-SECU/Sonatel
 * Nettoyage des données expirées (sessions, OTP, etc.)
 */
import prisma from '../config/prismaClient.js';
import logger from '../utils/logger.js';

export class CleanupService {

  /**
   * Supprimer les sessions expirées
   */
  async cleanExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { status: 'EXPIRED' }
          ]
        }
      });
      logger.info(`🧹 ${result.count} sessions expirées supprimées`);
      return result.count;
    } catch (error: any) {
      logger.error(`❌ Erreur nettoyage sessions: ${error.message}`);
      return 0;
    }
  }

  /**
   * Supprimer les codes OTP expirés
   */
  async cleanExpiredOtpCodes(): Promise<number> {
    try {
      const result = await prisma.otpCode.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { consumed: true }
          ]
        }
      });
      logger.info(`🧹 ${result.count} codes OTP expirés supprimés`);
      return result.count;
    } catch (error: any) {
      logger.error(`❌ Erreur nettoyage OTP: ${error.message}`);
      return 0;
    }
  }

  /**
   * Supprimer les invitations expirées (> 48h)
   */
  async cleanExpiredInvitations(): Promise<number> {
    try {
      const result = await (prisma as any).user.updateMany({
        where: {
          invitationStatus: 'PENDING',
          invitationTokenExpiry: { lt: new Date() }
        },
        data: {
          invitationStatus: 'EXPIRED',
          invitationToken: null,
        }
      });
      logger.info(`🧹 ${result.count} invitations expirées marquées`);
      return result.count;
    } catch (error: any) {
      logger.error(`❌ Erreur nettoyage invitations: ${error.message}`);
      return 0;
    }
  }

  /**
   * Exécuter tous les nettoyages
   */
  async runAll(): Promise<void> {
    logger.info('🧹 Démarrage du nettoyage des données expirées...');
    await Promise.all([
      this.cleanExpiredSessions(),
      this.cleanExpiredOtpCodes(),
      this.cleanExpiredInvitations(),
    ]);
    logger.info('✅ Nettoyage terminé');
  }
}
