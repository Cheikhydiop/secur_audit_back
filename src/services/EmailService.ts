// src/services/EmailService.ts
import { Service } from 'typedi';
import nodemailer, { Transporter } from 'nodemailer';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Service()
export class EmailService {
  private transporter: Transporter;
  private isConfigured: boolean = false;

  constructor() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      this.isConfigured = true;
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      this.testConnection();
    } else {
      logger.warn('SMTP configuration not found. Running in development/log-only mode.');
      this.isConfigured = false;
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.isConfigured) return;
    try {
      await this.transporter.verify();
      logger.info('✅ SMTP connection verified successfully');
    } catch (error: any) {
      logger.error(`❌ SMTP connection failed: ${error.message}`);
      this.isConfigured = false;
    }
  }

  /**
   * Helper pour envelopper le contenu avec le branding Sonatel
   */
  public wrapWithBranding(title: string, content: string): string {
    const currentYear = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f6f6f6; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
          .header { background-color: #F28E16; padding: 40px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
          .content { padding: 45px 35px; line-height: 1.8; font-size: 15px; }
          .footer { background-color: #111111; padding: 30px 20px; text-align: center; color: #bbbbbb; font-size: 11px; }
          .btn { display: inline-block; padding: 15px 30px; background-color: #000000; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 900; margin-top: 25px; transition: background 0.3s ease; text-transform: uppercase; letter-spacing: 1px; }
          .otp-code { font-size: 38px; font-weight: 800; color: #F28E16; letter-spacing: 8px; margin: 30px 0; text-align: center; padding: 20px; background: #FFF9F3; border: 2px solid #F28E16; border-radius: 12px; }
          .highlight-box { background-color: #FFF9F3; border-left: 5px solid #F28E16; padding: 20px; margin: 25px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SmartAudit</h1>
            <div style="color: rgba(255,255,255,0.8); font-size: 12px; font-weight: bold; margin-top: 8px; letter-spacing: 1px;">DG-SECU / SONATEL</div>
          </div>
          <div class="content">
            <h2 style="color: #F28E16; margin-top: 0; font-size: 20px; font-weight: 800;">${title}</h2>
            ${content}
          </div>
          <div class="footer">
            <div style="margin-bottom: 10px;">
                <img src="cid:logo-secur" height="40" style="vertical-align: middle;"/>
            </div>
            <p style="margin: 0; opacity: 0.7;">Ce message automatique provient du service Qualité & Sécurité Sonatel.</p>
            <p style="margin: 5px 0 0 0; opacity: 0.7;">© ${currentYear} Sonatel GIE — Direction de la Sécurité</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendEmailSafe(options: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
    attachments?: any[]
  }): Promise<boolean> {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      logger.info(`📧 [DEV EMAIL] To: ${options.to}, Subject: "${options.subject}" (Attachments: ${options.attachments?.length || 0})`);
      if (!this.isConfigured) return true;
    }

    if (this.isConfigured) {
      try {
        // Ajouter le logo en pièce jointe CID pour toutes les emails utilisant le branding
        const attachments = options.attachments || [];

        // Chemin vers le logo
        const logoPath = path.resolve(__dirname, '../../../digit-questionnaire-frontend/public/logo-secur.png');

        if (fs.existsSync(logoPath) && options.html.includes('cid:logo-secur')) {
          attachments.push({
            filename: 'logo-secur.png',
            path: logoPath,
            cid: 'logo-secur'
          });
        }

        await this.transporter.sendMail({
          from: process.env.FROM_EMAIL || '"SmartAudit DG-SECU/Sonatel" <no-reply@sonatel.sn>',
          to: options.to,
          subject: options.subject,
          html: options.html,
          replyTo: options.replyTo,
          attachments: attachments
        } as any);
        return true;
      } catch (error: any) {
        logger.error(`❌ Échec d'envoi d'email à ${options.to}: ${error.message}`);
        // En développement, on laisse passer pour ne pas bloquer le dev
        return process.env.NODE_ENV !== 'production';
      }
    }
    return process.env.NODE_ENV !== 'production';
  }

  /**
   * Code de vérification OTP
   */
  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    const content = `
      <p>Bonjour,</p>
      <p>Pour finaliser la vérification de votre adresse email sur la plateforme SmartAudit DG-SECU/Sonatel, veuillez utiliser le code de sécurité suivant :</p>
      <div class="otp-code">${code}</div>
      <p>Ce code est valable pendant 15 minutes. Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.</p>
    `;
    console.log(`\n📧 [DEV OTP] | Destinataire: ${email} | CODE: ${code}\n`);
    return this.sendEmailSafe({
      to: email,
      subject: 'Code de vérification - SmartAudit DG-SECU/Sonatel',
      html: this.wrapWithBranding('Vérification de votre compte', content)
    });
  }

  /**
   * Réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const content = `
      <p>Bonjour ${name},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte SmartAudit DG-SECU/Sonatel.</p>
      <p>Veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="btn">Réinitialiser mon mot de passe</a>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">Si le bouton ne fonctionne pas, copiez le lien suivant : ${resetLink}</p>
      <p>Ce lien expirera dans 15 minutes.</p>
    `;
    return this.sendEmailSafe({
      to: email,
      subject: 'Réinitialisation de mot de passe - SmartAudit DG-SECU/Sonatel',
      html: this.wrapWithBranding('Sécurité du compte', content)
    });
  }

  /**
   * Code de changement de mot de passe (OTP)
   */
  async sendPasswordChangeOTP(email: string, name: string, code: string): Promise<boolean> {
    const content = `
      <p>Bonjour ${name},</p>
      <p>Vous avez demandé à changer votre mot de passe pour votre compte SmartAudit DG-SECU/Sonatel.</p>
      <p>Veuillez utiliser le code de sécurité suivant pour confirmer votre identité :</p>
      <div class="otp-code">${code}</div>
      <p>Ce code est valable pendant 15 minutes. Si vous n'êtes pas à l'origine de cette demande, veuillez sécuriser votre compte immédiatement.</p>
    `;
    console.log(`\n📧 [DEV OTP MOTO DE PASSE] | Utilisateur: ${name} (${email}) | CODE: ${code}\n`);
    return this.sendEmailSafe({
      to: email,
      subject: 'Code de sécurité : Changement de mot de passe - SmartAudit DG-SECU/Sonatel',
      html: this.wrapWithBranding('Sécurité du compte', content)
    });
  }

  /**
   * Nouvel appareil détecté
   */
  async sendDeviceVerificationOTP(email: string, name: string, code: string, deviceInfo: any): Promise<boolean> {
    const content = `
      <p>Bonjour ${name},</p>
      <p>Une tentative de connexion a été détectée depuis un nouvel appareil :</p>
      <ul style="background: #f8f9fa; padding: 15px; border-radius: 4px; list-style: none;">
        <li><strong>Appareil :</strong> ${deviceInfo.deviceName || 'Inconnu'}</li>
        <li><strong>Système :</strong> ${deviceInfo.os || 'Inconnu'}</li>
        <li><strong>Navigateur :</strong> ${deviceInfo.browser || 'Inconnu'}</li>
      </ul>
      <p>Entrez le code suivant pour autoriser cet appareil :</p>
      <div class="otp-code">${code}</div>
    `;
    console.log(`\n📧 [DEV OTP APPAREIL] | Appareil: ${deviceInfo.deviceName} (${email}) | CODE: ${code}\n`);
    return this.sendEmailSafe({
      to: email,
      subject: 'Nouvel appareil détecté - SmartAudit DG-SECU/Sonatel',
      html: this.wrapWithBranding('Vérification de sécurité', content)
    });
  }

  /**
   * Action Bloquée
   */
  async sendActionBlockedEmail(to: string, data: { siteName: string; description: string; notes: string; inspecteurName: string; responsableName: string; actionUrl: string; }): Promise<boolean> {
    const content = `
      <p>Bonjour ${data.inspecteurName},</p>
      <p>Le responsable <strong>${data.responsableName}</strong> a signalé un blocage sur l'action suivante :</p>
      <div style="background-color: #FFF5EC; border-left: 4px solid #F28E16; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Site :</strong> ${data.siteName}</p>
        <p style="margin: 5px 0 0 0;"><strong>Action :</strong> ${data.description}</p>
      </div>
      <div style="background-color: #FEEFB3; border: 1px solid #FFCC00; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: bold;">🚩 Motif du blocage :</p>
        <p style="margin: 5px 0 0 0; font-style: italic;">"${data.notes}"</p>
      </div>
      <div style="text-align: center;">
        <a href="${data.actionUrl}" class="btn">Consulter l'action</a>
      </div>
    `;
    return this.sendEmailSafe({
      to,
      subject: `🚨 Action Bloquée : ${data.siteName} - SmartAudit DG-SECU/Sonatel`,
      html: this.wrapWithBranding('Alerte de Blocage', content)
    });
  }

  /**
   * Invitation d'un nouvel utilisateur
   */
  async sendInvitationEmail(email: string, link: string, role: string): Promise<boolean> {
    const content = `
      <p>Bonjour,</p>
      <p>Vous avez été invité(e) à rejoindre la plateforme <strong>SmartAudit DG-SECU/Sonatel</strong> (Sonatel DG/SECU) en tant que <strong>${role}</strong>.</p>
      <p>Cette plateforme centralise le suivi des contrôles de sécurité et des actions correctives au sein de la Direction Générale.</p>
      <p>Veuillez cliquer sur le bouton ci-dessous pour activer votre compte. Ce lien est valable pendant 48 heures :</p>
      <div style="text-align: center;">
        <a href="${link}" class="btn">Activer mon compte</a>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">Si le bouton ne fonctionne pas, copiez le lien suivant : ${link}</p>
    `;
    return this.sendEmailSafe({
      to: email,
      subject: 'Invitation à rejoindre SmartAudit DG-SECU/Sonatel',
      html: this.wrapWithBranding('Invitation Professionnelle', content)
    });
  }

  /**
   * Envoi du plan d'action au porteur (non utilisateur)
   */
  async sendPorteurActionPlan(to: string, data: { siteName: string; siteCode: string; inspecteurName: string; actions: any[] }): Promise<boolean> {
    const actionsHtml = data.actions.map(a => `
      <div style="background-color: #FFF9F3; border-left: 4px solid #F28E16; padding: 15px; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <p style="margin: 0; font-size: 11px; color: #888; font-weight: 900; text-transform: uppercase;">Rubrique : ${a.categorie}</p>
        <p style="margin: 8px 0; font-weight: 800; color: #111; font-size: 16px;">${a.question}</p>
        <div style="margin-top: 12px; padding: 15px; background: white; border-radius: 6px; border: 1px dashed #F28E16;">
          <p style="margin: 0; font-weight: 900; color: #F28E16; font-size: 13px; text-transform: uppercase;">💡 Recommandation :</p>
          <p style="margin: 8px 0 0 0; color: #333; line-height: 1.5;">${a.recommendation}</p>
        </div>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #d32f2f; font-weight: bold;">📅 Échéance prévue : ${a.deadline || '7 jours'}</p>
      </div>
    `).join('');

    const content = `
      <p>Bonjour,</p>
      <p>L'inspecteur <strong>${data.inspecteurName}</strong> a finalisé l'audit de sécurité sur le site <strong>${data.siteName} (${data.siteCode})</strong>.</p>
      <p>Vous avez été identifié comme <strong>porteur des actions correctives</strong> suivantes à mener en priorité :</p>
      
      <div style="margin: 25px 0;">
        ${actionsHtml}
      </div>
      
      <div class="highlight-box">
        <p style="margin: 0; font-weight: 900; color: #111;">ℹ️ Note importante :</p>
        <p style="margin: 8px 0 0 0; color: #444;">N'étant pas utilisateur direct de l'application SmartAudit, veuillez informer l'inspecteur <strong>${data.inspecteurName}</strong> dès que ces actions auront été traitées afin qu'il puisse clore le dossier dans le système.</p>
      </div>
    `;

    return this.sendEmailSafe({
      to,
      subject: `📋 Actions à mener : Site ${data.siteName} — SmartAudit DG-SECU/Sonatel`,
      html: this.wrapWithBranding('Nouveau Plan d\'Action Assigné', content)
    });
  }

  /**
   * Confirmation de connexion sur un nouvel appareil
   */
  async sendDeviceConnectionConfirmation(email: string, name: string, deviceInfo: any, timestamp: string): Promise<boolean> {
    const content = `
      <p>Bonjour ${name},</p>
      <p>Votre compte SmartAudit DG-SECU/Sonatel vient d'être utilisé pour se connecter sur un nouvel appareil :</p>
      <ul style="background: #f8f9fa; padding: 15px; border-radius: 4px; list-style: none; border-left: 4px solid #28a745;">
        <li><strong>Appareil :</strong> ${deviceInfo.deviceName || 'Inconnu'}</li>
        <li><strong>Date :</strong> ${timestamp}</li>
      </ul>
      <p>Si vous êtes à l'origine de cette connexion, vous pouvez ignorer cet email.</p>
      <p><strong>Si vous ne reconnaissez pas cette activité</strong>, nous vous conseillons vivement de changer votre mot de passe immédiatement et de révoquer les sessions suspectes depuis vos paramètres de sécurité.</p>
    `;
    return this.sendEmailSafe({
      to: email,
      subject: 'Confirmation de connexion - SmartAudit DG-SECU/Sonatel',
      html: this.wrapWithBranding('Sécurité du compte', content)
    });
  }
}
