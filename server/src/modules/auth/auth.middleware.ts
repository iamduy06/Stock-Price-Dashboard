import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; username: string };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ message: 'Authorization token required' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ message: 'Server misconfiguration' });

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, secret) as { id: string; username: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
