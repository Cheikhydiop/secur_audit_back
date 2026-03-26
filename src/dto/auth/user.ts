// src/dto/auth/user.ts
import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SignUpDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  first_name: string;

  @IsNotEmpty()
  last_name: string;
}

export class SignInDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

@Exclude()
export class UserDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  role: string;

  @Expose()
  isActive: boolean;

  @Expose()
  isEmailVerified: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserSingIn {
  email: string;
  password: string;
}
