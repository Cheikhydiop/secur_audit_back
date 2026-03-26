// src/dto/auth/change-password.dto.ts
import { IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty()
  current_password: string;

  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le nouveau mot de passe doit contenir au moins une lettre minuscule, une majuscule et un chiffre',
  })
  new_password: string;
}
