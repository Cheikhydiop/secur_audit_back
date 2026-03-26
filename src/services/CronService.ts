/**
 * CronService — SmartAudit DG-SECU/Sonatel
 * Jobs planifiés : expiration MDP 90j (PB-017), relances PA J-2 (PB-053)
 */
import cron from 'node-cron';
import prisma from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { EmailService } from './EmailService.js';
import { NotificationService } from './NotificationService.js';

export class CronService {
  private emailService: EmailService;
  private notificationService: NotificationService;

  constructor(emailService: EmailService, notificationService: NotificationService) {
    this.emailService = emailService;
    this.notificationService = notificationService;
  }

  /**
   * Démarrer tous les jobs CRON
   */
  start(): void {
    // PB-017 : Vérification expiration MDP — tous les jours à 8h00
    cron.schedule('0 8 * * *', () => this.checkPasswordExpiration(), {
      timezone: 'Africa/Dakar'
    });

    // Nettoyage des rapports — tous les jours à 3h00 (heure creuse)
    cron.schedule('0 3 * * *', () => this.cleanupReports(), {
      timezone: 'Africa/Dakar'
    });

    // NOTIF-WEEKLY : Planning hebdomadaire — tous les vendredis à 16h00
    cron.schedule('0 16 * * 5', () => this.sendWeeklyPlanningNotification(), {
      timezone: 'Africa/Dakar'
    });

    logger.info('✅ CronService démarré (expiration MDP + relances PA + cleanup rapports + planning hebdo)');
  }

  /**
   * Envoi du planning hebdomadaire aux inspecteurs et admins
   * Exécuté tous les vendredis à 16h00
   */
  async sendWeeklyPlanningNotification(): Promise<void> {
    try {
      const now = new Date();
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
      nextMonday.setHours(0, 0, 0, 0);

      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      nextSunday.setHours(23, 59, 59, 999);

      logger.info(`📅 Préparation de la notification du planning hebdo (${nextMonday.toLocaleDateString()} - ${nextSunday.toLocaleDateString()})`);

      // 1. Récupérer TOUTES les missions de la semaine prochaine
      const allMissions = await (prisma as any).mission.findMany({
        where: {
          dateDeb: { gte: nextMonday, lte: nextSunday }
        },
        include: {
          site: { select: { nom: true, zone: true } },
          inspecteur: { select: { id: true, name: true } }
        },
        orderBy: [{ dateDeb: 'asc' }, { site: { nom: 'asc' } }]
      });

      if (allMissions.length === 0) {
        logger.info('📭 Aucune mission planifiée pour la semaine prochaine.');
        return;
      }

      // 2. Récupérer tous les utilisateurs actifs
      const users = await (prisma as any).user.findMany({
        where: { isActive: true },
        select: { id: true, email: true, name: true, role: true, entite: true }
      });

      for (const user of users) {
        // Filtrer les missions : par entité ou si l'user est admin (voit tout)
        const relevantMissions = allMissions.filter((m: any) =>
          (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ||
          (m.entite === user.entite && user.entite) ||
          m.inspecteurId === user.id
        );

        if (relevantMissions.length > 0) {
          if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
            // Email Admin : Résumé Global
            await this.emailService.sendEmailSafe({
              to: user.email,
              subject: `📊 Résumé global du planning — Semaine du ${nextMonday.toLocaleDateString('fr-FR')}`,
              html: this.buildAdminPlanningSummaryEmail(user.name, relevantMissions, nextMonday),
            });
          } else {
            // Email Inspecteur/User : Planning de son entité + son planning perso mis en avant
            const myMissions = relevantMissions.filter((m: any) => m.inspecteurId === user.id);
            const icsContent = myMissions.length > 0 ? this.generateIcsContent(myMissions) : null;

            await this.emailService.sendEmailSafe({
              to: user.email,
              subject: `� Planning Hebdomadaire (${user.entite || 'Général'}) — Semaine du ${nextMonday.toLocaleDateString('fr-FR')}`,
              html: this.buildWeeklyInspectorPlanningEmail(user.name, relevantMissions, nextMonday, user.id),
              attachments: icsContent ? [
                {
                  filename: `mon_planning_${nextMonday.toISOString().split('T')[0]}.ics`,
                  content: icsContent,
                  contentType: 'text/calendar'
                }
              ] : []
            });
          }
        }
      }

      logger.info(`📧 Notifications hebdomadaires envoyées à ${users.length} utilisateurs.`);

    } catch (error: any) {
      logger.error(`❌ Erreur CRON sendWeeklyPlanningNotification: ${error.message}`);
    }
  }

