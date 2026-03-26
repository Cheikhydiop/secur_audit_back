import 'reflect-metadata';
import { Container } from 'typedi';
import { PrismaClient } from '@prisma/client';
import prisma from '../config/prismaClient.js';
import logger from '../utils/logger.js';

// --- Services SmartOp360 ---
import { SiteService } from '../services/SiteService.js';
import { InspectionService } from '../services/InspectionService.js';
import { QuestionService } from '../services/QuestionService.js';
import { ActionService } from '../services/ActionService.js';
import { PlanningService } from '../services/PlanningService.js';
import { DashboardService } from '../services/DashboardService.js';
import { RapportService } from '../services/RapportService.js';
import { LogService } from '../services/LogService.js';

// --- Services Infrastructure (existants) ---
import { UserService } from '../services/UserService.js';
import { AuthService } from '../services/AuthService.js';
import { EmailService } from '../services/EmailService.js';
import { WebSocketService } from '../services/WebSocketService.js';
import { EmailVerificationService } from '../services/EmailVerificationService.js';
import { InvitationService } from '../services/InvitationService.js';
import { NotificationService } from '../services/NotificationService.js';
import { CronService } from '../services/CronService.js';
import { RedisService } from '../services/RedisService.js';


// --- Repositories ---
import { UserRepository } from '../repositories/UserRepository.js';
import { SessionRepository } from '../repositories/SessionRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { OtpCodeRepository } from '../repositories/OtpCodeRepository.js';

// --- Controllers ---
import { NotificationController } from '../controllers/NotificationController.js';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private initialized = false;

  public prisma: PrismaClient = prisma;

  private constructor() { }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('🚀 Initialisation du Service Container SmartOp360...');
    console.log('📦 [ServiceContainer] Starting initialization...');

    try {
      // 1. Prisma
      console.log('📦 [ServiceContainer] Setting up Prisma...');
      Container.set('prisma', this.prisma);
      Container.set(PrismaClient, this.prisma);

      // 2. Repositories
      console.log('📦 [ServiceContainer] Setting up Repositories...');
      const userRepository = new UserRepository(this.prisma);
      Container.set(UserRepository, userRepository);

      const sessionRepository = new SessionRepository(this.prisma);
      Container.set(SessionRepository, sessionRepository);

      const auditLogRepository = new AuditLogRepository(this.prisma);
      Container.set(AuditLogRepository, auditLogRepository);

      const otpCodeRepository = new OtpCodeRepository(this.prisma);
      Container.set(OtpCodeRepository, otpCodeRepository);

      // 3. Services Infrastructure
      console.log('📦 [ServiceContainer] Setting up Infrastructure Services...');
      const emailService = new EmailService();
      Container.set(EmailService, emailService);

      const webSocketService = new WebSocketService();
      Container.set(WebSocketService, webSocketService);

      console.log('📦 [ServiceContainer] Setting up Redis Service...');
      const redisService = new RedisService();
      Container.set(RedisService, redisService);


      // 4. Notification Service
      console.log('📦 [ServiceContainer] Setting up Notification Service...');
      const notificationService = new NotificationService(webSocketService);
      Container.set(NotificationService, notificationService);

      // 5. Controllers
      console.log('📦 [ServiceContainer] Setting up Controllers...');
      Container.set(NotificationController, new NotificationController());

      const emailVerificationService = new EmailVerificationService(emailService, userRepository);
      Container.set(EmailVerificationService, emailVerificationService);

      // 5. Services Métier SmartOp360
      console.log('📦 [ServiceContainer] Setting up Business Services...');
      Container.set(SiteService, new SiteService());
      Container.set(InspectionService, new InspectionService(notificationService, emailService));
      Container.set(QuestionService, new QuestionService());
      Container.set(ActionService, new ActionService(notificationService, emailService));
      Container.set(PlanningService, new PlanningService(notificationService));
      Container.set(DashboardService, new DashboardService());
      Container.set(RapportService, new RapportService());
      Container.set(LogService, new LogService());

      // 6. Auth & User
      console.log('📦 [ServiceContainer] Setting up Auth & User Services...');
      Container.set(UserService, new UserService(
        userRepository,
        emailVerificationService,
        sessionRepository,
        this.prisma
      ));

      Container.set(AuthService, new AuthService(
        userRepository,
        emailVerificationService,
        sessionRepository,
        emailService,
        otpCodeRepository,
        auditLogRepository,
        this.prisma,
        webSocketService
      ));

      Container.set(InvitationService, new InvitationService(this.prisma, emailService));

      console.log('📦 [ServiceContainer] Starting Cron Service...');
      const cronService = new CronService(emailService, notificationService);
      Container.set(CronService, cronService);
      cronService.start();

      this.initialized = true;
      console.log('📦 [ServiceContainer] Initialization complete!');

      logger.info('✅ Service Container prêt.');
    } catch (error: any) {
      logger.error(`❌ Échec de l'initialisation du container: ${error.message}`);
      throw error;
    }
  }

  // Accesseurs typés
  public get siteService(): SiteService { return Container.get(SiteService); }
  public get inspectionService(): InspectionService { return Container.get(InspectionService); }
  public get questionService(): QuestionService { return Container.get(QuestionService); }
  public get actionService(): ActionService { return Container.get(ActionService); }
  public get planningService(): PlanningService { return Container.get(PlanningService); }
  public get dashboardService(): DashboardService { return Container.get(DashboardService); }
  public get rapportService(): RapportService { return Container.get(RapportService); }
  public get logService(): LogService { return Container.get(LogService); }

  public get authService(): AuthService { return Container.get(AuthService); }
  public get userService(): UserService { return Container.get(UserService); }
  public get redisService(): RedisService { return Container.get(RedisService); }
}


export const initializeServices = async (): Promise<ServiceContainer> => {
  const container = ServiceContainer.getInstance();
  await container.initialize();
  return container;
};
