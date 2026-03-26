// src/dto/auth/sign-in.ts
import { IsNotEmpty, IsEmail } from 'class-validator';
import { OrganizationType } from '../../types/organization-types.js';
import { SystemRoleType } from '../../types/role-types.js';

export class SignInDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

// src/dto/auth/sign-in.ts
export interface SignInResponse {
  token: string;
  refresh_token: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    status: string;
    organization?: {
      id: number;
      name: string;
      type: OrganizationType;
    };
    roles: SystemRoleType[];
    is_email_verified: boolean;
  };
}
