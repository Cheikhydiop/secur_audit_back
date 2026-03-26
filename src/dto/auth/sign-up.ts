// src/dto/auth/sign-up.ts
import { IsEmail, IsNotEmpty, IsOptional, Length, Matches, MinLength } from 'class-validator';
import { OrganizationType } from '../../types/organization-types.js';

export class SignUpDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsNotEmpty()
  first_name: string;

  @IsNotEmpty()
  last_name: string;

  @IsOptional()
  organization_type?: OrganizationType; // Si non spécifié -> HOUSE

  @IsOptional()
  organization_name?: string; // Si non spécifié -> "Maison de {first_name}"
}
