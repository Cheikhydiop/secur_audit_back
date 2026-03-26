import { CustomError } from './custom-error.js';

export class ForbiddenError extends CustomError {
  statusCode = 403;

  constructor() {
    super('Access Denied');

    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }

  serializeErrors() {
    return { message: 'Access Denied' };
  }
}
