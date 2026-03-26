import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export const generateToken = (payload : any) => {
     return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyToken = (token:string) => {
     try {
         const decoded = jwt.verify(token, JWT_SECRET);
         return decoded;
     } catch (error) {
         throw new Error('Invalid token');
     }
 };


 const blacklist = new Set<string>();

 export const isBlacklisted = (token: string): boolean => {
   return blacklist.has(token);
 };
 
 export const addToBlacklist = (token: string): void => {
   blacklist.add(token);
 };
 