import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';

export interface AdminRequest extends Request {
  admin?: { id: string; email: string; role: string };
}

export const requireAdmin = (req: AdminRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.admin_token;
  if (!token) { res.status(401).json({ error: 'Not authenticated' }); return; }
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as any;
    req.admin = { id: decoded.id, email: decoded.email, role: decoded.role || 'admin' };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Only the super admin may manage other admins. We re-check the role against the
// database (rather than trusting the token alone) so a demotion takes effect immediately.
export const requireSuperAdmin = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  requireAdmin(req, res, async () => {
    try {
      const { rows } = await db.query(`SELECT role FROM admins WHERE id=$1`, [req.admin!.id]);
      if (rows[0]?.role !== 'super_admin') {
        res.status(403).json({ error: 'Super admin access required' });
        return;
      }
      req.admin!.role = 'super_admin';
      next();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
};
