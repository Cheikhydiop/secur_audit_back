import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isGet = req.method === 'GET';
      const dataToValidate = isGet ? req.query : req.body;

      const validatedData = await schema.parseAsync(dataToValidate);

      if (isGet) {
        // req.query is sometimes read-only/getter-only in some Express environments
        // We update properties instead of replacing the object
        Object.assign(req.query, validatedData);
      } else {
        req.body = validatedData;
      }

      next();
    } catch (error: any) {
      const errors = error.errors?.map((e: any) => ({
        path: e.path.join('.'),
        message: e.message,
      }));

      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }
  };
};
