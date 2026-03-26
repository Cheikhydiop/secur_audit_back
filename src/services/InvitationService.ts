import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/tokenUtils.js';
import { EmailService } from './EmailService.js';
import { ValidationError, NotFoundError, ConflictError } from '../errors/customErrors.js';
import logger from '../utils/logger.js';
import { config } from '../config/env.js';

export interface CreateInvitationDto {
  email: string;
  role: 'ADMIN' | 'INSPECTEUR' | 'DIRIGEANT';
  name?: string;
  entite?: 'SEC' | 'CPS' | 'SUR';
}

export interface ActivateAccountDto {
  token: string;
  name: string;
  password: string;
}

export class InvitationService {
  constructor(
    private prisma: PrismaClient,
    private emailService: EmailService
  ) { }

  /**
   * PB-015: Super-Admin invite a user by email
   * Generates a unique token valid 48h and sends invitation email
   */
  async inviteUser(dto: CreateInvitationDto, invitedById: string): Promise<void> {
    const { email, role, name, entite } = dto;

    // Check if user already exists
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError(`Un utilisateur avec l'email ${email} existe déjà`);
    }

    // Generate invitation token (valid 48h)
    const token = generateToken(32);
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create user with PENDING invitation status
    const bcrypt = await import('bcrypt');
    const tempPassword = await bcrypt.hash(generateToken(16), 10);

    await this.prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: tempPassword,
        role: role as any,
        entite: entite || 'SEC', // Par défaut SEC si non spécifié
        mustChangePassword: true,
        isActive: false,
        invitationToken: token,
        invitationTokenExpiry: expiry,
        invitationStatus: 'PENDING',
      },
    });

    // Send invitation email
    const activationLink = `${config.app.frontendUrl}/activate/${token}`;
    await this.emailService.sendInvitationEmail(email, activationLink, role);

    logger.info(`Invitation envoyée à ${email} par l'utilisateur ${invitedById}`);
  }

  /**
   * PB-015: Activate account from invitation link
   */
  async activateAccount(dto: ActivateAccountDto): Promise<{ message: string }> {
    const { token, name, password } = dto;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (this.prisma.user as any).findFirst({
      where: { invitationToken: token },
    }) as any;

    if (!user) {
      throw new NotFoundError('Lien d\'activation invalide ou déjà utilisé');
    }

    if (!user.invitationTokenExpiry || user.invitationTokenExpiry < new Date()) {
      throw new ValidationError('Le lien d\'activation a expiré (validité 48h). Demandez une nouvelle invitation.');
    }

    if (user.invitationStatus === 'ACCEPTED') {
      throw new ConflictError('Ce compte a déjà été activé');
    }

    // Validate password strength
    const { default: UserValidator } = await import('../utils/validators/userValidator.js');
    const validation = UserValidator.validatePassword(password);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join('. '));
    }

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: UserValidator.sanitizeName(name),
        password: hashedPassword,
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        invitationToken: null,
        invitationTokenExpiry: null,
        invitationStatus: 'ACCEPTED',
      },
    });

    logger.info(`Compte activé pour ${user.email}`);
    return { message: 'Compte activé avec succès. Vous pouvez maintenant vous connecter.' };
  }

  /**
   * Resend invitation email (if token expired)
   */
  async resendInvitation(userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await this.prisma.user.findUnique({ where: { id: userId } }) as any;
    if (!user) throw new NotFoundError('Utilisateur introuvable');
    if (user.invitationStatus === 'ACCEPTED') {
      throw new ConflictError('Ce compte est déjà activé');
    }

    const token = generateToken(32);
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        invitationToken: token,
        invitationTokenExpiry: expiry,
        invitationStatus: 'PENDING',
      },
    });

    const activationLink = `${config.app.frontendUrl}/activate/${token}`;
    await this.emailService.sendInvitationEmail(user.email, activationLink, user.role);

    logger.info(`Invitation renvoyée à ${user.email}`);
  }

}
