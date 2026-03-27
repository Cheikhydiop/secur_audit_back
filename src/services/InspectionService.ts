import { Service } from 'typedi';
import prisma from '../config/prismaClient.js';
import { StatusInspection, StatusAction, Criticite, CriticiteQuestion } from '@prisma/client';
import logger from '../utils/logger.js';
import { NotificationService } from './NotificationService.js';
import { CloudinaryService } from './CloudinaryService.js';
import { EmailService } from './EmailService.js';

@Service()
export class InspectionService {
    constructor(
        private notificationService: NotificationService,
        private emailService: EmailService
    ) { }

    async findAll(filters: { siteId?: string; statut?: StatusInspection; inspecteurId?: string; startDate?: string; endDate?: string; page: number; limit: number }) {
        const { siteId, statut, inspecteurId, startDate, endDate, page, limit } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (siteId) where.siteId = siteId;
        if (statut) where.statut = statut;
        if (inspecteurId) where.inspecteurId = inspecteurId;

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }

        const [inspections, total] = await Promise.all([
            prisma.inspection.findMany({
                where,
                skip,
                take: limit,
                include: {
                    site: { select: { nom: true, code: true } },
                    inspecteur: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.inspection.count({ where })
        ]);

        return { inspections, total, page, limit };
    }

    async findEnCours(inspecteurId: string) {
        return prisma.inspection.findMany({
            where: {
                inspecteurId,
                statut: StatusInspection.EN_COURS
            },
            include: {
                site: { select: { nom: true, code: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async findById(id: string) {
        return prisma.inspection.findUnique({
            where: { id },
            include: {
                site: true,
                inspecteur: { select: { name: true, email: true } },
                actions: {
                    include: {
                        responsable: { select: { name: true, email: true } }
                    }
                },
                // Include reports
                rapports: true,
                // Include snapshot questions with original question details
                inspectionQuestions: {
                    orderBy: [
                        { categorieSnapshot: 'asc' },
                        { ordreSnapshot: 'asc' }
                    ],
                    include: {
                        question: {
                            select: {
                                id: true,
                                texte: true,
                                helper: true,
                                ponderation: true,
                                criticite: true,
                                categorie: {
                                    select: {
                                        id: true,
                                        nom: true,
                                        ordre: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Get questions for an inspection - from snapshot if available, 
     * otherwise from the original questions (for backward compatibility)
     */
    async getInspectionQuestions(inspectionId: string) {
        const inspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                inspectionQuestions: {
                    orderBy: [
                        { categorieSnapshot: 'asc' },
                        { ordreSnapshot: 'asc' }
                    ]
                }
            }
        });

        if (!inspection) {
            throw new Error('Inspection non trouvée');
        }

        // If we have snapshot questions, return them
        if (inspection.inspectionQuestions.length > 0) {
            return inspection.inspectionQuestions;
        }

        // Fallback to legacy format (for old inspections without snapshots)
        return null;
    }

    async create(data: {
        siteId: string;
        inspecteurId: string;
        date?: Date;
        latitude?: number;
        longitude?: number;
        gpsAccuracy?: number;
        latitudeStart?: number;
        longitudeStart?: number;
        dateStart?: Date | string;
    }) {
        // Récupérer le template courant pour le versionnage
        const currentTemplate = await prisma.questionnaireTemplate.findFirst({
            where: { isCurrent: true }
        });

        // Get all active questions for snapshot
        const activeQuestions = await prisma.question.findMany({
            where: { actif: true },
            include: {
                categorie: true
            },
            orderBy: [
                { categorie: { ordre: 'asc' } },
                { ordre: 'asc' }
            ]
        });

        // Create inspection and snapshot in a transaction
        const inspection = await prisma.$transaction(async (tx) => {
            // 1. Create the inspection
            const newInspection = await tx.inspection.create({
                data: {
                    siteId: data.siteId,
                    inspecteurId: data.inspecteurId,
                    templateId: currentTemplate?.id,
                    date: data.date || new Date(),
                    statut: StatusInspection.EN_COURS,
                    reponses: [], // Initialisé vide - we'll use inspectionQuestions instead
                    latitude: data.latitude,
                    longitude: data.longitude,
                    gpsAccuracy: data.gpsAccuracy,
                    latitudeStart: data.latitudeStart,
                    longitudeStart: data.longitudeStart,
                    dateStart: data.dateStart ? new Date(data.dateStart) : undefined
                }
            });

            // 2. Create snapshot of all active questions
            if (activeQuestions.length > 0) {
                const snapshotQuestions = activeQuestions.map(q => ({
                    inspectionId: newInspection.id,
                    questionIdOriginal: q.id,
                    questionTextSnapshot: q.texte,
                    categorieSnapshot: q.categorie?.nom || '',
                    ordreSnapshot: q.ordre,
                    ponderationSnapshot: q.ponderation,
                    criticiteSnapshot: q.criticite,
                    helperSnapshot: q.helper,
                    reponse: null,
                    observation: null,
                    recommendation: null,
                    porteurEmail: null,
                    photoUrl: null
                }));

                await tx.inspectionQuestion.createMany({
                    data: snapshotQuestions
                });
            }

            logger.info(`Inspection ${newInspection.id} created with ${activeQuestions.length} snapshot questions`);

            return newInspection;
        });

        // Return inspection with snapshot questions
        return this.findById(inspection.id);
    }

    async update(id: string, data: {
        reponses?: any;
        statut?: StatusInspection;
        score?: number;
    }) {
        // If we have reponses, save them to InspectionQuestion table
        if (data.reponses && Array.isArray(data.reponses)) {
            // Increase timeout for bulk operations (30 seconds)
            await prisma.$transaction(async (tx) => {
                // First, collect all question IDs to fetch
                const questionIds = data.reponses
                    .filter((rep: any) => rep.questionId)
                    .map((rep: any) => rep.questionId);

                if (questionIds.length === 0) return;

                // Fetch all snapshot questions in one query
                const snapshotQuestions = await tx.inspectionQuestion.findMany({
                    where: {
                        inspectionId: id,
                        questionIdOriginal: { in: questionIds }
                    }
                });

                // Create a map for quick lookup
                const snapshotMap = new Map(
                    snapshotQuestions.map(sq => [sq.questionIdOriginal, sq])
                );

                // Now update all responses in parallel using Promise.all
                const updatePromises = data.reponses.map(async (rep: any) => {
                    const questionId = rep.questionId;
                    if (!questionId) return;

                    const snapshotQuestion = snapshotMap.get(questionId);
                    if (!snapshotQuestion) return;

                    // Get the first photo URL if there are photos
                    const photoUrl = rep.photos && rep.photos.length > 0 ? rep.photos[0] : null;

                    return tx.inspectionQuestion.update({
                        where: { id: snapshotQuestion.id },
                        data: {
                            reponse: rep.valeur || null,
                            observation: rep.observation || null,
                            recommendation: rep.recommandation || null,
                            porteurEmail: rep.porteurEmail || null,
                            photoUrl: photoUrl,
                            updatedAt: new Date()
                        }
                    });
                });

                // Wait for all updates to complete, filtering out null results
                const validPromises = updatePromises.filter((p: any) => p !== undefined && p !== null);
                if (validPromises.length > 0) {
                    await Promise.all(validPromises);
                }
            }, { timeout: 90000 }); // Increased timeout for slow DB connections (90 seconds)
        }

        return prisma.inspection.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    }

    /**
     * Update a specific question response in the inspection snapshot
     */
    async updateQuestionResponse(
        inspectionId: string,
        questionId: string,
        data: {
            reponse?: string;
            observation?: string;
            recommendation?: string;
            porteurEmail?: string;
            photoUrl?: string;
        }
    ) {
        // Find the snapshot question
        const snapshotQuestion = await prisma.inspectionQuestion.findFirst({
            where: {
                inspectionId,
                questionIdOriginal: questionId
            }
        });

        if (!snapshotQuestion) {
            throw new Error('Question snapshot non trouvée pour cette inspection');
        }

        return prisma.inspectionQuestion.update({
            where: { id: snapshotQuestion.id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    }

    /**
     * Submit inspection - calculates score from snapshot questions
     */
    async soumettre(id: string, gpsData?: { latitudeEnd?: number; longitudeEnd?: number; dateEnd?: Date }) {
        const inspection = await prisma.inspection.findUnique({
            where: { id },
            include: {
                site: true,
                inspecteur: true,
                inspectionQuestions: true
            }
        });

        if (!inspection) {
            throw new Error('Inspection non trouvée');
        }

        // 1. Calculer le score global from snapshot questions
        const score = this.calculerScoreFromSnapshot(inspection.inspectionQuestions);

        // 2. Mettre à jour l'inspection
        const updatedInspection = await prisma.inspection.update({
            where: { id },
            data: {
                statut: StatusInspection.VALIDEE,
                score: score,
                latitudeEnd: gpsData?.latitudeEnd,
                longitudeEnd: gpsData?.longitudeEnd,
                dateEnd: gpsData?.dateEnd || new Date(),
                updatedAt: new Date()
            }
        });

        // 3. Générer automatiquement les plans d'actions pour chaque Non-Conformité
        let actionsCreated = 0;
        const porteurEmails = new Map<string, any[]>();

        for (const rep of inspection.inspectionQuestions as any[]) {
            if (rep.reponse === 'NON_CONFORME') {
                const actionDesc = `Non-conformité détectée : ${rep.questionTextSnapshot.replace(/\s*\?$/, '')}`;
                const actionNotes = `Recommandation : ${rep.recommendation || 'N/A'}`;

                const action = await prisma.actionPlan.create({
                    data: {
                        inspectionId: id,
                        description: actionDesc,
                        notes: actionNotes,
                        responsableId: inspection.inspecteurId,
                        porteurEmail: rep.porteurEmail,
                        dateEcheance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        statut: StatusAction.A_FAIRE,
                        criticite: this.mapPonderationToCriticite(rep.ponderationSnapshot)
                    }
                });

                // Lier l'ActionPlan à la Question d'Inspection
                await prisma.inspectionQuestion.update({
                    where: { id: rep.id },
                    data: { idPlanAction: action.id }
                });

                actionsCreated++;

                // Collecter les actions pour l'email au porteur
                if (rep.porteurEmail) {
                    if (!porteurEmails.has(rep.porteurEmail)) {
                        porteurEmails.set(rep.porteurEmail, []);
                    }
                    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    porteurEmails.get(rep.porteurEmail)?.push({
                        question: rep.questionTextSnapshot,
                        recommendation: rep.recommendation || 'N/A',
                        categorie: rep.categorieSnapshot,
                        deadline: deadline.toLocaleDateString('fr-FR')
                    });
                }
            }
        }

        // 3.5 Envoyer les emails aux porteurs
        for (const [email, actions] of porteurEmails.entries()) {
            try {
                await (this.emailService as any).sendPorteurActionPlan(email, {
                    siteName: inspection.site.nom,
                    siteCode: inspection.site.code,
                    inspecteurName: inspection.inspecteur.name,
                    actions: actions
                });
            } catch (err) {
                logger.error(`Erreur envoi email porteur (${email}):`, err);
            }
        }

        // 4. Notifier les Admins
        await this.notificationService.notifyAdmins(
            'INSPECTION_SUBMITTED',
            'Nouvelle inspection soumise',
            `L'inspection du site ${inspection.site.nom} a été soumise par ${inspection.inspecteur.name} (Score: ${score}%)`,
            { inspectionId: id, siteId: inspection.siteId }
        );

        // 5. Notifier TOUS les autres utilisateurs (Broadcast)
        await this.notificationService.broadcastAll(
            'INSPECTION_SUBMITTED',
            'Clôture d\'inspection',
            `${inspection.inspecteur.name} a clôturé l'inspection de ${inspection.site.nom}.`,
            { inspectionId: id, siteId: inspection.siteId },
            inspection.inspecteurId // Exclure l'auteur lui-même
        );

        return {
            id,
            statut: StatusInspection.VALIDEE,
            scoreGlobal: score,
            planActionsGeneres: actionsCreated
        };
    }

    async delete(id: string) {
        // Seules les inspections en cours peuvent être supprimées
        await prisma.inspection.delete({
            where: {
                id,
                statut: StatusInspection.EN_COURS
            }
        });

        // Supprimer toutes les photos associées sur Cloudinary
        try {
            await CloudinaryService.deleteInspectionPhotos(id);
        } catch (err) {
            logger.warn(`Échec suppression photos Cloudinary pour inspection ${id}:`, err);
        }

        return { id, deleted: true };
    }

    // ─── Algorithme de scoring from snapshot ────────────────────────────────
    calculerScoreFromSnapshot(snapshotQuestions: any[]) {
        if (!snapshotQuestions || snapshotQuestions.length === 0) return 0;

        let totalPoids = 0;
        let pointsConformes = 0;

        for (const r of snapshotQuestions) {
            if (r.reponse === 'NON_APPLICABLE' || r.reponse === null) continue;

            // Poids : CRITIQUE=4, MAJEUR=2, MINEUR=1
            const p = r.ponderationSnapshot || 1;
            totalPoids += p;

            if (r.reponse === 'CONFORME') {
                pointsConformes += p;
            }
        }

        if (totalPoids === 0) return 100;
        return Math.round((pointsConformes / totalPoids) * 100);
    }

    // ─── Legacy scoring method for backward compatibility ─────────────────────
    calculerScore(reponses: any[]) {
        if (!reponses || reponses.length === 0) return 0;

        let totalPoids = 0;
        let pointsConformes = 0;

        for (const r of reponses) {
            if (r.valeur === 'NON_APPLICABLE') continue;

            // Poids : CRITIQUE=4, MAJEUR=2, MINEUR=1 (valeurs par défaut si non fournies)
            const p = r.ponderation || 1;
            totalPoids += p;

            if (r.valeur === 'CONFORME') {
                pointsConformes += p;
            }
        }

        if (totalPoids === 0) return 100;
        return Math.round((pointsConformes / totalPoids) * 100);
    }

    // ─── Niveau de maturité (A/B/C/D) ──────────────────────────────────────────
    getNiveauMaturite(score: number): string {
        if (score >= 90) return 'A'; // Excellent
        if (score >= 75) return 'B'; // Bon
        if (score >= 50) return 'C'; // Insuffisant
        return 'D';                  // Critique
    }

    private mapPonderationToCriticite(ponderation: number): Criticite {
        if (ponderation >= 4) return Criticite.ELEVEE;
        if (ponderation >= 2) return Criticite.MOYENNE;
        return Criticite.FAIBLE;
    }

    // ─── Get inspection progress ─────────────────────────────────────────────────
    async getInspectionProgress(inspectionId: string) {
        const inspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                inspectionQuestions: true
            }
        });

        if (!inspection) {
            throw new Error('Inspection non trouvée');
        }

        const totalQuestions = inspection.inspectionQuestions.length;
        const answeredQuestions = inspection.inspectionQuestions.filter(
            q => q.reponse !== null && q.reponse !== undefined && q.reponse !== ''
        ).length;

        const nonConformes = inspection.inspectionQuestions.filter(
            q => q.reponse === 'NON_CONFORME'
        ).length;

        const conformes = inspection.inspectionQuestions.filter(
            q => q.reponse === 'CONFORME'
        ).length;

        const nonApplicables = inspection.inspectionQuestions.filter(
            q => q.reponse === 'NON_APPLICABLE'
        ).length;

        return {
            inspectionId,
            totalQuestions,
            answeredQuestions,
            unansweredQuestions: totalQuestions - answeredQuestions,
            conformes,
            nonConformes,
            nonApplicables,
            progressPercentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
        };
    }

    // ─── Auto-save single question response ──────────────────────────────────────
    async autoSaveResponse(
        inspectionId: string,
        questionIdOriginal: string,
        data: {
            reponse?: string;
            observation?: string;
            recommendation?: string;
            porteurEmail?: string;
            photoUrl?: string;
        }
    ) {
        // Find the snapshot question
        const snapshotQuestion = await prisma.inspectionQuestion.findFirst({
            where: {
                inspectionId,
                questionIdOriginal
            }
        });

        if (!snapshotQuestion) {
            throw new Error('Question snapshot non trouvée pour cette inspection');
        }

        return prisma.inspectionQuestion.update({
            where: { id: snapshotQuestion.id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    }

    // ─── Get questions with dynamic visibility based on answers ──────────────────
    async getDynamicQuestions(inspectionId: string) {
        const inspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                inspectionQuestions: {
                    orderBy: [
                        { categorieSnapshot: 'asc' },
                        { ordreSnapshot: 'asc' }
                    ]
                }
            }
        });

        if (!inspection) {
            throw new Error('Inspection non trouvée');
        }

        // Get all questions with their original dynamic configuration
        const allQuestions = await prisma.question.findMany({
            where: { actif: true },
            include: { categorie: true },
            orderBy: [
                { categorie: { ordre: 'asc' } },
                { ordre: 'asc' }
            ]
        });

        // Build a map of answers for conditional logic
        const answerMap = new Map<string, string>();
        for (const iq of inspection.inspectionQuestions) {
            if (iq.reponse) {
                answerMap.set(iq.questionIdOriginal, iq.reponse);
            }
        }

        // Filter questions based on conditions
        const visibleQuestions = allQuestions.filter(q => {
            // If not conditional, always show
            if (!q.estConditionnelle || !q.conditionQuestionId) {
                return true;
            }

            // Check if condition is met
            const parentAnswer = answerMap.get(q.conditionQuestionId);
            if (!parentAnswer) {
                return false; // Hide if parent question not answered
            }

            // Check if the answer matches the required condition
            if (q.conditionReponse) {
                return parentAnswer === q.conditionReponse;
            }

            return true;
        });

        return {
            allQuestions: inspection.inspectionQuestions,
            visibleQuestions: visibleQuestions.length,
            totalQuestions: allQuestions.length,
            questions: inspection.inspectionQuestions
        };
    }
}
