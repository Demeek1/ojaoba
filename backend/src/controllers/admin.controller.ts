import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { AdminRequest, PERMISSIONS, ROLE_DEFAULTS, Permission } from '../middleware/auth';
import { writeAudit, clientIp } from '../services/audit.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Auth ────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
    const { rows } = await db.query(`SELECT * FROM admins WHERE email=$1`, [String(email).toLowerCase()]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      await writeAudit(undefined, 'login.failed', { metadata: { email }, ip: clientIp(req) });
      res.status(401).json({ error: 'Invalid email or password' }); return;
    }
    if (admin.active === false) {
      await writeAudit({ id: admin.id, email: admin.email }, 'login.blocked_inactive', { ip: clientIp(req) });
      res.status(403).json({ error: 'Your account has been deactivated. Contact the store owner.' }); return;
    }
    await db.query(`UPDATE admins SET last_login=NOW() WHERE id=$1`, [admin.id]);
    await writeAudit({ id: admin.id, email: admin.email }, 'login.success', { ip: clientIp(req) });
    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.ADMIN_JWT_SECRET!, { expiresIn: '7d' });
    res.json({
      token,
      admin: {
        id: admin.id, email: admin.email, name: admin.name,
        role: admin.role || 'staff', permissions: admin.permissions || [],
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const me = async (req: AdminRequest, res: Response): Promise<void> => {
  const { rows } = await db.query(
    `SELECT id, email, name, role, permissions, last_login, created_at FROM admins WHERE id=$1`,
    [req.admin!.id]
  );
  res.json(rows[0] || null);
};

export const changeMyPassword = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' }); return;
    }
    const { rows } = await db.query(`SELECT password_hash FROM admins WHERE id=$1`, [req.admin!.id]);
    if (!rows[0] || !(await bcrypt.compare(currentPassword || '', rows[0].password_hash))) {
      res.status(401).json({ error: 'Current password is incorrect' }); return;
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE admins SET password_hash=$1 WHERE id=$2`, [hash, req.admin!.id]);
    await writeAudit(req.admin, 'staff.changed_own_password', { ip: clientIp(req) });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// ── Staff management (requires manage_staff) ────────────────────────────────
export const listStaff = async (_req: AdminRequest, res: Response): Promise<void> => {
  const { rows } = await db.query(
    `SELECT id, email, name, role, permissions, active, last_login, created_at
       FROM admins ORDER BY created_at ASC`
  );
  res.json({ staff: rows, roles: Object.keys(ROLE_DEFAULTS), permissions: PERMISSIONS });
};

function sanitizePermissions(input: any): Permission[] {
  if (!Array.isArray(input)) return [];
  return input.filter((p: any): p is Permission => (PERMISSIONS as readonly string[]).includes(p));
}

export const createStaff = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    let { email, name, password, role, permissions } = req.body;
    email = String(email || '').toLowerCase().trim();
    role = String(role || 'staff');
    if (!EMAIL_RE.test(email)) { res.status(400).json({ error: 'Valid email required' }); return; }
    if (!password || String(password).length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }
    if (!ROLE_DEFAULTS[role]) { res.status(400).json({ error: 'Invalid role' }); return; }
    // Only an owner may mint another owner/admin
    if ((role === 'owner' || role === 'admin') && req.admin!.role !== 'owner') {
      res.status(403).json({ error: 'Only the owner can create owner/admin accounts' }); return;
    }
    const exists = await db.query(`SELECT 1 FROM admins WHERE email=$1`, [email]);
    if (exists.rows.length) { res.status(409).json({ error: 'An account with this email already exists' }); return; }

    const perms = role === 'owner' ? ROLE_DEFAULTS.owner
      : sanitizePermissions(permissions?.length ? permissions : ROLE_DEFAULTS[role]);
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.query(
      `INSERT INTO admins (id, email, password_hash, name, role, permissions, active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
      [id, email, hash, name || null, role, perms, req.admin!.id]
    );
    await writeAudit(req.admin, 'staff.created', { targetType: 'admin', targetId: id, metadata: { email, role, permissions: perms }, ip: clientIp(req) });
    res.status(201).json({ id, email, name: name || null, role, permissions: perms, active: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const updateStaff = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, permissions, active, password } = req.body;
    const { rows } = await db.query(`SELECT * FROM admins WHERE id=$1`, [id]);
    const target = rows[0];
    if (!target) { res.status(404).json({ error: 'Staff member not found' }); return; }

    // Guard rails: the owner account is protected from tampering
    if (target.role === 'owner') {
      if (req.admin!.role !== 'owner') { res.status(403).json({ error: 'Cannot modify the owner account' }); return; }
      if (active === false || (role && role !== 'owner')) {
        res.status(400).json({ error: 'The owner account cannot be demoted or deactivated' }); return;
      }
    }
    // Only an owner can grant owner/admin roles
    if (role && (role === 'owner' || role === 'admin') && req.admin!.role !== 'owner') {
      res.status(403).json({ error: 'Only the owner can assign owner/admin roles' }); return;
    }
    // Nobody can deactivate themselves (avoid lockout)
    if (active === false && id === req.admin!.id) {
      res.status(400).json({ error: 'You cannot deactivate your own account' }); return;
    }

    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (name !== undefined)   { sets.push(`name=$${i++}`); vals.push(name); }
    if (role !== undefined && ROLE_DEFAULTS[role]) { sets.push(`role=$${i++}`); vals.push(role); }
    if (permissions !== undefined) {
      const perms = role === 'owner' ? ROLE_DEFAULTS.owner : sanitizePermissions(permissions);
      sets.push(`permissions=$${i++}`); vals.push(perms);
    }
    if (active !== undefined) { sets.push(`active=$${i++}`); vals.push(!!active); }
    if (password) {
      if (String(password).length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }
      sets.push(`password_hash=$${i++}`); vals.push(await bcrypt.hash(password, 10));
    }
    if (!sets.length) { res.status(400).json({ error: 'Nothing to update' }); return; }
    vals.push(id);
    await db.query(`UPDATE admins SET ${sets.join(', ')} WHERE id=$${i}`, vals);
    await writeAudit(req.admin, 'staff.updated', {
      targetType: 'admin', targetId: id,
      metadata: { email: target.email, changes: { name, role, permissions, active, passwordReset: !!password } },
      ip: clientIp(req),
    });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const deleteStaff = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (id === req.admin!.id) { res.status(400).json({ error: 'You cannot delete your own account' }); return; }
    const { rows } = await db.query(`SELECT email, role FROM admins WHERE id=$1`, [id]);
    const target = rows[0];
    if (!target) { res.status(404).json({ error: 'Staff member not found' }); return; }
    if (target.role === 'owner') { res.status(400).json({ error: 'The owner account cannot be deleted' }); return; }
    await db.query(`DELETE FROM admins WHERE id=$1`, [id]);
    await writeAudit(req.admin, 'staff.deleted', { targetType: 'admin', targetId: id, metadata: { email: target.email }, ip: clientIp(req) });
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

// ── Audit log (requires manage_staff) ───────────────────────────────────────
export const listAudit = async (req: AdminRequest, res: Response): Promise<void> => {
  const limit = Math.min(500, Math.max(1, parseInt((req.query.limit as string) || '100')));
  const action = req.query.action as string | undefined;
  const params: any[] = [];
  let where = '';
  if (action) { params.push(`%${action}%`); where = `WHERE action ILIKE $1`; }
  params.push(limit);
  const { rows } = await db.query(
    `SELECT id, actor_email, action, target_type, target_id, metadata, ip, created_at
       FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json({ events: rows });
};

// ── Customer behaviour analytics (requires view_analytics) ───────────────────
export const behavior = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const days = Math.min(365, Math.max(1, parseInt((req.query.days as string) || '30')));
    const since = `NOW() - INTERVAL '${days} days'`;

    const [funnelRes, topViewed, topSearches, dailyRes, aiRes, devices] = await Promise.all([
      // Funnel counts per event
      db.query(
        `SELECT event, COUNT(*)::int AS count, COUNT(DISTINCT session_id)::int AS sessions
           FROM web_events WHERE created_at > ${since} GROUP BY event`
      ),
      // Most-viewed products
      db.query(
        `SELECT w.product_id, p.title, p.image_url, COUNT(*)::int AS views
           FROM web_events w LEFT JOIN products p ON p.id = w.product_id
          WHERE w.event='product_view' AND w.product_id IS NOT NULL AND w.created_at > ${since}
          GROUP BY w.product_id, p.title, p.image_url
          ORDER BY views DESC LIMIT 10`
      ),
      // Top search terms (incl. AI-driven searches)
      db.query(
        `SELECT LOWER(query) AS term, COUNT(*)::int AS count
           FROM web_events WHERE event IN ('search','ai_search') AND query IS NOT NULL AND query <> '' AND created_at > ${since}
          GROUP BY LOWER(query) ORDER BY count DESC LIMIT 12`
      ),
      // Daily activity timeline
      db.query(
        `SELECT DATE(created_at) AS day,
                COUNT(*) FILTER (WHERE event='product_view')::int AS views,
                COUNT(*) FILTER (WHERE event='add_to_cart')::int  AS adds,
                COUNT(*) FILTER (WHERE event='checkout_start')::int AS checkouts,
                COUNT(*) FILTER (WHERE event='purchase')::int      AS purchases,
                COUNT(DISTINCT session_id)::int                    AS visitors
           FROM web_events WHERE created_at > ${since}
          GROUP BY DATE(created_at) ORDER BY day ASC`
      ),
      // AI assistant engagement
      db.query(
        `SELECT COUNT(*)::int AS messages,
                COUNT(DISTINCT session_id)::int AS conversations
           FROM ai_conversations WHERE role='user' AND created_at > ${since}`
      ),
      // Device / source split
      db.query(
        `SELECT COALESCE(metadata->>'device','unknown') AS device, COUNT(DISTINCT session_id)::int AS sessions
           FROM web_events WHERE created_at > ${since} GROUP BY device ORDER BY sessions DESC`
      ),
    ]);

    const funnelMap: Record<string, { count: number; sessions: number }> = {};
    for (const r of funnelRes.rows) funnelMap[r.event] = { count: r.count, sessions: r.sessions };
    const get = (e: string) => funnelMap[e]?.count || 0;

    const views = get('product_view');
    const adds = get('add_to_cart');
    const checkouts = get('checkout_start');
    const purchases = get('purchase');

    res.json({
      days,
      funnel: {
        visitors: funnelMap['page_view']?.sessions || 0,
        productViews: views,
        addToCart: adds,
        checkoutStart: checkouts,
        purchases,
        viewToCartRate: views ? +(adds / views * 100).toFixed(1) : 0,
        cartToCheckoutRate: adds ? +(checkouts / adds * 100).toFixed(1) : 0,
        checkoutToPurchaseRate: checkouts ? +(purchases / checkouts * 100).toFixed(1) : 0,
        overallConversion: views ? +(purchases / views * 100).toFixed(1) : 0,
      },
      topViewed: topViewed.rows,
      topSearches: topSearches.rows,
      daily: dailyRes.rows,
      ai: aiRes.rows[0] || { messages: 0, conversations: 0 },
      devices: devices.rows,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};
