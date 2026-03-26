import { Service } from 'typedi';
import prisma from '../config/prismaClient.js';
import ExcelJS from 'exceljs';
import { StatusAction, EntiteType } from '@prisma/client';
import { startOfMonth, addHours } from 'date-fns';
import logger from '../utils/logger.js';

@Service()
export class PlanningImportService {

    /**
     * Importer une roadmap Excel vers le planning des missions
     * @param fileBuffer Buffer du fichier Excel
     * @param year Année cible (ex: 2026)
     */
    async importRoadmap(fileBuffer: any, year: number = 2026) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer);
        const worksheet = workbook.worksheets[0]; // Première feuille disponible

        if (!worksheet) throw new Error("Feuille de calcul non trouvée");

        const missionsToCreate: any[] = [];
        const errors: string[] = [];

        // Mappage des couleurs ARGB vers les entités (basé sur la légende de l'image)
        const colorToEntite: Record<string, EntiteType> = {
            'FF92D050': EntiteType.SEC, // Vert
            'FF0070C0': EntiteType.SUR, // Bleu
            'FF00B0F0': EntiteType.SUR, // Bleu clair alternatif
            'FFFFC000': EntiteType.CPS, // Orange/Jaune
            'FFFFFF00': EntiteType.CPS, // Jaune pur
        };

        const monthColumns = ["E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
        const monthNames = [
            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
        ];

        // Cache pour les sites
        const sites = await prisma.site.findMany({ select: { id: true, nom: true, code: true } });
        const siteMap = new Map();
        sites.forEach(s => {
            siteMap.set(s.nom.toLowerCase().trim(), s.id);
            siteMap.set(s.code.toLowerCase().trim(), s.id);
        });

        // Parcourir les lignes (en ignorant l'entête)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 1) return;

            const region = row.getCell("A").value?.toString();
            const siteNomRaw = row.getCell("B").value?.toString();

            if (!siteNomRaw) return;

            const siteNom = siteNomRaw.trim();
            const siteId = siteMap.get(siteNom.toLowerCase());

            if (!siteId) {
                errors.push(`Ligne ${rowNumber}: Site "${siteNom}" non trouvé en base de données.`);
                return;
            }

            // Vérifier chaque mois (Colonnes E à P)
            monthColumns.forEach((col, index) => {
                const cell = row.getCell(col);

                // 1. Détecter l'entité via la couleur de remplissage
                let missionEntite: EntiteType | null = null;

                if (cell.fill && cell.fill.type === 'pattern' && (cell.fill as any).fgColor) {
                    const fgColor = (cell.fill as any).fgColor;
                    let argb = '';

                    if (fgColor && typeof fgColor === 'object') {
                        argb = (fgColor as any).argb || '';
                    }

                    if (argb) {
                        missionEntite = colorToEntite[argb.toUpperCase()] || null;
                    }
                }

                // 2. Fallback: Si pas de couleur mais du texte présent
                const hasValue = !!cell.value?.toString().trim();

                if (missionEntite || hasValue) {
                    // Si on a une valeur mais pas de couleur, on met SEC par défaut ou on saute ?
                    // D'après l'image, toutes les cellules planifiées ont une couleur.
                    const finalEntite = missionEntite || EntiteType.SEC;
                    const missionDate = startOfMonth(new Date(year, index, 1));

                    missionsToCreate.push({
                        titre: `Audit ${siteNom} - ${monthNames[index]} ${year}`,
                        description: `Audit de sécurité planifié via roadmap importée (Région: ${region || "N/A"})`,
                        type: "Audit Périodique",
                        dateDeb: missionDate,
                        dateFin: addHours(missionDate, 2), // Durée défaut 2h
                        statut: StatusAction.A_FAIRE,
                        siteId: siteId,
                        entite: finalEntite,
                    });
                }
            });
        });

        if (missionsToCreate.length === 0) {
            throw new Error("Aucune mission planifiée trouvée dans le fichier Excel.");
        }

        // Insertion en base
        const created = await prisma.mission.createMany({
            data: missionsToCreate
        });

        logger.info(`Importation réussie : ${created.count} missions créées via Roadmap.`);

        return {
            success: true,
            count: created.count,
            errors: errors.length > 0 ? errors : undefined
        };
    }
}
