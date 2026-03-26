import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SystemRoleType } from '../../types/role-types.js';

export class CreateInvitationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(SystemRoleType)
  role: SystemRoleType;

  @IsOptional()
  @IsString()
  message?: string;
}
