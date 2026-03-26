// ============================================
// 1. src/errors/customErrors.ts
// ============================================

/**
 * Erreur d'authentification - 401 Unauthorized ou 403 Forbidden
 */
export class AuthenticationError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: any;
  
    constructor(message: string, details?: any) {
      super(message);
      this.name = 'AuthenticationError';
      this.statusCode = details?.statusCode || 401;
      this.code = 'AUTHENTICATION_ERROR';
      this.details = details;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Erreur de validation - 400 Bad Request
   */
  export class ValidationError extends Error {
    public readonly statusCode: number = 400;
    public readonly code: string;
    public readonly details?: any;
  
    constructor(message: string, details?: any) {
      super(message);
      this.name = 'ValidationError';
      this.code = 'VALIDATION_ERROR';
      this.details = details;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Erreur de conflit - 409 Conflict
   */
  export class ConflictError extends Error {
    public readonly statusCode: number = 409;
    public readonly code: string;
    public readonly details?: any;
  
    constructor(message: string, resource?: string, value?: string) {
      super(message);
      this.name = 'ConflictError';
      this.code = 'CONFLICT_ERROR';
      this.details = { resource, value };
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Erreur ressource non trouvée - 404 Not Found
   */
  export class NotFoundError extends Error {
    public readonly statusCode: number = 404;
    public readonly code: string;
    public readonly details?: any;
  
    constructor(resource: string, identifier?: string) {
      super(`${resource} non trouvé${identifier ? ` (${identifier})` : ''}`);
      this.name = 'NotFoundError';
      this.code = 'NOT_FOUND';
      this.details = { resource, identifier };
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Erreur de rate limiting - 429 Too Many Requests
   */
  export class RateLimitError extends Error {
    public readonly statusCode: number = 429;
    public readonly code: string;
    public readonly details?: any;
  
    constructor(message: string, rateLimitInfo?: any) {
      super(message);
      this.name = 'RateLimitError';
      this.code = 'RATE_LIMIT_EXCEEDED';
      this.details = rateLimitInfo;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Erreur de base de données - 500 Internal Server Error
   */
  export class DatabaseError extends Error {
    public readonly statusCode: number = 500;
    public readonly code: string;
    public readonly details?: any;
  
    constructor(
      message: string,
      operation?: string,
      resource?: string,
      requestId?: string,
      additionalDetails?: any
    ) {
      super(message);
      this.name = 'DatabaseError';
      this.code = 'DATABASE_ERROR';
      this.details = {
        operation,
        resource,
        requestId,
        ...additionalDetails
      };
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Erreur d'autorisation - 403 Forbidden
   */
  export class ForbiddenError extends Error {
    public readonly statusCode: number = 403;
    public readonly code: string;
    public readonly details?: any;
  
    constructor(message: string, details?: any) {
      super(message);
      this.name = 'ForbiddenError';
      this.code = 'FORBIDDEN';
      this.details = details;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  