// // src/controllers/UserController.ts
// import { Request, Response } from 'express';
// import { UserService } from '../services/UserService.js';
// import { UserRepository } from '../repositories/UserRepository.js';
// import { WalletRepository } from '../repositories/WalletRepository.js';
// import { 
//   RateLimitError, 
//   AuthenticationError, 
//   ValidationError,
//   DatabaseError 
// } from '../errors/customErrors.js';
// import { asyncHandler } from '../middlewares/asyncHandler.js';
// import { PrismaClient } from '@prisma/client';
// import { EmailVerificationService } from '../services/EmailVerificationService.js';
// import { EmailService } from '../services/EmailService.js';
// import { RateLimitService } from '../services/RateLimitService.js';
// import { SessionRepository } from '../repositories/SessionRepository.js';
// import { LoginAttemptManager } from '../utils/LoginAttemptManager.js';
// import logger from '../utils/logger.js';

// // Initialiser Prisma et les services
// const prisma = new PrismaClient();
// const userRepository = new UserRepository(prisma);
// const walletRepository = new WalletRepository(prisma);
// const emailService = new EmailService();
// const emailVerificationService = new EmailVerificationService(emailService, userRepository);
// const sessionRepository = new SessionRepository(prisma);

// // Créer l'instance du service avec injection de dépendances
// const userService = new UserService(
//   userRepository, 
//   walletRepository, 
//   emailVerificationService,
//   sessionRepository 
// );

// class UserController {
//   /**
//    * Connexion d'un utilisateur avec rate limiting et gestion de sessions
//    * POST /api/users/login
//    */
//   static login = asyncHandler(async (req: Request, res: Response) => {
//     // Récupérer l'IP du client
//     const clientIp = (req.ip || req.socket.remoteAddress || 'unknown').replace('::ffff:', '');
    
//     // Vérifier si l'IP est bloquée par LoginAttemptManager
//     if (LoginAttemptManager.isBlocked(clientIp)) {
//       const status = LoginAttemptManager.getAttemptStatus(clientIp);
//       throw new RateLimitError(
//         'Trop de tentatives de connexion échouées. Veuillez réessayer plus tard.',
//         {
//           limit: 200,
//           remaining: 0,
//           resetTime: new Date(Date.now() + (status?.timeUntilReset || 10000))
//         }
//       );
//     }
    
//     // Vérifier le rate limiting général
//     const rateLimitCheck = RateLimitService.checkRateLimit(req);
    
//     if (rateLimitCheck.isBlocked && rateLimitCheck.rateLimitInfo) {
//       throw new RateLimitError(
//         'Trop de tentatives de connexion',
//         rateLimitCheck.rateLimitInfo
//       );
//     }
    
//     const loginData = req.body;
    
//     try {
//       // Tenter la connexion
//       const result = await userService.login(loginData, req);
      
//       // ✅ CONNEXION RÉUSSIE - Réinitialiser le compteur d'échecs
//       LoginAttemptManager.clearFailedAttempts(clientIp);
      
//       // Ajouter les headers de rate limiting
//       if (rateLimitCheck.rateLimitInfo) {
//         res.setHeader('RateLimit-Remaining', rateLimitCheck.rateLimitInfo.remaining);
//         res.setHeader('RateLimit-Limit', rateLimitCheck.rateLimitInfo.limit);
//         res.setHeader('RateLimit-Reset', 
//           Math.floor(rateLimitCheck.rateLimitInfo.resetTime.getTime() / 1000)
//         );
//       }

//       // Réponse de succès
//       res.status(200).json({
//         success: true,
//         message: result.message,
//         data: {
//           user: result.user,
//           token: result.token,
//           refreshToken: result.refreshToken,
//           sessionId: result.sessionId,
//           deviceInfo: result.deviceInfo
//         },
//         rateLimitInfo: rateLimitCheck.rateLimitInfo ? {
//           remaining: rateLimitCheck.rateLimitInfo.remaining,
//           limit: rateLimitCheck.rateLimitInfo.limit,
//           resetTime: rateLimitCheck.rateLimitInfo.resetTime,
//           warning: RateLimitService.isApproachingLimit(rateLimitCheck.rateLimitInfo) 
//             ? 'Approche de la limite de taux' 
//             : undefined
//         } : undefined
//       });
      
//     } catch (error: any) {
//       // Log de l'erreur détaillé
//       logger.error('❌ Échec de connexion dans le contrôleur', {
//         email: loginData.email,
//         errorType: error.constructor.name,
//         errorMessage: error.message,
//         clientIp,
//         userAgent: req.headers['user-agent']
//       });
      
//       // ❌ CONNEXION ÉCHOUÉE - Enregistrer la tentative
//       const attemptInfo = LoginAttemptManager.recordFailedAttempt(clientIp);
      
//       // Ajouter les informations de tentative à l'en-tête de réponse
//       res.setHeader('X-Login-Attempts-Remaining', attemptInfo.remaining);
//       res.setHeader('X-Login-Attempts-Limit', 200);
//       res.setHeader('X-Login-Attempts-Reset', Math.floor(attemptInfo.resetTime.getTime() / 1000));
      