  /**
   * PB-017 : Vérification expiration mot de passe (90 jours)
   * - Alerte J-10 : email d'avertissement
   * - Blocage si > 90 jours
   */
  async checkPasswordExpiration(): Promise<void> {
    try {
      const now = new Date();
      const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Utilisateurs dont le MDP expire dans 10 jours
      const usersExpiringSoon = await (prisma as any).user.findMany({
        where: {
          isActive: true,
          passwordChangedAt: {
            gte: new Date(tenDaysFromNow.getTime() - 90 * 24 * 60 * 60 * 1000),
            lte: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000),
          }
        },
        select: { id: true, email: true, name: true, passwordChangedAt: true }
      });

      for (const user of usersExpiringSoon) {
        const daysLeft = Math.ceil(
          (new Date(user.passwordChangedAt!).getTime() + 90 * 24 * 60 * 60 * 1000 - now.getTime())
          / (24 * 60 * 60 * 1000)
        );
        await this.emailService.sendEmailSafe({
          to: user.email,
          subject: `⚠️ Votre mot de passe expire dans ${daysLeft} jour(s) — SmartAudit DG-SECU/Sonatel`,
          html: this.buildPasswordExpiryWarningEmail(user.name, daysLeft),
        });

        // Alerte in-app
        await this.notificationService.sendNotification({
          userId: user.id,
          type: 'WARNING',
          title: 'Expiration du mot de passe',
          message: `Votre mot de passe expire dans ${daysLeft} jours. Veuillez le changer rapidement.`,
          data: { daysLeft }
        });

        logger.info(`📧 Alerte expiration MDP envoyée à ${user.email} (J-${daysLeft})`);
      }

      // Utilisateurs dont le MDP a expiré (> 90 jours) → forcer changement
      const expiredUsers = await (prisma as any).user.findMany({
        where: {
          isActive: true,
          mustChangePassword: false,
          passwordChangedAt: { lt: ninetyDaysAgo }
        },
        select: { id: true, email: true, name: true }
      });

      if (expiredUsers.length > 0) {
        await (prisma as any).user.updateMany({
          where: { id: { in: expiredUsers.map((u: any) => u.id) } },
          data: { mustChangePassword: true }
        });

        for (const user of expiredUsers) {
          await this.emailService.sendEmailSafe({
            to: user.email,
            subject: '🔒 Mot de passe expiré — Action requise — SmartAudit DG-SECU/Sonatel',
            html: this.buildPasswordExpiredEmail(user.name),
          });
        }
        logger.info(`🔒 ${expiredUsers.length} utilisateurs bloqués (MDP expiré > 90j)`);
      }
    } catch (error: any) {
      logger.error(`❌ Erreur CRON checkPasswordExpiration: ${error.message}`);
    }
  }

  /**
   * PB-053 : Relances plans d'actions J-2 avant échéance
   */
  async checkActionPlanDeadlines(): Promise<void> {
    try {
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const dueSoonActions = await (prisma.actionPlan as any).findMany({
        where: {
          statut: { in: ['A_FAIRE', 'EN_COURS'] },
          dueSoonNotified: false,
          dateEcheance: {
            gte: tomorrow,
            lte: twoDaysFromNow,
          }
        },
        include: {
          responsable: { select: { id: true, email: true, name: true } },
          inspection: {
            include: { site: { select: { nom: true } } }
          }
        }
      });

      for (const action_raw of dueSoonActions) {
        const action = action_raw as any;
        const daysLeft = Math.ceil(
          (action.dateEcheance.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        await this.emailService.sendEmailSafe({
          to: action.responsable.email,
          subject: `⏰ Rappel : Plan d'action à réaliser dans ${daysLeft} jour(s) — SmartAudit DG-SECU/Sonatel`,
          html: this.buildActionPlanReminderEmail(
            action.responsable.name,
            action.description,
            action.inspection.site.nom,
            daysLeft,
            action.dateEcheance
          ),
        });

        // Alerte in-app
        await this.notificationService.sendNotification({
          userId: action.responsable.id,
          type: 'ACTION_DUE_SOON',
          title: 'Plan d\'action arrive à échéance',
          message: `L'action "${action.description}" sur le site ${action.inspection.site.nom} doit être réalisée dans ${daysLeft} jours.`,
          data: { actionId: action.id, siteName: action.inspection.site.nom }
        });

        // Marquer comme notifié
        await (prisma.actionPlan as any).update({
          where: { id: action.id },
          data: { dueSoonNotified: true }
        });

        logger.info(`📧 Relance PA envoyée à ${action.responsable.email} (J-${daysLeft})`);
      }
    } catch (error: any) {
      logger.error(`❌ Erreur CRON checkActionPlanDeadlines: ${error.message}`);
    }
  }

  /**
   * Nettoyage des rapports archivés selon la durée de rétention (configurable)
   */
  async cleanupReports(): Promise<void> {
    try {
      const setting = await (prisma as any).globalSetting.findUnique({
        where: { key: 'report_retention_days' }
      });

      const retentionDays = setting ? parseInt(setting.value) : 366; // Défault > 1 an
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - retentionDays);

      const oldReportsCount = await (prisma as any).rapport.deleteMany({
        where: { createdAt: { lt: thresholdDate } }
      });

      if (oldReportsCount.count > 0) {
        logger.info(`🗑️ Nettoyage : ${oldReportsCount.count} rapports anciens supprimés (> ${retentionDays} jours)`);
      }
    } catch (error: any) {
      logger.error(`❌ Erreur CRON cleanupReports: ${error.message}`);
    }
  }

  private generateIcsContent(missions: any[]): string {
    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const calendarHeader = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SmartAudit//Sonatel//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ].join("\r\n");

    const events = missions.map(m => {
      const start = formatIcsDate(new Date(m.dateDeb));
      // Par défaut fin 4h après si non spécifié
      const endDate = m.dateFin ? new Date(m.dateFin) : new Date(new Date(m.dateDeb).getTime() + 4 * 60 * 60 * 1000);
      const end = formatIcsDate(endDate);

      return [
        "BEGIN:VEVENT",
        `UID:${m.id}@smartaudit.sonatel.sn`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:Audit SmartAudit - ${m.site.nom}`,
        `DESCRIPTION:Inspection ${m.type} sur le site ${m.site.nom} (${m.site.zone}).`,
        `LOCATION:${m.site.nom}, ${m.site.zone}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      ].join("\r\n");
    }).join("\r\n");

    return `${calendarHeader}\r\n${events}\r\nEND:VCALENDAR`;
  }

  private buildWeeklyInspectorPlanningEmail(name: string, missions: any[], nextMonday: Date, currentUserId: string): string {
    const myMissions = missions.filter(m => m.inspecteurId === currentUserId);
    const otherMissions = missions.filter(m => m.inspecteurId !== currentUserId);

    const renderMissionRow = (m: any, isMine: boolean) => `
      <tr style="border-bottom: 1px solid #eee; ${isMine ? 'background-color: #FFF9F3;' : ''}">
        <td style="padding: 12px 0;">
          <div style="font-weight: 800; color: #111;">${m.site.nom}</div>
          <div style="font-size: 11px; color: #888; text-transform: uppercase;">${m.site.zone}</div>
        </td>
        <td style="padding: 12px 0; font-size: 12px; color: #555;">
          ${isMine ? '<span style="color: #F28E16; font-weight: bold;">Moi</span>' : (m.inspecteur?.name || 'Non assigné')}
        </td>
        <td style="padding: 12px 0; text-align: right;">
          <div style="font-weight: 700;">${new Date(m.dateDeb).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</div>
          <div style="font-size: 11px; color: #F28E16;">${m.type}</div>
        </td>
      </tr>
    `;

    const myMissionsHtml = myMissions.length > 0
      ? `<tr><td colspan="3" style="padding: 20px 0 10px 0; font-size: 12px; font-weight: 900; color: #F28E16; text-transform: uppercase;">📍 Mes Missions Assignées</td></tr>` + myMissions.map(m => renderMissionRow(m, true)).join('')
      : '';

    const otherMissionsHtml = otherMissions.length > 0
      ? `<tr><td colspan="3" style="padding: 20px 0 10px 0; font-size: 12px; font-weight: 900; color: #888; text-transform: uppercase;">🏢 Autres missions de l'entité</td></tr>` + otherMissions.map(m => renderMissionRow(m, false)).join('')
      : '';

    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
  <div style="background: #F28E16; padding: 35px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">SmartAudit</h1>
    <div style="color: rgba(255,255,255,0.8); font-size: 11px; font-weight: bold; margin-top: 5px; letter-spacing: 1px;">PLANNING DE L'ENTITÉ</div>
  </div>
  <div style="padding: 40px 30px; background: #ffffff;">
    <h2 style="color: #F28E16; margin-top: 0; font-weight: 800;">Bonjour ${name},</h2>
    <p style="color: #444; line-height: 1.6;">Voici l'aperçu du planning pour votre entité pour la semaine du <strong>${nextMonday.toLocaleDateString('fr-FR')}</strong>.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="border-bottom: 2px solid #F28E16; text-align: left;">
          <th style="padding-bottom: 10px; font-size: 11px; text-transform: uppercase; color: #888;">Site</th>
          <th style="padding-bottom: 10px; font-size: 11px; text-transform: uppercase; color: #888;">Assigné à</th>
          <th style="padding-bottom: 10px; font-size: 11px; text-transform: uppercase; color: #888; text-align: right;">Date</th>
        </tr>
      </thead>
      <tbody>
        ${myMissionsHtml}
        ${otherMissionsHtml}
      </tbody>
    </table>

    <div style="background-color: #FFF9F3; border-left: 5px solid #F28E16; padding: 25px; margin: 30px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: bold; color: #111;">🎯 La Minute Checklist :</p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 13px; color: #555;">
        <li style="margin-bottom: 5px;">Pensez à charger votre tablette à <strong>100%</strong> avant lundi.</li>
        <li style="margin-bottom: 5px;"><strong>Synchronisez</strong> vos données en attente avant de partir sur le terrain.</li>
        <li>Vérifiez la présence de vos équipements de protection (EPI) dans le véhicule.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL}/planning" 
         style="background: #000000; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">
        Gérer mon planning en ligne
      </a>
    </div>
  </div>
  <div style="background: #111111; padding: 25px; text-align: center; color: #999999; font-size: 11px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} Sonatel — Direction de la Sécurité</p>
  </div>
</div>`;
  }

  private buildAdminPlanningSummaryEmail(name: string, missions: any[], nextMonday: Date): string {
    const missionsHtml = missions.map(m => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 0;">
          <div style="font-weight: 700;">${m.site.nom}</div>
          <div style="font-size: 10px; color: #888;">${m.site.zone}</div>
        </td>
        <td style="padding: 12px 0; font-size: 12px; color: #555;">
          ${m.inspecteur?.name || 'Non assigné'}
        </td>
        <td style="padding: 12px 0; text-align: right; font-size: 12px;">
          ${new Date(m.dateDeb).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
        </td>
      </tr>
    `).join('');

    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
  <div style="background: #F28E16; padding: 30px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">SmartAudit Admin</h1>
    <div style="color: rgba(255,255,255,0.8); font-size: 10px;">RÉSUMÉ HEBDOMADAIRE DU PLANNING</div>
  </div>
  <div style="padding: 30px; background: #ffffff;">
    <p>Bonjour ${name},</p>
    <p>Voici l'aperçu consolidé des <strong>${missions.length} missions</strong> planifiées pour la semaine du ${nextMonday.toLocaleDateString('fr-FR')}.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <thead>
        <tr style="border-bottom: 2px solid #F28E16; text-align: left; font-size: 10px; color: #888; text-transform: uppercase;">
          <th style="padding-bottom: 10px;">Site</th>
          <th style="padding-bottom: 10px;">Inspecteur</th>
          <th style="padding-bottom: 10px; text-align: right;">Date</th>
        </tr>
      </thead>
      <tbody>
        ${missionsHtml}
      </tbody>
    </table>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL}/dashboard" 
         style="background: #F28E16; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 800;">
        Accéder au Pilotage 360
      </a>
    </div>
  </div>
  <div style="background: #111111; padding: 20px; text-align: center; color: #666; font-size: 10px;">
    © ${new Date().getFullYear()} Sonatel — Direction de la Sécurité
  </div>
