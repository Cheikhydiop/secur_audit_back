import { NotificationType } from '@prisma/client';

export { NotificationType };

export enum NotificationChannel {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    PUSH = 'PUSH',
    WEB = 'WEB',
    WHATSAPP = 'WHATSAPP'
}

export enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface NotificationMetadata {
    [key: string]: any;
}

export enum NotificationStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    DELIVERED = 'DELIVERED',
    READ = 'READ',
    FAILED = 'FAILED'
}

export enum NotificationGroupType {
    SYSTEM = 'SYSTEM',
    USER = 'USER',
    MARKETING = 'MARKETING'
}
