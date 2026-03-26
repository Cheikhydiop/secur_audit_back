// src/dto/notification/notification-filters.dto.ts
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';
import {
  NotificationGroupType,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '../notification-types.js';

export class NotificationFiltersDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationStatus, { each: true })
  status?: NotificationStatus[];

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  types?: NotificationType[];

  @IsOptional()
  from?: Date;

  @IsOptional()
  to?: Date;

  @IsOptional()
  @IsArray()
  priority?: NotificationPriority[];

  @IsOptional()
  @IsBoolean()
  requiresAcknowledgement?: boolean;

  @IsOptional()
  @IsEnum(NotificationGroupType)
  groupType?: NotificationGroupType;

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;

  @IsOptional()
  order?: 'ASC' | 'DESC';
}
