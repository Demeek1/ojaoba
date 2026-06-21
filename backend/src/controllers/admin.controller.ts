import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { AdminRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
    const { rows } = await db.query(`SELECT * FROM admins WHERE email=$1`, [email.toLowerCase()]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password' }); return;
    }
    const role = admin.role || 'admin';
    const token = jwt.sign({ id: admin.id, email: admin.email, role }, process.env.ADMIN_JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name, role } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const me = async (req: AdminRequest, res: Response): Promise<void> => {
  const { rows } = await db.query(`SELECT id,email,name,role,created_at FROM admins WHERE id=$1`, [req.admin!.id]);
  res.json(rows[0] || null);
};

// ── Team management (super admin only) ──────────────────────────────────────────

// List all admins on the team.
export const listAdmins = async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query(
      `SELECT id, email, name, role, created_at FROM admins ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// Create a new admin. The super admin just supplies an email + password (and an
// optional display name) — the new admin can then log in immediately.
export const createAdmin = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'Email and password are required' }); return; }
    const normalized = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      res.status(400).json({ error: 'Please enter a valid email address' }); return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' }); return;
    }

    const exists = await db.query(`SELECT id FROM admins WHERE email=$1`, [normalized]);
    if (exists.rows.length) { res.status(409).json({ error: 'An admin with that email already exists' }); return; }

    const hash = await bcrypt.hash(String(password), 10);
    const id = uuidv4();
    const { rows } = await db.query(
      `INSERT INTO admins (id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, email, name, role, created_at`,
      [id, normalized, hash, name?.trim() || normalized.split('@')[0]]
    );
    res.status(201).json(rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// Remove an admin. The super admin account can never be deleted, and an admin
// cannot delete themselves.
export const deleteAdmin = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (id === req.admin!.id) { res.status(400).json({ error: 'You cannot remove your own account' }); return; }
    const { rows } = await db.query(`SELECT role FROM admins WHERE id=$1`, [id]);
    if (!rows.length) { res.status(404).json({ error: 'Admin not found' }); return; }
    if (rows[0].role === 'super_admin') { res.status(403).json({ error: 'The super admin cannot be removed' }); return; }
    await db.query(`DELETE FROM admins WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// Reset an admin's password.
export const updateAdminPassword = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' }); return;
    }
    const { rows } = await db.query(`SELECT id FROM admins WHERE id=$1`, [id]);
    if (!rows.length) { res.status(404).json({ error: 'Admin not found' }); return; }
    const hash = await bcrypt.hash(String(password), 10);
    await db.query(`UPDATE admins SET password_hash=$1 WHERE id=$2`, [hash, id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};