</div>`;
  }

  private buildPasswordExpiryWarningEmail(name: string, daysLeft: number): string {

    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
  <div style="background: #F28E16; padding: 35px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">SmartAudit</h1>
    <div style="color: rgba(255,255,255,0.8); font-size: 11px; font-weight: bold; margin-top: 5px; letter-spacing: 1px;">DG-SECU / SONATEL</div>
  </div>
  <div style="padding: 40px 30px; background: #ffffff;">
    <h2 style="color: #F28E16; margin-top: 0; font-weight: 800;">⚠️ Votre mot de passe expire bientôt</h2>
    <p style="color: #444; line-height: 1.6;">Bonjour <strong>${name}</strong>,</p>
    <p style="color: #444; line-height: 1.6;">La sécurité de vos données est notre priorité. Votre mot de passe SmartAudit expirera dans <strong>${daysLeft} jour(s)</strong>.</p>
    <p style="color: #444; line-height: 1.6;">Veuillez le renouveler dès maintenant via votre profil pour conserver un accès ininterrompu.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL}/change-password" 
         style="background: #000000; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">
        Changer mon mot de passe
      </a>
    </div>
  </div>
  <div style="background: #111111; padding: 25px; text-align: center; color: #999999; font-size: 11px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} Sonatel — Direction de la Sécurité</p>
  </div>
</div>`;
  }

  private buildPasswordExpiredEmail(name: string): string {
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
  <div style="background: #F28E16; padding: 35px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">SmartAudit</h1>
    <div style="color: rgba(255,255,255,0.8); font-size: 11px; font-weight: bold; margin-top: 5px; letter-spacing: 1px;">DG-SECU / SONATEL</div>
  </div>
  <div style="padding: 40px 30px; background: #ffffff;">
    <h2 style="color: #d32f2f; margin-top: 0; font-weight: 800;">🔒 Accès réinitialisé</h2>
    <p style="color: #444; line-height: 1.6;">Bonjour <strong>${name}</strong>,</p>
    <p style="color: #444; line-height: 1.6;">Votre mot de passe a atteint sa limite de validité de 90 jours conformément à la charte de sécurité Sonatel.</p>
    <p style="color: #444; line-height: 1.6;">Votre accès est temporairement suspendu. Vous devez définir un nouveau mot de passe pour réactiver votre session.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL}/change-password" 
         style="background: #d32f2f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">
        Réactiver mon compte
      </a>
    </div>
  </div>
  <div style="background: #111111; padding: 25px; text-align: center; color: #999999; font-size: 11px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} Sonatel — Direction de la Sécurité</p>
  </div>
