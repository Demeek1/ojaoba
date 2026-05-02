import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminRequest extends Request {
  admin?: { id: string; email: string };
}

export const requireAdmin = (req: AdminRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.admin_token;
  if (!token) { res.status(401).json({ error: 'Not authenticated' }); return; }
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as any;
    req.admin = { id: decoded.id, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
