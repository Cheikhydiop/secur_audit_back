import prisma from '../lib/prisma.js';

/**
 * Réexportation du singleton Prisma configuré avec l'adaptateur PG 
 * (nécessaire pour Prisma 7 et ESM)
 */
export default prisma;
