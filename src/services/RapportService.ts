import { Service } from 'typedi';
import prisma from '../config/prismaClient.js';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import fs from 'fs';
import { CloudinaryService } from './CloudinaryService.js';
import logger from '../utils/logger.js';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

@Service()
export class RapportService {
    private readonly SONATEL_ORANGE = '#F16E00';

    // Charger le logo localement et le convertir en base64 pour Puppeteer
    private getLogoBase64(): string {
        try {
            const logoPath = '/home/diop/rondes/projetdigitalisationquestionnairedecontrlessites_feat/digit-questionnaire-frontend/public/logo-secur.png';
            const fileBuffer = fs.readFileSync(logoPath);
            return `data:image/png;base64,${fileBuffer.toString('base64')}`;
        } catch (e) {
            return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Orange_logo.svg/1024px-Orange_logo.svg.png';
        }
    }

    /**
     * Obtenir tous les rapports (filtre possible par utilisateur)
     */
    async findAll(userId?: string, role?: string) {
        const where: any = {};
        // if (role === 'INSPECTEUR') where.genereParId = userId;

        return (prisma as any).rapport.findMany({
            where,
            include: {
                inspection: {
                    include: {
                        site: true,
                        inspecteur: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Obtenir un rapport par son ID
     */
    async findById(id: string) {
        return (prisma as any).rapport.findUnique({
            where: { id },
            include: {
                inspection: {
                    include: { site: true }
                }
            }
        });
    }

    /**
     * Télécharger le contenu binaire d'un rapport
     */
    async telecharger(id: string): Promise<Buffer> {
        const rapport = await this.findById(id);
        if (!rapport) throw new Error('Rapport non trouvé');

        const originalUrl = rapport.urlPdf || rapport.urlExcel;
        if (!originalUrl) throw new Error('Aucun fichier associé à ce rapport');

        // Extraction du publicId depuis l'URL Cloudinary
        // Format: .../raw/upload/v123456789/folder/subfolder/file.ext
        let publicId = '';
        try {
            const parts = originalUrl.split('/upload/');
            if (parts.length > 1) {
                // Skip the version (v123456789) if it exists
                const pathParts = parts[1].split('/');
                if (pathParts[0].startsWith('v') && !isNaN(parseInt(pathParts[0].substring(1)))) {
                    publicId = pathParts.slice(1).join('/');
                } else {
                    publicId = pathParts.join('/');
                }
            }
        } catch (e) {
            console.error('Erreur extraction publicId:', e);
        }

        // Si on a un publicId, on génère une URL signée pour le téléchargement
        // On tente d'abord en mode authentifié (nouveau standard)
        let downloadUrl = publicId ? CloudinaryService.getSignedUrl(publicId) : originalUrl;

        console.log(`[RapportService] Tentative Téléchargement: ${publicId} via ${downloadUrl.substring(0, 100)}...`);

        // Fetch the file contents from Cloudinary
        let response = await fetch(downloadUrl);

        console.log(`[RapportService] Status Cloudinary (auth): ${response.status} ${response.statusText}`);

        // Si échec en mode authentifié, on tente le mode upload (public mais potentiellement restreint)
        if (!response.ok && publicId) {
            const fallbackUrl = (CloudinaryService as any).getCloudinary().url(publicId, {
                resource_type: 'raw',
                type: 'upload',
                sign_url: true,
                secure: true
            });
            console.log(`[RapportService] Fallback mode upload: ${fallbackUrl.substring(0, 100)}...`);
            response = await fetch(fallbackUrl);
            console.log(`[RapportService] Status Cloudinary (upload): ${response.status} ${response.statusText}`);
        }

        if (!response.ok) {
            throw new Error(`Cloudinary a rejeté la requête (${response.status} ${response.statusText}).`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    /**
     * Envoyer un rapport par email
     */
    async envoyerEmail(id: string, destinataires: string[]) {
        // Implementation logic...
        return true;
    }

    /**
     * Générer un rapport d'inspection complet
     */
    async generateInspectionReport(inspectionId: string, genereParId: string, formats: ('pdf' | 'excel' | 'csv')[] = ['pdf']) {
        const inspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                site: true,
                inspecteur: true,
                inspectionQuestions: {
                    orderBy: [
                        { categorieSnapshot: 'asc' },
                        { ordreSnapshot: 'asc' }
                    ]
                },
                actions: true
            }
        });

        if (!inspection) throw new Error('Inspection non trouvée');

        // Récupérer l'inspection précédente pour le même site (N-1)
        const previousInspection = await prisma.inspection.findFirst({
            where: {
                siteId: inspection.siteId,
                id: { not: inspectionId },
                statut: 'VALIDEE',
                date: { lt: inspection.date }
            },
            orderBy: { date: 'desc' },
            select: {
                id: true,
                date: true,
                score: true
            }
        });

        const results: any = {};

        if (formats.includes('pdf')) {
            results.pdf = await this.generatePdf(inspection, previousInspection);
        }

        if (formats.includes('excel') || formats.includes('csv')) {
            results.excel = await this.generateExcel(inspection);
        }

        // Sauvegarder dans la table Rapport
        const rapport = await (prisma as any).rapport.create({
            data: {
                inspectionId,
                titre: `Rapport d'inspection - ${inspection.site.nom} - ${format(inspection.date, 'dd/MM/yyyy')}`,
                urlPdf: results.pdf || '',
                urlExcel: results.excel || '',
                genereParId
            }
        });

        return rapport;
    }

    /**
     * Génération du PDF via Puppeteer (HTML vers PDF)
     */
    private async generatePdf(inspection: any, previousInspection?: any): Promise<string> {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Calculer le niveau de maturité
        const score = inspection.score || 0;
        let maturite = 'D';
        let maturiteLabel = 'Critique';
        let maturiteColor = '#EF4444';

        if (score >= 90) { maturite = 'A'; maturiteLabel = 'Excellent'; maturiteColor = '#10B981'; }
        else if (score >= 75) { maturite = 'B'; maturiteLabel = 'Bon'; maturiteColor = '#F59E0B'; }
        else if (score >= 50) { maturite = 'C'; maturiteLabel = 'Insuffisant'; maturiteColor = '#F97316'; }

        // Calculer l'évolution N vs N-1
        let evolutionHtml = '';
        if (previousInspection) {
            const prevScore = previousInspection.score || 0;
            const delta = score - prevScore;
            const deltaColor = delta > 0 ? '#10B981' : delta < 0 ? '#EF4444' : '#6B7280';
            const deltaIcon = delta > 0 ? '▲' : delta < 0 ? '▼' : '▬';

            evolutionHtml = `
            <div class="comparison-card">
                <div class="comparison-header">Évolution N vs N-1</div>
                <div class="comparison-grid">
                    <div class="comp-item">
                        <div class="comp-label">Dernier Audit (${format(new Date(previousInspection.date), 'dd/MM/yyyy')})</div>
                        <div class="comp-value">${prevScore}%</div>
                    </div>
                    <div class="comp-item">
                        <div class="comp-label">Audit Actuel</div>
                        <div class="comp-value">${score}%</div>
                    </div>
                    <div class="comp-item" style="border-left: 2px dashed #E5E7EB;">
                        <div class="comp-label">Variation</div>
                        <div class="comp-value" style="color: ${deltaColor};">
                            ${deltaIcon} ${delta > 0 ? '+' : ''}${delta.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
            `;
        }

        const logoBase64 = this.getLogoBase64();

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700;900&display=swap');
                body { font-family: 'Roboto', sans-serif; color: #333; margin: 0; padding: 40px; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid ${this.SONATEL_ORANGE}; padding-bottom: 20px; margin-bottom: 30px; }
                .logo { width: 80px; height: 80px; }
                .title-container { text-align: right; }
                .title { font-size: 24px; font-weight: 900; color: ${this.SONATEL_ORANGE}; margin: 0; text-transform: uppercase; }
                .subtitle { font-size: 14px; color: #666; font-weight: bold; margin-top: 5px; }
                
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .info-card { background: #F9FAFB; padding: 15px; border-radius: 12px; border: 1px solid #E5E7EB; }
                .info-label { font-size: 10px; font-weight: 900; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                .info-value { font-size: 14px; font-weight: 700; color: #111827; }

                .main-results { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; margin-bottom: 40px; align-items: stretch; }
                
                .score-container { text-align: center; padding: 30px; background: #FFF7ED; border-radius: 24px; border: 2px solid ${this.SONATEL_ORANGE}20; }
                .score-value { font-size: 64px; font-weight: 900; color: ${this.SONATEL_ORANGE}; margin: 0; line-height: 1; }
                .score-label { font-size: 14px; font-weight: 700; color: #4B5563; margin-top: 10px; text-transform: uppercase; }
                .maturite-badge { display: inline-block; padding: 6px 20px; border-radius: 100px; color: white; background: ${maturiteColor}; font-weight: 900; font-size: 12px; margin-top: 15px; text-transform: uppercase; }

                .comparison-card { background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; justify-content: center; }
                .comparison-header { font-size: 12px; font-weight: 900; color: #0369A1; text-transform: uppercase; margin-bottom: 15px; }
                .comparison-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
                .comp-label { font-size: 9px; color: #0EA5E9; margin-bottom: 5px; font-weight: bold; }
                .comp-value { font-size: 18px; font-weight: 900; color: #0C4A6E; }

                .section-title { font-size: 16px; font-weight: 900; color: #374151; border-left: 6px solid ${this.SONATEL_ORANGE}; padding-left: 15px; margin: 40px 0 20px 0; text-transform: uppercase; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #F3F4F6; text-align: left; padding: 10px; font-size: 10px; font-weight: 900; color: #6B7280; text-transform: uppercase; border-bottom: 2px solid #E5E7EB; }
                td { padding: 10px; font-size: 11px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
                .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 900; }
                .conforme { background: #D1FAE5; color: #065F46; }
                .non-conforme { background: #FEE2E2; color: #991B1B; }
                
                .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 10px; }
                .photo-item { border-radius: 8px; overflow: hidden; height: 150px; border: 1px solid #E5E7EB; }
                .photo-item img { width: 100%; height: 100%; object-fit: cover; }

                .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 10px; color: #9CA3AF; }
                .page-break { page-break-after: always; }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="${logoBase64}" class="logo" />
                <div class="title-container">
                    <p class="title">Rapport d'Inspection</p>
                    <p class="subtitle">SmartAudit DG-SECU/Sonatel - Sonatel Digitale</p>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">Site</div>
                    <div class="info-value">${inspection.site.nom} (${inspection.site.code})</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Inspecteur</div>
                    <div class="info-value">${inspection.inspecteur.name}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Date de l'audit</div>
                    <div class="info-value">${format(inspection.date, 'EEEE d MMMM yyyy', { locale: fr })}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Référence</div>
                    <div class="info-value">#${inspection.id.substring(0, 8).toUpperCase()}</div>
                </div>
            </div>

            <div class="main-results">
                <div class="score-container">
                    <p class="score-value">${score}%</p>
                    <p class="score-label">Taux de Conformité Global</p>
                    <div class="maturite-badge">Niveau ${maturite} - ${maturiteLabel}</div>
                </div>
                ${evolutionHtml}
            </div>

            <div class="section-title">Synthèse des Résultats</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">Catégorie</th>
                        <th style="width: 45%;">Point de Contrôle</th>
                        <th style="width: 15%;">Statut</th>
                        <th style="width: 20%;">Observations</th>
                    </tr>
                </thead>
                <tbody>
                    ${inspection.inspectionQuestions.map((q: any) => `
                        <tr>
                            <td style="font-weight: bold; color: #6B7280;">${q.categorieSnapshot}</td>
                            <td>${q.questionTextSnapshot}</td>
                            <td>
                                <span class="status-badge ${q.reponse === 'CONFORME' ? 'conforme' : q.reponse === 'NON_CONFORME' ? 'non-conforme' : ''}">
                                    ${q.reponse?.replace('_', ' ') || 'N/A'}
                                </span>
                            </td>
                            <td style="font-style: italic; color: #4B5563;">${q.observation || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="page-break"></div>

            <div class="section-title">Preuves Photographiques</div>
            <div class="photo-grid">
                ${inspection.inspectionQuestions
                .filter((q: any) => q.photoUrl)
                .map((q: any) => `
                    <div class="photo-item">
                        <img src="${q.photoUrl}" />
                        <div style="padding: 5px; font-size: 8px; font-weight: bold;">${q.questionTextSnapshot}</div>
                    </div>
                `).join('')}
            </div>

            ${inspection.actions.length > 0 ? `
                <div class="section-title">Plan d'Actions Correctives</div>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Criticité</th>
                            <th>Échéance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inspection.actions.map((a: any) => `
                            <tr>
                                <td>${a.description}</td>
                                <td><span style="font-weight:bold;">${a.criticite}</span></td>
                                <td>${format(new Date(a.dateEcheance), 'dd/MM/yyyy')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : ''}

            <div class="footer">
                Ce document est généré automatiquement par SmartAudit DG-SECU/Sonatel.
                Document officiel de la Direction Sécurité Sonatel.
            </div>
        </body>
        </html>
        `;

        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', bottom: '20px' }
        });
        await browser.close();

        // Uploader sur Cloudinary
        const result = await CloudinaryService.uploadRaw(Buffer.from(pdfBuffer), `${inspection.id}_report.pdf`);
        return result.secure_url;
    }

    /**
     * Génération de l'Excel via ExcelJS
     */
    private async generateExcel(inspection: any): Promise<string> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Inspection');

        // Style du header
        sheet.columns = [
            { header: 'Catégorie', key: 'cat', width: 25 },
            { header: 'Question', key: 'quest', width: 50 },
            { header: 'Réponse', key: 'rep', width: 20 },
            { header: 'Observation', key: 'obs', width: 40 },
            { header: 'Crticité', key: 'crit', width: 15 },
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF16E00' } };
        sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

        inspection.inspectionQuestions.forEach((q: any) => {
            sheet.addRow({
                cat: q.categorieSnapshot,
                quest: q.questionTextSnapshot,
                rep: q.reponse,
                obs: q.observation,
                crit: q.criticiteSnapshot
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const result = await CloudinaryService.uploadRaw(Buffer.from(buffer as ArrayBuffer), `${inspection.id}_report.xlsx`);
        return result.secure_url;
    }

    /**
     * Générer un rapport de synthèse du Dashboard (Global)
     * Style premium aligné sur le Dashboard "Pilotage 360"
     */
    async generateDashboardReport(filters: any, data: any, genereParId: string) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        const logoBase64 = this.getLogoBase64();

        // Préparation des KPIs (comme dans le frontend DashboardPage.tsx)
        const kpis = [
            {
                label: "Conformité Globale",
                value: `${data.kpis.tauxConformiteGlobal}%`,
                sub: `${data.kpis.nbSitesConformes} sites conformes`,
                color: data.kpis.tauxConformiteGlobal >= 90 ? '#10B981' : data.kpis.tauxConformiteGlobal >= 60 ? '#F59E0B' : '#EF4444',
                icon: '✅'
            },
            {
                label: "Sites Audités",
                value: `${data.kpis.nbSitesAudites}/${data.kpis.nbTotalSites}`,
                sub: "Sites avec inspection validée",
                color: '#F16E00',
                icon: '📄'
            },
            {
                label: "À Valider",
                value: data.kpis.nbPlanActionsAValider || 0,
                sub: "Actions en attente",
                color: (data.kpis.nbPlanActionsAValider || 0) > 0 ? '#F59E0B' : '#10B981',
                icon: '🔔'
            },
            {
                label: "NC Critiques",
                value: data.kpis.nbNonConformitesCritiques || 0,
                sub: "Non conformités ouvertes",
                color: (data.kpis.nbNonConformitesCritiques || 0) > 0 ? '#EF4444' : '#10B981',
                icon: '⚠️'
            },
            {
                label: "Actions en Retard",
                value: data.kpis.nbPlanActionsEnRetard || 0,
                sub: `${data.kpis.nbPlanActionsOuverts} en cours`,
                color: (data.kpis.nbPlanActionsEnRetard || 0) > 0 ? '#EF4444' : '#10B981',
                icon: '⏰'
            },
            {
                label: "Taux Clôture",
                value: `${data.kpis.tauxClotureActions}%`,
                sub: "Actions closes",
                color: data.kpis.tauxClotureActions >= 90 ? '#10B981' : '#F59E0B',
                icon: '🎯'
            }
        ];

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&display=swap');
                body { font-family: 'Poppins', sans-serif; color: #1F2937; margin: 0; padding: 30px; background: #F9FAFB; }
                
                .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
                .logo-section { display: flex; align-items: center; gap: 20px; }
                .logo { height: 70px; }
                .title-group h1 { margin: 0; font-size: 32px; font-weight: 900; color: #111827; letter-spacing: -1px; }
                .title-group p { margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 2px; }
                
                .date-badge { background: white; padding: 10px 20px; border-radius: 15px; border: 1px solid #E5E7EB; text-align: right; }
                .date-badge .label { font-size: 9px; font-weight: 900; color: #9CA3AF; text-transform: uppercase; display: block; }
                .date-badge .value { font-size: 14px; font-weight: 700; color: #374151; }

                .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
                .kpi-card { background: white; padding: 25px; border-radius: 24px; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); position: relative; overflow: hidden; }
                .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; h-1.5: 6px; height: 6px; background: var(--accent-color); opacity: 0.8; }
                .kpi-icon { width: 45px; height: 45px; border-radius: 14px; background: #F3F4F6; display: flex; items-center; justify-content: center; font-size: 20px; margin-bottom: 15px; }
                .kpi-label { font-size: 11px; font-weight: 900; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
                .kpi-value { font-size: 32px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
                .kpi-sub { font-size: 12px; font-weight: 600; color: #9CA3AF; margin-top: 8px; }

                .insight-box { background: #FFF7ED; border: 2px solid #FFEDD5; padding: 25px; border-radius: 24px; margin-bottom: 40px; display: flex; gap: 20px; align-items: flex-start; }
                .insight-icon { font-size: 24px; padding: 15px; background: ${this.SONATEL_ORANGE}; border-radius: 18px; color: white; }
                .insight-content h2 { margin: 0 0 5px 0; font-size: 12px; font-weight: 900; color: ${this.SONATEL_ORANGE}; text-transform: uppercase; letter-spacing: 2px; }
                .insight-content p { margin: 0; font-size: 15px; font-weight: 600; color: #4B5563; font-style: italic; line-height: 1.6; }

                .section-title { font-size: 20px; font-weight: 900; color: #111827; margin: 40px 0 20px 0; display: flex; align-items: center; gap: 15px; }
                .section-title::after { content: ''; flex: 1; height: 2px; background: #E5E7EB; }
                
                table { width: 100%; border-collapse: separate; border-spacing: 0 8px; margin-top: 10px; }
                th { text-align: left; padding: 15px; font-size: 10px; font-weight: 900; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; }
                tr { transition: all 0.2s; }
                td { background: white; padding: 15px; font-size: 13px; font-weight: 600; border-top: 1px solid #F3F4F6; border-bottom: 1px solid #F3F4F6; }
                td:first-child { border-left: 1px solid #F3F4F6; border-radius: 15px 0 0 15px; }
                td:last-child { border-right: 1px solid #F3F4F6; border-radius: 0 15px 15px 0; }
                
                .score-badge { padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 900; }
                .top-score { background: #DCFCE7; color: #166534; }
                .low-score { background: #FEE2E2; color: #991B1B; }

                .footer { margin-top: 60px; padding-top: 30px; border-top: 2px dashed #E5E7EB; text-align: center; }
                .footer p { margin: 5px 0; font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; }
                
                .page-break { page-break-after: always; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="logo-section">
                    <img src="${logoBase64}" class="logo" />
                    <div class="title-group">
                        <h1>Pilotage 360</h1>
                        <p>Dashboard Executive • Direction Sécurité</p>
                    </div>
                </div>
                <div class="date-badge">
                    <span class="label">Rapport généré le</span>
                    <span class="value">${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr })}</span>
                </div>
            </div>

            <div class="kpi-grid">
                ${kpis.map(kpi => `
                    <div class="kpi-card" style="--accent-color: ${kpi.color}">
                        <div class="kpi-icon">${kpi.icon}</div>
                        <div class="kpi-label">${kpi.label}</div>
                        <div class="kpi-value" style="color: ${kpi.color}">${kpi.value}</div>
                        <div class="kpi-sub">${kpi.sub}</div>
                    </div>
                `).join('')}
            </div>

            <div class="insight-box">
                <div class="insight-icon">💡</div>
                <div class="insight-content">
                    <h2>Analyse Intelligente</h2>
                    <p>"${data.evolution.insight || 'Analyse globale de la conformité sur la période sélectionnée.'}"</p>
                </div>
            </div>

            <div class="section-title">Performance des Sites (Top 10)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35%;">Site</th>
                        <th style="width: 20%;">Région</th>
                        <th style="width: 25%;">Prestataire</th>
                        <th style="width: 20%; text-align: right;">Conformité</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.sites.slice(-10).sort((a: any, b: any) => b.tauxConformite - a.tauxConformite).map((s: any) => `
                        <tr>
                            <td>${s.siteNom}</td>
                            <td>${s.region}</td>
                            <td>${s.prestataire}</td>
                            <td style="text-align: right;">
                                <span class="score-badge top-score">${s.score || s.tauxConformite}%</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="page-break"></div>

            <div class="section-title">Sites Prioritaires (Flop 10)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35%;">Site</th>
                        <th style="width: 20%;">Région</th>
                        <th style="width: 25%;">Prestataire</th>
                        <th style="width: 20%; text-align: right;">Conformité</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.sites.slice(0, 10).sort((a: any, b: any) => (a.score || a.tauxConformite) - (b.score || b.tauxConformite)).map((s: any) => `
                        <tr>
                            <td>${s.siteNom}</td>
                            <td>${s.region}</td>
                            <td>${s.prestataire}</td>
                            <td style="text-align: right;">
                                <span class="score-badge low-score">${s.score || s.tauxConformite}%</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <p>Document Confidentiel • Sonatel Sécurité</p>
                <p>Généré automatiquement par SmartAudit • Plateforme de Digitalisation des Questionnaires</p>
            </div>
        </body>
        </html>
        `;

        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
        });
        await browser.close();

        const result = await CloudinaryService.uploadRaw(Buffer.from(pdfBuffer), `dashboard_report_${Date.now()}.pdf`);

        // Excel Export (Sites)
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Synthèse Sites');
        sheet.columns = [
            { header: 'Site', key: 'nom', width: 30 },
            { header: 'Zone', key: 'zone', width: 20 },
            { header: 'Prestataire', key: 'pres', width: 25 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Score %', key: 'score', width: 10 },
            { header: 'NC Critiques', key: 'nc', width: 15 },
            { header: 'Dernier Audit', key: 'date', width: 20 }
        ];

        // Format header
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF16E00' } };

        data.sites.forEach((s: any) => {
            sheet.addRow({
                nom: s.siteNom,
                zone: s.region || s.zone,
                pres: s.prestataire,
                type: s.type,
                score: s.tauxConformite || s.score,
                nc: s.nbNonConformites,
                date: s.dernierAudit ? format(new Date(s.dernierAudit), 'dd/MM/yyyy') : 'N/A'
            });
        });

        const excelBuffer = await workbook.xlsx.writeBuffer();
        const resultExcel = await CloudinaryService.uploadRaw(Buffer.from(excelBuffer as ArrayBuffer), `dashboard_export_${Date.now()}.xlsx`);

        // Créer l'entrée Rapport
        return (prisma as any).rapport.create({
            data: {
                titre: `Synthèse Dashboard - ${format(new Date(), 'dd/MM/yyyy')}`,
                urlPdf: result.secure_url,
                urlExcel: resultExcel.secure_url,
                generePar: { connect: { id: genereParId } },
            }
        });
    }
}