</div>`;
  }

  private buildActionPlanReminderEmail(
    name: string,
    description: string,
    siteName: string,
    daysLeft: number,
    deadline: Date
  ): string {
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
  <div style="background: #F28E16; padding: 35px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">SmartAudit</h1>
    <div style="color: rgba(255,255,255,0.8); font-size: 11px; font-weight: bold; margin-top: 5px; letter-spacing: 1px;">DG-SECU / SONATEL</div>
  </div>
  <div style="padding: 40px 30px; background: #ffffff;">
    <h2 style="color: #F28E16; margin-top: 0; font-weight: 800;">⏰ Rappel de Plan d'Action</h2>
    <p style="color: #444; line-height: 1.6;">Bonjour <strong>${name}</strong>,</p>
    <p style="color: #444; line-height: 1.6;">Une action prioritaire arrive à échéance dans <strong>${daysLeft} jour(s)</strong>.</p>
    
    <div style="background-color: #FFF9F3; border-left: 5px solid #F28E16; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding-bottom: 8px; color: #888; font-size: 11px; text-transform: uppercase; font-weight: 900;">Site</td></tr>
        <tr><td style="padding-bottom: 20px; font-weight: 800; font-size: 16px;">${siteName}</td></tr>
        <tr><td style="padding-bottom: 8px; color: #888; font-size: 11px; text-transform: uppercase; font-weight: 900;">Description</td></tr>
        <tr><td style="padding-bottom: 20px; font-weight: 500;">${description}</td></tr>
        <tr><td style="padding-bottom: 8px; color: #888; font-size: 11px; text-transform: uppercase; font-weight: 900;">Échéance Finale</td></tr>
        <tr><td style="font-weight: 800; color: #F28E16;">${deadline.toLocaleDateString('fr-FR')}</td></tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL}/actions" 
         style="background: #000000; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">
        Consulter mes actions
      </a>
    </div>
  </div>
  <div style="background: #111111; padding: 25px; text-align: center; color: #999999; font-size: 11px;">
    <p style="margin: 0;">© ${new Date().getFullYear()} Sonatel — Direction de la Sécurité</p>
  </div>
</div>`;
  }
}
