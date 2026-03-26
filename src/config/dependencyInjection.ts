import 'reflect-metadata';
import { Container } from 'typedi';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

export async function setupDependencyInjection() {
  try {
    logger.info('🔄 Setting up dependency injection...');

    // Vérifier si Prisma est déjà enregistré
    if (!Container.has(PrismaClient)) {
      const prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      });
      Container.set(PrismaClient, prisma);
      logger.info('✅ PrismaClient registered');
    }

    // Enregistrer dynamiquement les services
    await registerServices();

    logger.info('✅ Dependency injection setup complete');
  } catch (error) {
    logger.error('❌ Failed to setup dependency injection:', error);
    throw error;
  }
}

async function registerServices() {
  const serviceImports = [
    // Add other services here if needed
  ];

  for (const serviceImport of serviceImports) {
    try {
      const module = await serviceImport;
      const ServiceClass = Object.values(module)[0] as any;

      if (ServiceClass && typeof ServiceClass === 'function') {
        const prisma = Container.get(PrismaClient);
        const serviceInstance = new ServiceClass(prisma);
        Container.set(ServiceClass, serviceInstance);
        logger.debug(`✅ Registered: ${ServiceClass.name}`);
      }
    } catch (error) {
      logger.warn(`⚠️ Could not register service:`, error);
    }
  }
}