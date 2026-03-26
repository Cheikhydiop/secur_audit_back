import { z } from 'zod';

export const RegisterDTO = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+221[0-9]{9}$/, 'Numéro de téléphone invalide. Format attendu: +221XXXXXXXXX (numéro sénégalais)'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginDTO = z.object({
  email: z.string().email('Invalid email'),
  password: z.string(),
});

export const VerifyOTPDTO = z.object({
  phone: z.string(),
  code: z.string().length(6, 'OTP must be 6 digits'),
  purpose: z.enum(['LOGIN', 'RESET_PASSWORD', 'PHONE_VERIFICATION']),
});

export const RefreshTokenDTO = z.object({
  refreshToken: z.string(),
});

export type RegisterDTOType = z.infer<typeof RegisterDTO>;
export type LoginDTOType = z.infer<typeof LoginDTO>;
export type VerifyOTPDTOType = z.infer<typeof VerifyOTPDTO>;
export type RefreshTokenDTOType = z.infer<typeof RefreshTokenDTO>;
