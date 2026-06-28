import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';

/** All granular permissions an admin/staff account can hold. */
export const PERMISSIONS = [
  'manage_staff',     // add/edit/deactivate staff, change roles & permissions
  'manage_products',  // sync, edit, toggle products
  'manage_orders',    // view & update orders
  'view_sessions',    // view WhatsApp / bot sessions & messages
  'send_broadcast',   // send WhatsApp broadcasts
  'view_analytics',   // view analytics & customer behavior
  'manage_settings',  // change store settings
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Default permission bundles per role. owner implicitly has everything. */
export const ROLE_DEFAULTS: Record<string, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: [...PERMISSIONS],
  manager: ['manage_products', 'manage_orders', 'view_sessions', 'view_analytics'],
  staff: ['manage_orders', 'view_sessions'],
};

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    permissions: string[];
  };
}

/** True if an account effectively has a permission (owner has all). */
export function hasPermission(
  admin: { role: string; permissions: string[] } | undefined,
  perm: Permission
): boolean {
  if (!admin) return false;
  if (admin.role === 'owner') return true;
  return Array.isArray(admin.permissions) && admin.permissions.includes(perm);
}

/**
 * Authenticate the request. The JWT only carries the id; we re-load the account
 * from the DB on every request so that deactivation and permission changes take
 * effect immediately — a revoked account cannot keep using an unexpired token.
 */
export const requireAdmin = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token =
    req.headers.authorization?.replace('Bearer ', '') || (req as any).cookies?.admin_token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as any;
    const { rows } = await db.query(
      `SELECT id, email, name, role, permissions, active FROM admins WHERE id=$1`,
      [decoded.id]
    );
    const admin = rows[0];
    if (!admin) {
      res.status(401).json({ error: 'Account no longer exists' });
      return;
    }
    if (admin.active === false) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }
    req.admin = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role || 'staff',
      permissions: admin.permissions || [],
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Guard a route behind a specific permission. */
export const requirePermission =
  (perm: Permission) =>
  (req: AdminRequest, res: Response, next: NextFunction): void => {
    if (!hasPermission(req.admin, perm)) {
      res.status(403).json({ error: `Missing permission: ${perm}` });
      return;
    }
    next();
  };

/** Guard a route so only an owner can use it. */
export const requireOwner = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.admin?.role !== 'owner') {
    res.status(403).json({ error: 'Owner access required' });
    return;
  }
  next();
};
