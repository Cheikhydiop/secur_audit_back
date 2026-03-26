import { Service } from 'typedi';
import prisma from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { CriticiteQuestion, TypeReponse } from '@prisma/client';

// 8 Rubriques officielles Sonatel DG/SECU (Cahier des Exigences)
export const DEFAULT_RUBRIQUES = [
    { nom: 'Disponibilité des Documents de Sécurité', description: 'Documents de sécurité et plans', ordre: 1 },
    { nom: 'Application des Consignes de Sécurité', description: 'Consignes et procédures', ordre: 2 },
    { nom: 'Sécurité Incendie', description: 'Extincteurs, détection, évacuation', ordre: 3 },
    { nom: 'Vidéosurveillance', description: 'Caméras et enregistrements', ordre: 4 },
    { nom: 'Contrôle d\'Accès', description: 'Badges, points d\'accès', ordre: 5 },
    { nom: 'Entretien du Poste de Garde', description: 'État du poste de garde', ordre: 6 },
    { nom: 'Conformité de l\'Agent de Sécurité', description: 'Formation et équipements', ordre: 7 },
    { nom: 'Infrastructure et Risques Externes', description: 'Bâtiments et environnement', ordre: 8 },
] as const;

@Service()
export class QuestionService {

    // ============ RUBRIQUE METHODS ============

    async findAllRubriques() {
        return prisma.rubrique.findMany({
            where: { actif: true },
            orderBy: { ordre: 'asc' },
            include: {
                questions: {
                    where: { actif: true },
                    orderBy: { ordre: 'asc' }
                }
            }
        });
    }

    async getRubriqueById(id: string) {
        return prisma.rubrique.findUnique({
            where: { id },
            include: {
                questions: {
                    where: { actif: true },
                    orderBy: { ordre: 'asc' }
                }
            }
        });
    }

    async createRubrique(data: { nom: string; description?: string; ordre?: number }) {
        // Get max ordre if not provided
        let ordre = data.ordre;
        if (!ordre) {
            const maxOrdre = await prisma.rubrique.aggregate({
                _max: { ordre: true }
            });
            ordre = (maxOrdre._max.ordre || 0) + 1;
        }

        return prisma.rubrique.create({
            data: {
                nom: data.nom,
                description: data.description,
                ordre,
                actif: true
            }
        });
    }

    async updateRubrique(id: string, data: Partial<{ nom: string; description: string; ordre: number; actif: boolean }>) {
        return prisma.rubrique.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    }

    async deleteRubrique(id: string) {
        // Soft delete - deactivate instead of deleting
        return prisma.rubrique.update({
            where: { id },
            data: { actif: false }
        });
    }

    async reorderRubriques(orderedIds: string[]) {
        // Update ordre for each rubric in the array
        const updates = orderedIds.map((id, index) => 
            prisma.rubrique.update({
                where: { id },
                data: { ordre: index + 1 }
            })
        );
        return prisma.$transaction(updates);
    }

    // Initialize default rubriques if none exist
    async initializeDefaultRubriques() {
        const existingRubriques = await prisma.rubrique.count();
        if (existingRubriques === 0) {
            logger.info('Initializing default rubriques...');
            for (const r of DEFAULT_RUBRIQUES) {
                await prisma.rubrique.create({
                    data: {
                        nom: r.nom,
                        description: r.description,
                        ordre: r.ordre,
                        actif: true
                    }
                });
            }
            logger.info('Default rubriques initialized successfully');
        }
    }

    // ============ QUESTION METHODS ============

    async findAllQuestions(filters: { categorieId?: string; actif?: boolean } = {}) {
        const where: any = {};
        if (filters.categorieId) where.categorieId = filters.categorieId;
        if (filters.actif !== undefined) where.actif = filters.actif;

        return prisma.question.findMany({
            where,
            include: {
                categorie: {
                    select: { id: true, nom: true, ordre: true }
                }
            },
            orderBy: [
                { categorie: { ordre: 'asc' } },
                { ordre: 'asc' }
            ]
        });
    }

    async getActiveQuestions() {
        return prisma.question.findMany({
            where: { actif: true },
            include: {
                categorie: {
                    select: { id: true, nom: true, ordre: true }
                }
            },
            orderBy: [
                { categorie: { ordre: 'asc' } },
                { ordre: 'asc' }
            ]
        });
    }

