import { CustomError } from './custom-error.js';

export class RequestValidationError extends CustomError {
  statusCode = 400;

  constructor(public errors: unknown) {
    super('Invalid request parameters');

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeErrors() {
    return [{ message: 'Invalid request parameters', errors: this.errors }];
  }
}
