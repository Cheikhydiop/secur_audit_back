import { Queue, Worker, Job } from 'bullmq';
import { Service, Inject } from 'typedi';
import { RedisService } from './RedisService.js';
import logger from '../utils/logger.js';

@Service()
export class QueueService {
    private winningsQueue: Queue;
    private worker: Worker;

    constructor(
        @Inject() private redisService: RedisService
    ) {
        const connection = this.redisService.getClient();

        // Initialisation de la file d'attente
        this.winningsQueue = new Queue('winnings-distribution', { connection });

        // Initialisation du worker
        this.worker = new Worker(
            'winnings-distribution',
            async (job: Job) => {
                await this.processWinnings(job);
            },
            { connection }
        );

        this.worker.on('completed', (job) => {
            logger.info(`Job ${job.id} completed successfully`);
        });

        this.worker.on('failed', (job, err) => {
            logger.error(`Job ${job?.id} failed: ${err.message}`);
        });

        logger.info('Queue system initialized');
    }

    /**
     * Ajoute un combat à la file d'attente pour la distribution des gains
     */
    public async addWinningsJob(fightId: string, winner: 'A' | 'B' | 'DRAW'): Promise<void> {
        await this.winningsQueue.add('distribute', { fightId, winner }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
        logger.info(`Added winnings distribution job for fight ${fightId}`);
    }

    /**
     * Logique de traitement des gains (sera implémentée avec BetService)
     */
    private async processWinnings(job: Job): Promise<void> {
        const { fightId, winner } = job.data;
        logger.info(`Processing winnings for fight ${fightId}, winner: ${winner}`);

        // NOTE: Ici, nous injecterons normalement BetService pour appeler settleAllBetsForFight
        // Pour éviter les dépendances circulaires, nous pourrions avoir besoin d'une approche différente
        // ou d'utiliser Container.get(BetService) au moment du traitement.

        // Simulation du travail
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    public getQueue(): Queue {
        return this.winningsQueue;
    }
}
