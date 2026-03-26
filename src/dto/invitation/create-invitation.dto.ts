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
  name?: string;

  @IsOptional()
  @IsEnum(['SEC', 'CPS', 'SUR'])
  entite?: 'SEC' | 'CPS' | 'SUR';

  @IsOptional()
  @IsString()
  message?: string;
}
