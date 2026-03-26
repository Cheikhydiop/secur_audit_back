import { PrismaClient, User, $Enums } from '@prisma/client';
import UserRole = $Enums.UserRole;
import { DatabaseError } from '../errors/customErrors.js';

export class UserRepository {
  constructor(private prisma: PrismaClient) { }

  // Méthode helper pour convertir BigInt en string de manière récursive
  private sanitizeBigInt<T>(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'bigint') {
      return String(data) as any;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeBigInt(item)) as any;
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        sanitized[key] = this.sanitizeBigInt(data[key]);
      }
      return sanitized;
    }

    return data;
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      console.log(`🔍 [UserRepository] findByEmail: "${email}" (type: ${typeof email})`);
      const user = await this.prisma.user.findUnique({
        where: { email }
      });
      return this.sanitizeBigInt(user);
    } catch (error: any) {
      console.error('❌ [UserRepository] findByEmail Error:', error);
      throw new DatabaseError(`Failed to find user by email: ${error.message}`);
    }
  }

  async findByPhone(phone: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { phone }
      });
      return this.sanitizeBigInt(user);
    } catch (error: any) {
      throw new DatabaseError(`Failed to find user by phone: ${error.message}`);
    }
  }

  async findById(userId: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
      return this.sanitizeBigInt(user);
    } catch (error: any) {
      throw new DatabaseError(`Failed to find user by ID: ${error.message}`);
    }
  }


  async create(userData: {
    name: string;
    phone: string | null;
    email: string;
    password: string;
    role?: UserRole;
    isActive?: boolean;
    isEmailVerified?: boolean;
  }): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          passwordChangedAt: new Date()
        }
      });
      return this.sanitizeBigInt(user);
    } catch (error: any) {
      throw new DatabaseError(`Failed to create user: ${error.message}`);
    }
  }

  async update(userId: string, updateData: Partial<{
    name: string;
    phone: string;
    email: string;
    password: string;
    isActive: boolean;
    isEmailVerified: boolean;
    role: UserRole;
  }>): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData
      });
      return this.sanitizeBigInt(user);
    } catch (error: any) {
      throw new DatabaseError(`Failed to update user: ${error.message}`);
    }
  }

  async updateLastLogin(userId: string, loginTime: Date): Promise<void> {
    // Note: lastLogin field removed from schema, this is now a no-op or should be removed
    // For now keeping it to avoid breaking AuthService but it won't do anything
    return;
  }

  async delete(userId: string): Promise<void> {
    try {
      // Le portefeuille sera supprimé automatiquement grâce à onDelete: Cascade
      await this.prisma.user.delete({
        where: { id: userId }
      });
    } catch (error: any) {
      throw new DatabaseError(`Failed to delete user: ${error.message}`);
    }
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{
    users: User[];
    total: number;
    pages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.user.count()
      ]);

      return this.sanitizeBigInt({
        users,
        total,
        pages: Math.ceil(total / limit)
      });
    } catch (error: any) {
      throw new DatabaseError(`Failed to fetch users: ${error.message}`);
    }
  }

  // ----------------------------------------------------
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          mustChangePassword: false
        }
      });
    } catch (error: any) {
      throw new DatabaseError(`Failed to update password for user: ${error.message}`);
    }
  }
}