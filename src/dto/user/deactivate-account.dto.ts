// src/dto/auth/deactivate-account.dto.ts
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class DeactivateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsString()
  @MaxLength(100)
  confirmation: string;
}
