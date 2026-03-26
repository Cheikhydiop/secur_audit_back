// src/dto/notification/notification-preference.dto.ts
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsString,
  Matches,
  ValidateIf,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationChannel, NotificationPriority } from '../notification-types.js';

export class CreateNotificationPreferenceDto {
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsBoolean()
  enabled = true;

  @IsOptional()
  @IsEnum(NotificationPriority)
  minimumPriority?: NotificationPriority;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Quiet hours must be in HH:mm format',
  })
  quietHoursStart?: string;

  @ValidateIf((o) => o.quietHoursStart)
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Quiet hours must be in HH:mm format',
  })
  quietHoursEnd?: string;
}

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(NotificationPriority)
  minimumPriority?: NotificationPriority;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Quiet hours must be in HH:mm format',
  })
  quietHoursStart?: string;

  @ValidateIf((o) => o.quietHoursStart)
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Quiet hours must be in HH:mm format',
  })
  quietHoursEnd?: string;
}

export class NotificationPreferenceResponseDto {
  id: number;
  type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
  minimumPriority?: NotificationPriority;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAt: Date;
  user: {
    id: number;
    email: string;
  };
}

export interface BulkUpdatePreferenceItem {
  type: NotificationType;
  preferences: UpdateNotificationPreferenceDto;
}

export class BulkUpdatePreferenceItem {
  @IsEnum(NotificationType)
  type: NotificationType;

  @ValidateNested()
  @Type(() => UpdateNotificationPreferenceDto)
  preferences: UpdateNotificationPreferenceDto;
}

export class BulkUpdatePreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdatePreferenceItem)
  updates: BulkUpdatePreferenceItem[];
}

export class PreferencesByTypeDto {
  type: NotificationType;
  preferences: NotificationPreferenceResponseDto[];
}
