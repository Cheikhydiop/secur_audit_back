
import 'reflect-metadata';
import 'dotenv/config';
import { Container } from 'typedi';
import { DashboardService } from './src/services/DashboardService.js';
import { RapportService } from './src/services/RapportService.js';

async function test() {
    console.log('🧪 Testing Dashboard Export (Mocking Controller flow)...');
    const service = Container.get(DashboardService);
    const rapportService = Container.get(RapportService);

    try {
        console.log('1. Gathering stats...');
        const filters = { periode: '30' };
        const [kpis, evolution, sites] = await Promise.all([
            service.getEnhancedKpis(filters),
            service.getEvolution(filters),
            service.getTableauSites(filters)
        ]);

        console.log('2. Generating Report...');
        const report = await rapportService.generateDashboardReport(
            filters,
            {
                kpis: (kpis as any).data || kpis,
                evolution,
                sites: (sites as any).data || sites
            },
            'test-user-id'
        );

        console.log('✅ Export Successful!');
        console.log('PDF URL:', report.urlPdf);
        console.log('Excel URL:', report.urlExcel);
    } catch (error) {
        console.error('❌ Export Failed:', error);
    }
}

test();
