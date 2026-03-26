import { CustomError } from './custom-error.js';

export class NotFoundError extends CustomError {
  statusCode = 404;

  constructor(message = 'Not Found') {
    super(message);

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serializeErrors() {
    return { message: this.message };
  }
}