    async getCurrentTemplate() {
        return prisma.questionnaireTemplate.findFirst({
            where: { isCurrent: true },
            include: { 
                questions: {
                    where: { actif: true },
                    include: {
                        categorie: {
                            select: { id: true, nom: true, ordre: true }
                        }
                    },
                    orderBy: { ordre: 'asc' }
                }
            }
        });
    }

    async getRubriquesAvecQuestions() {
        // Get all active questions grouped by categorie
        const questions = await prisma.question.findMany({
            where: { actif: true },
            include: {
                categorie: true
            },
            orderBy: [
                { categorie: { ordre: 'asc' } },
                { ordre: 'asc' }
            ]
        });

        // Group by categorie
        const rubriques = await prisma.rubrique.findMany({
            where: { actif: true },
            orderBy: { ordre: 'asc' }
        });

        return rubriques.map(r => ({
            id: r.id,
            nom: r.nom,
            description: r.description,
            ordre: r.ordre,
            questions: questions.filter(q => q.categorieId === r.id)
        }));
    }

    async findById(id: string) {
        return prisma.question.findUnique({
            where: { id },
            include: {
                categorie: true
            }
        });
    }

    async create(data: {
        texte: string;
        categorieId: string;
        helper?: string;
        ponderation?: number;
        criticite?: CriticiteQuestion;
        ordre?: number;
        // Dynamic questionnaire fields
        typeReponse?: TypeReponse;
        optionsReponse?: any;
        estConditionnelle?: boolean;
        conditionQuestionId?: string;
        conditionReponse?: string;
        requiredResponseOptions?: string;
        pointSaut?: number;
        estObligatoire?: boolean;
        placeholder?: string;
    }) {
        // Get max ordre for this category if not provided
        let ordre = data.ordre;
        if (!ordre) {
            const maxOrdre = await prisma.question.aggregate({
                where: { categorieId: data.categorieId },
                _max: { ordre: true }
            });
            ordre = (maxOrdre._max.ordre || 0) + 1;
        }

        // Get default ponderation based on criticite
        let ponderation = data.ponderation;
        if (!ponderation) {
            switch (data.criticite) {
                case CriticiteQuestion.CRITIQUE: ponderation = 4; break;
                case CriticiteQuestion.MAJEUR: ponderation = 2; break;
                case CriticiteQuestion.MINEUR: 
                default: ponderation = 1; break;
            }
        }

        return prisma.question.create({
            data: {
                texte: data.texte,
                categorieId: data.categorieId,
                helper: data.helper,
                ponderation,
                criticite: data.criticite || CriticiteQuestion.MINEUR,
                ordre,
                actif: true,
                typeReponse: data.typeReponse || TypeReponse.OUI_NON,
                optionsReponse: data.optionsReponse,
                estConditionnelle: data.estConditionnelle || false,
                conditionQuestionId: data.conditionQuestionId,
                conditionReponse: data.conditionReponse,
                requiredResponseOptions: data.requiredResponseOptions,
                pointSaut: data.pointSaut,
                estObligatoire: data.estObligatoire || false,
                placeholder: data.placeholder
            }
        });
    }

    async update(id: string, data: Partial<{ 
        texte: string; 
        categorieId: string; 
        helper: string;
        ponderation: number; 
        criticite: CriticiteQuestion;
        ordre: number;
        actif: boolean;
        // Dynamic questionnaire fields
        typeReponse: TypeReponse;
        optionsReponse: any;
        estConditionnelle: boolean;
        conditionQuestionId: string;
        conditionReponse: string;
        requiredResponseOptions: string;
        pointSaut: number;
        estObligatoire: boolean;
        placeholder: string;
    }>) {
        return prisma.question.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    }

    async updatePonderation(id: string, criticite: string, poids?: number) {
        let ponderation = poids;
        if (!ponderation) {
            switch (criticite) {
                case 'CRITIQUE': ponderation = 4; break;
                case 'MAJEUR': ponderation = 2; break;
                case 'MINEUR': ponderation = 1; break;
                default: ponderation = 1;
            }
        }

        // Map criticite string to enum
        let criticiteEnum: CriticiteQuestion;
        switch (criticite) {
            case 'CRITIQUE': criticiteEnum = CriticiteQuestion.CRITIQUE; break;
            case 'MAJEUR': criticiteEnum = CriticiteQuestion.MAJEUR; break;
            default: criticiteEnum = CriticiteQuestion.MINEUR;
        }

        return prisma.question.update({
            where: { id },
            data: { 
                ponderation,
                criticite: criticiteEnum
            }
        });
    }

