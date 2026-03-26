// middleware/bigIntSerializer.ts
import { Request, Response, NextFunction } from 'express';

export const bigIntSerializer = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    const jsonString = JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString(); // Convertir BigInt en string
      }
      if (value instanceof Date) {
        return value.toISOString(); // Formater les dates
      }
      return value;
    });
    
    res.setHeader('Content-Type', 'application/json');
    return res.send(jsonString);
  };
  
  next();
};

