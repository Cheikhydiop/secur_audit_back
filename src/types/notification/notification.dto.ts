// src/dto/notification/notification.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject, IsBoolean, IsNumber } from 'class-validator';
import { NotificationType, NotificationPriority, NotificationGroupType } from '../notification-types.js';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsNumber()
  recipientId?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsBoolean()
  requiresAcknowledgement?: boolean;

  @IsOptional()
  @IsEnum(NotificationGroupType)
  groupType?: NotificationGroupType;

  @IsOptional()
  @IsString()
  groupId?: string;
}
