// types/user.ts
import { UserRole } from '@prisma/client';  // ou définis-toi UserRole si besoin

export interface Register {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: UserRole;
  // ajoute d'autres champs selon ton modèle
}

export interface Login {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  avatar?: string;
  organization?: string;
  phoneNumber?: string;
  createdAt?: string;
  lastLogin?: string;
  jobTitle?: string;
  department?: string;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

