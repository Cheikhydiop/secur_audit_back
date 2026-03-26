// ============================================
// src/errors/customErrors.ts - VERSION CORRIGÉE
// ============================================

/**
 * Classe de base pour toutes les erreurs de l'application
 */
export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract code: string;
  abstract details?: any;
  public readonly timestamp: string;

  constructor(message: string) {
    super(message);
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreur d'authentification - 401 Unauthorized
 */
export class AuthenticationError extends AppError {
  public readonly statusCode: number = 401;
  public readonly code: string = 'AUTHENTICATION_ERROR';

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Erreur de validation - 400 Bad Request
 */
export class ValidationError extends AppError {
  public readonly statusCode: number = 400;
  public readonly code: string = 'VALIDATION_ERROR';

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Erreur de conflit - 409 Conflict
 */
export class ConflictError extends AppError {
  public readonly statusCode: number = 409;
  public readonly code: string = 'CONFLICT_ERROR';

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * Erreur ressource non trouvée - 404 Not Found
 */
export class NotFoundError extends AppError {
  public readonly statusCode: number = 404;
  public readonly code: string = 'NOT_FOUND';

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Erreur de rate limiting - 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  public readonly statusCode: number = 429;
  public readonly code: string = 'RATE_LIMIT_EXCEEDED';

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Erreur de base de données - 500 Internal Server Error
 */
export class DatabaseError extends AppError {
  public readonly statusCode: number = 500;
  public readonly code: string = 'DATABASE_ERROR';

  constructor(
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Erreur d'autorisation - 403 Forbidden
 */
export class ForbiddenError extends AppError {
  public readonly statusCode: number = 403;
  public readonly code: string = 'FORBIDDEN';

  constructor(message: string, public readonly details?: any) {
    super(message);
    // ...
    this.name = 'ForbiddenError';
  }
}

export interface ValidationErrorField {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}