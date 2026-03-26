// src/errors/customErrors.ts
import { RateLimitInfo } from '../utils/RateLimitInfo.js';

export class RateLimitError extends Error {
  public readonly statusCode: number = 429;
  public readonly isOperational: boolean = true;
  public readonly rateLimitInfo?: RateLimitInfo;

  constructor(
    message: string, 
    rateLimitInfo?: RateLimitInfo,
    public readonly code: string = 'RATE_LIMIT_EXCEEDED'
  ) {
    super(message);
    this.name = 'RateLimitError';
    this.rateLimitInfo = rateLimitInfo;
    
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }

  toJSON() {
    return {
      success: false,
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(this.rateLimitInfo && {
        rateLimitInfo: {
          remaining: this.rateLimitInfo.remaining,
          limit: this.rateLimitInfo.limit,
          resetTime: this.rateLimitInfo.resetTime,
          retryAfter: Math.ceil((this.rateLimitInfo.resetTime.getTime() - Date.now()) / 1000)
        }
      })
    };
  }
}