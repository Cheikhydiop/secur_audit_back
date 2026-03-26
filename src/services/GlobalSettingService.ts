import { Service } from 'typedi';
import prisma from '../config/prismaClient.js';

@Service()
export class GlobalSettingService {
    async getAll() {
        return await (prisma as any).globalSetting.findMany();
    }

    async getByKey(key: string) {
        return await (prisma as any).globalSetting.findUnique({
            where: { key }
        });
    }

    async upsert(key: string, value: string, description?: string) {
        return await (prisma as any).globalSetting.upsert({
            where: { key },
            update: { value, description },
            create: { key, value, description }
        });
    }

    async updateMany(settings: { key: string; value: string }[]) {
        const promises = settings.map(s =>
            (prisma as any).globalSetting.update({
                where: { key: s.key },
                data: { value: s.value }
            })
        );
        return await Promise.all(promises);
    }
}
