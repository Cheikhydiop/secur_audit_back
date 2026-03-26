import {
  NotificationChannel,
  NotificationGroupType,
  NotificationMetadata,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '../notification-types.js';


// src/dto/notification/notification-response.dto.ts
export class NotificationResponseDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  status: NotificationStatus;
  priority: NotificationPriority;
  metadata?: NotificationMetadata;
  read: boolean;
  readAt?: Date;
  acknowledgedAt?: Date;
  requiresAcknowledgement: boolean;
  createdAt: Date;
  groupType?: NotificationGroupType;
  groupId?: string;
  recipient: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  organization: {
    id: number;
    name: string;
  };
}
