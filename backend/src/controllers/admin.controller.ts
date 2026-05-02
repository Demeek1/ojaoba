import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
    const { rows } = await db.query(`SELECT * FROM admins WHERE email=$1`, [email.toLowerCase()]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password' }); return;
    }
    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.ADMIN_JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const me = async (req: any, res: Response): Promise<void> => {
  const { rows } = await db.query(`SELECT id,email,name,created_at FROM admins WHERE id=$1`, [req.admin.id]);
  res.json(rows[0] || null);
};
