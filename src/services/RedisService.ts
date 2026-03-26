import { Redis } from 'ioredis';
import { Service } from 'typedi';
import config from '../config/env.js';
import logger from '../utils/logger.js';

@Service()
export class RedisService {
    private client: Redis;
    private isConnected = false;

    constructor() {
        const redisHost = config.redis.host;
        const redisPassword = config.redis.password;

        // Détection de l'option TLS pour Upstash
        const useTLS = redisHost?.includes('upstash.io');

        const redisConfig: any = {
            host: redisHost,
            port: config.redis.port,
            password: redisPassword,
            tls: useTLS ? {} : undefined,
        };

        this.client = new Redis(redisConfig, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });


        this.client.on('connect', () => {
            if (!this.isConnected) {
                this.isConnected = true;
                logger.info('✅ Redis connected successfully (Upstash Mode)');
            }
        });

        this.client.on('error', (error: any) => {
            this.isConnected = false;
            // On ne logue l'erreur que s'il s'agit d'un vrai changement d'état ou d'une erreur critique sans polluer
            if (error.code !== 'ECONNRESET') {
                logger.error('Redis connection error:', error.message);
            }
        });

    }

    public getClient(): Redis {
        return this.client;
    }

    public async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            logger.error(`Redis error for key ${key}:`, error);
            return null;
        }
    }

    public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        try {
            if (ttlSeconds) {
                await this.client.set(key, value, 'EX', ttlSeconds);
            } else {
                await this.client.set(key, value);
            }
        } catch (error) {
            logger.error(`Redis set error for key ${key}:`, error);
        }
    }

    public async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error(`Redis delete error for key ${key}:`, error);
        }
    }

    public async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Redis exists check error for key ${key}:`, error);
            return false;
        }
    }

    public isReady(): boolean {
        return this.isConnected;
    }
}
