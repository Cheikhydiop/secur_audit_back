// src/dto/auth/user.ts
import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
// Remove non-existent entity imports
// import { Organization } from '../../entity/Organization.js';
// import { UserStatus } from '../../entity/User.js';

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
  id: string; // Prisma uses String (CUID)

  @Expose()
  name: string; // user table has name, not first_name/last_name explicitly in schema?
  // Schema has 'name', but DTO asks for first_name/last_name?
  // If schema only has 'name', we should map or use name.
  // The schema says: name String.

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
  email: string; // nullable in schema but usually required for auth users
  password?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserSingIn {
  email: string;
  password: string;
}
