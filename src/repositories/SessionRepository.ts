import { PrismaClient, DeviceType, SessionStatus } from '@prisma/client';
import { Request } from 'express';

export { DeviceType, SessionStatus };

// 2. Type pour les données de création de session
export interface CreateSessionData {
  userId: string;
  refreshToken: string;
  deviceType?: DeviceType;
  deviceName?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  status?: SessionStatus;
  isVerified?: boolean;
}


import { Service } from 'typedi';

@Service()
export class SessionRepository {
  constructor(private prisma: PrismaClient) { }

  async createSession(data: CreateSessionData) {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        deviceType: data.deviceType || DeviceType.UNKNOWN,
        deviceName: data.deviceName,
        deviceId: data.deviceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
        status: data.status || SessionStatus.ACTIVE,
        isVerified: data.isVerified ?? false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true
          }
        }
      }
    });
  }

  async findByRefreshToken(refreshToken: string) {
    return this.prisma.session.findFirst({
      where: {
        refreshToken,
        status: SessionStatus.ACTIVE,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true
          }
        }
      }
    });
  }

  async findActiveSessionsByUser(userId: string, limit: number = 5) {
    return this.prisma.session.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        deviceType: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  detectDeviceType(userAgent?: string): DeviceType {
    if (!userAgent) return DeviceType.UNKNOWN;

    const ua = userAgent.toLowerCase();

    if (/(tablet|ipad|playbook|silk)/i.test(ua)) {
      return DeviceType.TABLET;
    }

    if (/(mobile|android|iphone|ipod|blackberry|webos)/i.test(ua)) {
      return DeviceType.MOBILE;
    }

    if (/(windows nt|macintosh|linux|x11)/i.test(ua)) {
      return DeviceType.DESKTOP;
    }

    return DeviceType.UNKNOWN;
  }

  // Dans SessionRepository.ts - méthode extractDeviceInfoFromRequest
  extractDeviceInfoFromRequest(req: Request): {
    deviceType: DeviceType;
    userAgent?: string;
    ipAddress?: string;
  } {
    const userAgent = req.headers['user-agent'];
    const deviceType = this.detectDeviceType(userAgent);

    // Utiliser directement req.clientIp qui est maintenant toujours défini
    const ipAddress = req.clientIp;

    // Log pour débogage
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Device Info:', {
        ip: ipAddress,
        userAgent: userAgent?.substring(0, 50) + (userAgent && userAgent.length > 50 ? '...' : ''),
        deviceType
      });
    }

    return {
      deviceType,
      userAgent,
      ipAddress
    };
  }

  // MÉTHODE CORRIGÉE - Extraction d'IP améliorée
  private extractClientIp(req: Request): string | undefined {
    try {
      // 1. Vérifier le header x-forwarded-for (le plus courant derrière proxy)
      const xForwardedFor = req.headers['x-forwarded-for'];
      if (xForwardedFor) {
        // Peut être un string ou un tableau
        const ipList = Array.isArray(xForwardedFor)
          ? xForwardedFor[0]
          : xForwardedFor;

        // Prendre la première IP (celle du client)
        const clientIp = ipList.split(',')[0].trim();
        if (clientIp && clientIp !== '') {
          return clientIp;
        }
      }

      // 2. Vérifier les autres headers courants
      const headersToCheck = [
        'x-real-ip',
        'x-client-ip',
        'cf-connecting-ip', // Cloudflare
        'fastly-client-ip', // Fastly
        'true-client-ip', // Akamai
        'x-cluster-client-ip',
        'forwarded'
      ];

      for (const header of headersToCheck) {
        const value = req.headers[header];
        if (value) {
          const ip = Array.isArray(value) ? value[0] : value;
          // Extraire l'IP du header Forwarded: for=192.0.2.60;proto=http;by=203.0.113.43
          if (header === 'forwarded' && ip.includes('for=')) {
            const match = ip.match(/for=([^;,\s]+)/);
            if (match && match[1]) {
              // Enlever les guillemets et les crochets
              return match[1].replace(/^\[|\]|"/g, '');
            }
          }
          return ip;
        }
      }

      // 3. Vérifier la propriété req.ip (si Express a déjà extrait l'IP)
      if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1') {
        return req.ip;
      }

      // 4. Vérifier req.socket.remoteAddress (dernier recours)
      if (req.socket?.remoteAddress) {
        const remoteAddr = req.socket.remoteAddress;
        // Filtrer les adresses locales
        if (!['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(remoteAddr)) {
          // Enlever le préfixe IPv6-mapped IPv4
          return remoteAddr.replace('::ffff:', '');
        }
      }

      // 5. Vérifier req.connection.remoteAddress (ancienne API)
      if (req.connection?.remoteAddress) {
        const remoteAddr = req.connection.remoteAddress;
        if (!['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(remoteAddr)) {
          return remoteAddr.replace('::ffff:', '');
        }
      }

      // Si aucune IP n'a été trouvée
      console.warn('⚠️ No client IP found. Headers available:', {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'x-client-ip': req.headers['x-client-ip'],
        'cf-connecting-ip': req.headers['cf-connecting-ip'],
        'req.ip': req.ip,
        'socket.remoteAddress': req.socket?.remoteAddress,
        'connection.remoteAddress': req.connection?.remoteAddress
      });

      return 'unknown';
    } catch (error) {
      console.error('❌ Error extracting IP:', error);
      return 'unknown';
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        status: SessionStatus.ACTIVE,
        expiresAt: { lt: new Date() }
      },
      data: {
        status: SessionStatus.EXPIRED,
        updatedAt: new Date()
      }
    });

    return result.count;
  }

  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.session.deleteMany({
      where: {
        status: {
          in: [
            SessionStatus.REVOKED,
            SessionStatus.EXPIRED
          ]
        },
        updatedAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  async enforceSessionLimits(userId: string): Promise<void> {
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeSessions.length === 0) return;

    // Grouper par type d'appareil
    const sessionsByDeviceType = new Map<DeviceType, typeof activeSessions>();

    Object.values(DeviceType).forEach(type => {
      sessionsByDeviceType.set(type, []);
    });

    activeSessions.forEach(session => {
      // Convertir le string de Prisma vers votre enum
      const deviceType = this.stringToDeviceType(session.deviceType);
      const sessions = sessionsByDeviceType.get(deviceType) || [];
      sessions.push(session);
      sessionsByDeviceType.set(deviceType, sessions);
    });

    const sessionsToKeep: string[] = [];
    const sessionsToRevoke: string[] = [];

    for (const [deviceType, sessions] of sessionsByDeviceType.entries()) {
      if (sessions.length > 0) {
        sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        sessionsToKeep.push(sessions[0].id);

        if (sessions.length > 1) {
          sessionsToRevoke.push(...sessions.slice(1).map(s => s.id));
        }
      }
    }

    // Limite globale: max 5 sessions
    if (activeSessions.length > 5) {
      const allSessions = [...activeSessions]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const keepIds = allSessions.slice(0, 5).map(s => s.id);
      const revokeIds = allSessions.slice(5).map(s => s.id);

      revokeIds.forEach(id => {
        if (!sessionsToRevoke.includes(id)) {
          sessionsToRevoke.push(id);
        }
      });

      sessionsToKeep.length = 0;
      sessionsToKeep.push(...keepIds.slice(0, 5));
    }

    // Révoquer les sessions en excès
    if (sessionsToRevoke.length > 0) {
      await this.prisma.session.updateMany({
        where: {
          id: { in: sessionsToRevoke },
          status: SessionStatus.ACTIVE
        },
        data: {
          status: SessionStatus.REVOKED,
          updatedAt: new Date()
        }
      });
    }
  }

  private stringToDeviceType(value: string): DeviceType {
    switch (value) {
      case 'MOBILE': return DeviceType.MOBILE;
      case 'DESKTOP': return DeviceType.DESKTOP;
      case 'TABLET': return DeviceType.TABLET;
      default: return DeviceType.UNKNOWN;
    }
  }

  private stringToSessionStatus(value: string): SessionStatus {
    switch (value) {
      case 'ACTIVE': return SessionStatus.ACTIVE;
      case 'REVOKED': return SessionStatus.REVOKED;
      case 'EXPIRED': return SessionStatus.EXPIRED;
      default: return SessionStatus.EXPIRED;
    }
  }

  async revokeSession(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.REVOKED,
        updatedAt: new Date()
      }
    });
  }

  async revokeAllUserSessions(userId: string, excludeSessionId?: string) {
    const where: any = {
      userId,
      status: SessionStatus.ACTIVE
    };

    if (excludeSessionId) {
      where.id = { not: excludeSessionId };
    }

    const result = await this.prisma.session.updateMany({
      where,
      data: {
        status: SessionStatus.REVOKED,
        updatedAt: new Date()
      }
    });

    return result.count;
  }

  async updateSession(
    sessionId: string,
    data: Partial<{
      status: SessionStatus;
      ipAddress: string;
      userAgent: string;
      deviceType: DeviceType;
      expiresAt: Date;
    }>
  ) {
    const updateData: any = { updatedAt: new Date() };

    if (data.status) updateData.status = data.status;
    if (data.ipAddress) updateData.ipAddress = data.ipAddress;
    if (data.userAgent) updateData.userAgent = data.userAgent;
    if (data.deviceType) updateData.deviceType = data.deviceType;
    if (data.expiresAt) updateData.expiresAt = data.expiresAt;

    return this.prisma.session.update({
      where: { id: sessionId },
      data: updateData
    });
  }

  async findSessionById(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true
          }
        }
      }
    });
  }

  async getSessionStats() {
    const [
      totalSessions,
      activeSessions,
      expiredSessions,
      revokedSessions,
      byDeviceType,
      byStatus
    ] = await Promise.all([
      this.prisma.session.count(),
      this.prisma.session.count({
        where: {
          status: SessionStatus.ACTIVE,
          expiresAt: { gt: new Date() }
        }
      }),
      this.prisma.session.count({
        where: { status: SessionStatus.EXPIRED }
      }),
      this.prisma.session.count({
        where: { status: SessionStatus.REVOKED }
      }),
      this.prisma.session.groupBy({
        by: ['deviceType'],
        _count: true,
        where: { status: SessionStatus.ACTIVE }
      }),
      this.prisma.session.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    return {
      totalSessions,
      activeSessions,
      expiredSessions,
      revokedSessions,
      byDeviceType,
      byStatus
    };
  }

  async isValidSession(sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        status: SessionStatus.ACTIVE,
        expiresAt: { gt: new Date() }
      }
    });

    return !!session;
  }

  async refreshSession(sessionId: string, newExpiry: Date): Promise<boolean> {
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          expiresAt: newExpiry,
          updatedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  async rotateRefreshToken(oldToken: string, newToken: string, newExpiry: Date) {
    return this.prisma.session.update({
      where: { refreshToken: oldToken },
      data: {
        refreshToken: newToken,
        expiresAt: newExpiry,
        updatedAt: new Date()
      }
    });
  }

  async performMaintenance(): Promise<{
    expiredCleaned: number;
    oldDeleted: number;
  }> {
    const expiredCleaned = await this.cleanupExpiredSessions();
    const oldDeleted = await this.cleanupOldSessions();

    return {
      expiredCleaned,
      oldDeleted
    };
  }

  async findSessionsByUser(userId: string, options?: {
    status?: SessionStatus;
    deviceType?: DeviceType;
    limit?: number;
  }) {
    const where: any = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.deviceType) {
      where.deviceType = options.deviceType;
    }

    return this.prisma.session.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20
    });
  }

  // Méthode utilitaire pour loguer les informations de la requête
  logRequestInfo(req: Request, email: string, success: boolean = false) {
    const ip = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceType = this.detectDeviceType(userAgent);

    console.log(`📝 Login Attempt:
      📧 Email: ${email}
      ✅ Success: ${success ? 'YES' : 'NO'}
      🌐 IP: ${ip}
      🖥️  Device: ${deviceType}
      🕵️  User-Agent: ${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}
      🔗 URL: ${req.originalUrl}
      📍 Method: ${req.method}
    `);

    return { ip, userAgent, deviceType };
  }

  async isKnownDevice(userId: string, deviceId: string): Promise<boolean> {
    const count = await this.prisma.session.count({
      where: {
        userId,
        deviceId,
        isVerified: true
      }
    });
    return count > 0;
  }
}

// 4. Fonction utilitaire pour créer le repository
export function createSessionRepository(prisma: PrismaClient): SessionRepository {
  return new SessionRepository(prisma);
}