// src/dto/auth/update-user.dto.ts
import { IsOptional, IsString, IsEnum, Length, IsPhoneNumber } from 'class-validator';
// import { Language } from '../../entity/User.js';

export enum Language {
  FR = 'fr',
  EN = 'en',
  WOLOF = 'wo'
}


export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  last_name?: string;

  @IsOptional()
  @IsOptional()
  @IsPhoneNumber(undefined, {
    message: "Le numéro de téléphone doit inclure l'indicatif du pays (ex: +221xxxxxxxxx ou +33xxxxxxxxx)",
  })
  phone_number?: string;

  @IsOptional()
  @IsEnum(Language)
  preferred_language?: Language;
}