//       // Si l'utilisateur est maintenant bloqué, lever une RateLimitError
//       if (attemptInfo.isBlocked) {
//         throw new RateLimitError(
//           'Trop de tentatives de connexion échouées. Veuillez réessayer plus tard.',
//           {
//             limit: 200,
//             remaining: 0,
//             resetTime: attemptInfo.resetTime
//           }
//         );
//       }
      
//       // Pour les erreurs d'authentification (mauvais mot de passe), 
//       // NE PAS les modifier, laissez-les remonter telles quelles
//       // Le gestionnaire d'erreurs global s'en chargera
      
//       throw error; // Laisser l'erreur originale remonter
//     }
//   });

//   /**
//    * Inscription d'un nouvel utilisateur
//    * POST /api/users/register
//    */
//   static register = asyncHandler(async (req: Request, res: Response) => {
//     // Vérifier le rate limiting
//     const rateLimitCheck = RateLimitService.checkRateLimit(req);
    
//     if (rateLimitCheck.isBlocked && rateLimitCheck.rateLimitInfo) {
//       throw new RateLimitError(
//         'Trop de tentatives d\'inscription',
//         rateLimitCheck.rateLimitInfo
//       );
//     }
    
//     const userData = req.body;
    
//     try {
//       const result = await userService.register(userData, req);
      
//       // Ajouter les headers de rate limiting à la réponse
//       if (rateLimitCheck.rateLimitInfo) {
//         res.setHeader('RateLimit-Remaining', rateLimitCheck.rateLimitInfo.remaining);
//         res.setHeader('RateLimit-Limit', rateLimitCheck.rateLimitInfo.limit);
//         res.setHeader('RateLimit-Reset', 
//           Math.floor(rateLimitCheck.rateLimitInfo.resetTime.getTime() / 1000)
//         );
//       }
    
//       res.status(201).json({
//         success: true,
//         message: result.message,
//         data: {
//           user: result.user,
//           wallet: result.wallet,
//           token: result.token,
//           deviceInfo: result.deviceInfo
//         },
//         rateLimitInfo: rateLimitCheck.rateLimitInfo ? {
//           remaining: rateLimitCheck.rateLimitInfo.remaining,
//           limit: rateLimitCheck.rateLimitInfo.limit,
//           resetTime: rateLimitCheck.rateLimitInfo.resetTime
//         } : undefined
//       });
      
//     } catch (error: any) {
//       logger.error('❌ Échec d\'inscription dans le contrôleur', {
//         email: userData.email,
//         errorType: error.constructor.name,
//         errorMessage: error.message,
//         ip: req.ip
//       });
      
//       throw error; // Laisser l'erreur remonter
//     }
//   });

//   /**
//    * Vérification d'email avec OTP
//    * POST /api/users/verify-email
//    */
//   static verifyEmail = asyncHandler(async (req: Request, res: Response) => {
//     // Vérifier le rate limiting
//     const rateLimitCheck = RateLimitService.checkRateLimit(req);
    
//     if (rateLimitCheck.isBlocked && rateLimitCheck.rateLimitInfo) {
//       throw new RateLimitError(
//         'Trop de tentatives de vérification',
//         rateLimitCheck.rateLimitInfo
//       );
//     }
    
//     const { userId, otpCode } = req.body;
    
//     // Validation basique
//     const validationErrors: string[] = [];
//     if (!userId) validationErrors.push('L\'identifiant utilisateur est requis');
//     if (!otpCode) validationErrors.push('Le code OTP est requis');
    
//     if (validationErrors.length > 0) {
//       throw new ValidationError(
//         'Données de vérification incomplètes',
//         validationErrors.map(msg => ({
//           field: validationErrors.length === 1 ? 'general' : 'champ',
//           message: msg,
//           constraint: 'required'
//         }))
//       );
//     }
    
//     try {
//       const result = await userService.verifyEmail(userId, otpCode, req);
      
//       // Ajouter les headers de rate limiting
//       if (rateLimitCheck.rateLimitInfo) {
//         res.setHeader('RateLimit-Remaining', rateLimitCheck.rateLimitInfo.remaining - 1);
//         res.setHeader('RateLimit-Limit', RateLimitService.MAX_ATTEMPTS);
//         res.setHeader('RateLimit-Reset', 
//           Math.floor(rateLimitCheck.rateLimitInfo.resetTime.getTime() / 1000)
//         );
//       }
      
//       res.status(200).json({
//         success: true,
//         message: result.message,
//         data: {
//           user: result.user
//         },
//         rateLimitInfo: rateLimitCheck.rateLimitInfo ? {
//           remaining: rateLimitCheck.rateLimitInfo.remaining - 1,
//           limit: RateLimitService.MAX_ATTEMPTS,
//           resetTime: rateLimitCheck.rateLimitInfo.resetTime
//         } : undefined
//       });
      
//     } catch (error: any) {
//       logger.error('❌ Échec de vérification email dans le contrôleur', {
//         userId,
//         errorType: error.constructor.name,
//         errorMessage: error.message
//       });
      
//       throw error; // Laisser l'erreur remonter
//     }
//   });
// }

// export default UserController;