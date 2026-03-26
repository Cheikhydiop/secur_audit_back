import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & {
        userId: string;
        email: string;
        role?: string;
      };
    }
    interface Response {
      successResponse<T>(data: T): Response;
    }
  }
}

export { };
