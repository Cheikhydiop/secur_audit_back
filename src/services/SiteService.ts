import { Service } from 'typedi';
import prisma from '../config/prismaClient.js';

@Service()
export class SiteService {
    async findAll(filters: {
        region?: string;
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
        withInspections?: boolean;
    }) {
        const { region, search, status, page = 1, limit = 20, withInspections } = filters;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (withInspections) {
            where.inspections = { some: {} };
        }

        // Search by name or code
        if (search) {
            where.OR = [
                { nom: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { localisation: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Filter by zone (region) - case insensitive
        if (region) {
            where.zone = { equals: region, mode: 'insensitive' };
        }

        // Filter by status - case insensitive
        if (status) {
            where.status = { equals: status, mode: 'insensitive' };
        }

        const [data, total] = await Promise.all([
            prisma.site.findMany({
                where,
                skip,
                take: limit,
                orderBy: { nom: 'asc' }
            }),
            prisma.site.count({ where })
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async findById(id: string) {
        return await prisma.site.findUnique({
            where: { id },
            include: { inspections: { take: 5, orderBy: { date: 'desc' } } }
        });
    }

    async create(data: { nom: string; code: string; type: string; zone: string; localisation: string }) {
        return await prisma.site.create({ data });
    }

    async update(id: string, data: Partial<{ nom: string; code: string; type: string; zone: string; localisation: string }>) {
        return await prisma.site.update({ where: { id }, data });
    }

    async delete(id: string) {
        await prisma.site.delete({ where: { id } });
        return true;
    }

    // Quick search for autocomplete (no pagination, limited results)
    async quickSearch(query: string, limit: number = 10) {
        if (!query) return [];

        return await prisma.site.findMany({
            where: {
                OR: [
                    { nom: { contains: query, mode: 'insensitive' } },
                    { code: { contains: query, mode: 'insensitive' } },
                    { localisation: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: limit,
            orderBy: { nom: 'asc' },
            select: {
                id: true,
                nom: true,
                code: true,
                type: true,
                zone: true,
                localisation: true
            }
        });
    }

    async importCsv(_csvData: string) {
        // TODO: parser le CSV et insérer en masse via prisma.site.createMany()
        return { imported: 0, errors: [], total: 0 };
    }
}

