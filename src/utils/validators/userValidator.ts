/**
 * User validation utilities for SmartAudit DG-SECU/Sonatel
 */

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
}

export default class UserValidator {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    // Allow emails with or without TLD (e.g., admin@sonatel or admin@sonatel.sn)
    const emailRegex = /^[^\s@]+@[^\s@]+(\.[^\s@]+)*$/;
    return emailRegex.test(email);
  }

  /**
   * Validate strong password:
   * - Minimum 12 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one digit
   * - At least one special character
   */
  static validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Le mot de passe doit contenir au moins 12 caractères');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }

    let strength: PasswordValidationResult['strength'] = 'weak';
    if (errors.length === 0) {
      const score = [
        password.length >= 16,
        /[A-Z].*[A-Z]/.test(password),
        /[0-9].*[0-9]/.test(password),
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?].*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      ].filter(Boolean).length;

      if (score >= 3) strength = 'very_strong';
      else if (score >= 2) strength = 'strong';
      else strength = 'medium';
    }

    return {
      valid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * Validate phone number (Senegal format)
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+221|00221)?[7][0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Sanitize a name (trim + capitalize)
   */
  static sanitizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  /**
   * Validate login data
   */
  static validateLogin(data: LoginData): LoginData {
    if (!data.email || !UserValidator.isValidEmail(data.email)) {
      throw new Error('Email invalide');
    }
    if (!data.password) {
      throw new Error('Mot de passe requis');
    }
    return { email: data.email.toLowerCase().trim(), password: data.password };
  }

  /**
   * Validate registration data
   */
  static validateRegister(data: RegisterData): RegisterData {
    if (!data.email || !UserValidator.isValidEmail(data.email)) {
      throw new Error('Email invalide');
    }
    const pwValidation = UserValidator.validatePassword(data.password);
    if (!pwValidation.valid) {
      throw new Error(pwValidation.errors.join('. '));
    }
    if (!data.name || data.name.trim().length < 2) {
      throw new Error('Le nom doit contenir au moins 2 caractères');
    }
    return {
      email: data.email.toLowerCase().trim(),
      password: data.password,
      name: UserValidator.sanitizeName(data.name),
      phone: data.phone?.trim()
    };
  }
}
