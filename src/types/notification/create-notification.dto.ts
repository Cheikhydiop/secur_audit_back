import { IsEnum, IsNotEmpty, IsOptional, IsObject, IsArray, IsBoolean } from 'class-validator';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationMetadata,
} from '../notification-types.js';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsNotEmpty()
  userId: string; // Replaced User entity with userId string

  // Removed Organization as it does not exist in schema
  // organization: Organization;

  @IsOptional()
  @IsObject()
  metadata?: NotificationMetadata;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsBoolean()
  requiresAcknowledgement?: boolean;

  @IsOptional()
  expiresAt?: Date;
}
