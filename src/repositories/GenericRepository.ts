import { PrismaClient } from '@prisma/client';
import { IGenericRepository } from './interfaces/IGenericRepository.js';

export abstract class GenericRepository<T> implements IGenericRepository<T> {
  protected prisma: PrismaClient;
  protected model: any;

  constructor(prisma: PrismaClient, model: any) {
    this.prisma = prisma;
    this.model = model;
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create({ data });
  }

  async findAll(options?: any): Promise<T[]> {
    return this.model.findMany(options);
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({ where: { id } });
  }
}
