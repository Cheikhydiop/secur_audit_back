import { IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { NotificationChannel } from '../notification-types.js';

// src/dto/notification/update-notification.dto.ts
export class UpdateNotificationDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];
}