    async delete(id: string) {
        // Soft delete
        return prisma.question.update({
            where: { id },
            data: { actif: false }
        });
    }

    async reorderQuestions(categorieId: string, orderedIds: string[]) {
        // Update ordre for each question in the array
        const updates = orderedIds.map((id, index) => 
            prisma.question.update({
                where: { id },
                data: { ordre: index + 1 }
            })
        );
        return prisma.$transaction(updates);
    }

    // Move question to a different category and/or reorder
    async moveQuestion(questionId: string, targetCategorieId: string, newOrdre: number) {
        return prisma.$transaction(async (tx) => {
            // Get the question's current category
            const question = await tx.question.findUnique({ where: { id: questionId } });
            if (!question) throw new Error('Question not found');

            const oldCategorieId = question.categorieId;

            // If moving to a different category, reorder both categories
            if (oldCategorieId !== targetCategorieId) {
                // Reorder questions in old category
                await tx.question.updateMany({
                    where: { 
                        categorieId: oldCategorieId,
                        ordre: { gt: question.ordre }
                    },
                    data: { ordre: { decrement: 1 } }
                });
            }

            // Reorder questions in target category to make space
            await tx.question.updateMany({
                where: { 
                    categorieId: targetCategorieId,
                    ordre: { gte: newOrdre }
                },
                data: { ordre: { increment: 1 } }
            });

            // Update the question itself
            return tx.question.update({
                where: { id: questionId },
                data: { 
                    categorieId: targetCategorieId,
                    ordre: newOrdre,
                    updatedAt: new Date()
                }
            });
        });
    }

    // ============ SNAPSHOT METHODS ============

    async createInitialTemplate() {
        // Vérifier si un template courant existe déjà
        const existingTemplate = await prisma.questionnaireTemplate.findFirst({
            where: { isCurrent: true }
        });
        
        if (existingTemplate) {
            return existingTemplate;
        }

        // Créer un premier template avec toutes les questions actives
        const activeQuestions = await prisma.question.findMany({
            where: { actif: true },
            orderBy: [
                { categorie: { ordre: 'asc' } },
                { ordre: 'asc' }
            ]
        });

        const newTemplate = await prisma.questionnaireTemplate.create({
            data: {
                nom: 'Questionnaire Initial',
                version: 1,
                isCurrent: true
            }
        });

        // Attacher les questions au template
        if (activeQuestions.length > 0) {
            for (const q of activeQuestions) {
                await prisma.question.update({
                    where: { id: q.id },
                    data: { templateId: newTemplate.id }
                });
            }
        }

        logger.info(`Template initial créé (v${newTemplate.version}) avec ${activeQuestions.length} questions`);
        return newTemplate;
    }

    async snapshotTemplate() {
        // Si aucun template n'existe, créer le premier
        let current = await prisma.questionnaireTemplate.findFirst({
            where: { isCurrent: true }
        });

        if (!current) {
            // Créer un template initial à partir des questions actives
            return this.createInitialTemplate();
        }

        // 1. Désactiver le template courant
        await prisma.questionnaireTemplate.update({
            where: { id: current.id },
            data: { isCurrent: false }
        });

        // 2. Créer un nouveau template (nouvelle version)
        const newTemplate = await prisma.questionnaireTemplate.create({
            data: {
                nom: `${current.nom} (v${current.version + 1})`,
                version: current.version + 1,
                isCurrent: true
            }
        });

        // 3. Copier toutes les questions actives du template précédent vers le nouveau
        const questionsToCopy = await prisma.question.findMany({
            where: { 
                templateId: current.id,
                actif: true 
            }
        });
        
        // Si pas de questions attachées au template, prendre toutes les questions actives
        const activeQuestions = questionsToCopy.length > 0 
            ? questionsToCopy
            : await prisma.question.findMany({
                where: { actif: true },
                orderBy: [
                    { categorie: { ordre: 'asc' } },
                    { ordre: 'asc' }
                ]
            });

        for (const q of activeQuestions) {
            await prisma.question.create({
                data: {
                    texte: q.texte,
                    helper: q.helper,
                    ponderation: q.ponderation,
                    criticite: q.criticite,
                    ordre: q.ordre,
                    templateId: newTemplate.id,
                    categorieId: q.categorieId,
                    actif: true
                }
            });
        }

        logger.info(`Nouveau template créé (v${newTemplate.version}) avec ${activeQuestions.length} questions`);
        return newTemplate;
    }
}
