import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3000'; // Ignorer process.env.API_URL qui contient déjà /api
const EMAIL = 'inspecteur@sonatel.sn';
const PASSWORD = 'Admin123!';

async function login() {
    console.log(`🔐 Logging in as ${EMAIL}...`);
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Login failed: ${response.status} ${error}`);
    }

    const data = await response.json() as any;
    console.log('✅ Login successful');
    return data.data?.token || data.token;
}

async function runPerformanceTest(token: string, concurrentUsers: number, requestsPerUser: number) {
    console.log(`🚀 Starting performance test with ${concurrentUsers} concurrent users and ${requestsPerUser} requests per user (Total: ${concurrentUsers * requestsPerUser} requests)`);

    const endpoints = [
        '/api/dashboard/kpis',
        '/api/dashboard/conformite-par-site',
        '/api/dashboard/actions-stats',
        '/api/inspections',
        '/api/sites'
    ];

    const startTime = Date.now();
    let completedRequests = 0;
    let failedRequests = 0;
    const latencies: number[] = [];

    const runUserSession = async (userId: number) => {
        for (let i = 0; i < requestsPerUser; i++) {
            const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
            const requestStart = Date.now();
            try {
                const response = await fetch(`${API_URL}${endpoint}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const duration = Date.now() - requestStart;
                latencies.push(duration);

                if (response.ok) {
                    completedRequests++;
                } else {
                    failedRequests++;
                    console.error(`❌ User ${userId} request ${i} failed: ${response.status} ${endpoint}`);
                }
            } catch (error: any) {
                failedRequests++;
                console.error(`❌ User ${userId} request ${i} error: ${error.message}`);
            }
        }
    };

    const userSessions = Array.from({ length: concurrentUsers }, (_, i) => runUserSession(i));
    await Promise.all(userSessions);

    const totalTime = Date.now() - startTime;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const rps = (completedRequests + failedRequests) / (totalTime / 1000);

    console.log('\n📊 --- Resultats du Test de Performance ---');
    console.log(`Temps total: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Requêtes réussies: ${completedRequests}`);
    console.log(`Requêtes échouées: ${failedRequests}`);
    console.log(`Requêtes par seconde (RPS): ${rps.toFixed(2)}`);
    console.log(`Latence moyenne: ${avgLatency.toFixed(2)}ms`);
    console.log(`Latence min: ${Math.min(...latencies)}ms`);
    console.log(`Latence max: ${Math.max(...latencies)}ms`);
    console.log('-------------------------------------------\n');

    if (failedRequests > 0) {
        console.warn(`⚠️ Attention: ${failedRequests} requêtes ont échoué. Le système pourrait être surchargé.`);
    } else {
        console.log('✅ Le système semble robuste sous cette charge.');
    }
}

async function main() {
    try {
        const token = await login();

        // Scénario 1: Charge légère
        await runPerformanceTest(token, 5, 10);

        // Scénario 2: Charge moyenne (Surcharge modérée)
        await runPerformanceTest(token, 20, 20);

        // Scénario 3: Charge lourde (Test de robustesse)
        // await runPerformanceTest(token, 50, 50);

    } catch (error: any) {
        console.error('❌ Error during performance test:', error.message);
    }
}

main();
