// src/dto/auth/session.dto.ts
import { IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty()
  refresh_token: string;
}

export interface SessionDto {
  id: number;
  device_info?: string;
  ip_address?: string;
  created_at: Date;
  expires_at: Date;
  status: string;
}

export interface SessionResponse {
  sessions: SessionDto[];
}
