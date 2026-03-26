// src/dto/auth/reactivate-account.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ReactivateAccountDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;
}
