// src/dto/auth/verify-email.dto.ts
import { IsString, Length, IsNotEmpty, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Le code de vérification est requis' })
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 caractères' })
  @Matches(/^[0-9]{6}$/, {
    message: 'Le code doit contenir uniquement des chiffres',
  })
  code: string;
}
