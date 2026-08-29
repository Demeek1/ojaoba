import { z } from 'zod';
import { requireVendor, hashPassword } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';
import { createToken } from '@/lib/tokens';
import { sendEmail, emailLayout, appUrl } from '@/lib/email';
import { writeAudit, teamRole } from '@/lib/audit';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    let members: any[] = [];
    try {
      members = await ownerQuery(
        `SELECT id, email, team_role, email_verified, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at`,
        [s.tid],
      );
    } catch {
      members = await ownerQuery(`SELECT id, email, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at`, [s.tid]);
    }
    return json({ members, me: s.uid, myRole: await teamRole(s.uid) });
  });
}

const Invite = z.object({ email: z.string().email(), teamRole: z.enum(['admin', 'staff']) });

export async function POST(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    if (!['owner', 'admin'].includes(await teamRole(s.uid))) return err('Only owners/admins can add team members.', 403);

    const parsed = Invite.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);
    const email = parsed.data.email.toLowerCase();

    if ((await ownerQuery(`SELECT 1 FROM users WHERE email = $1`, [email])).length) {
      return err('Someone with this email already has an account.', 409);
    }
    const tempHash = await hashPassword(randomBytes(24).toString('hex'));
    const user = (
      await ownerQuery(
        `INSERT INTO users (tenant_id, email, password_hash, role, team_role, email_verified)
         VALUES ($1,$2,$3,'vendor',$4,false) RETURNING id`,
        [s.tid, email, tempHash, parsed.data.teamRole],
      )
    )[0];

    // Invite email: a set-password link (reuses the reset flow).
    try {
      const raw = await createToken(user.id, 'reset_password', 60 * 48);
      await sendEmail({
        to: email,
        subject: `You've been added to a ChatCommerce store`,
        html: emailLayout(
          'Set your password',
          `You've been invited as a ${parsed.data.teamRole}. Set your password to sign in.`,
          { href: `${appUrl()}/reset?token=${raw}`, label: 'Set password' },
        ),
      });
    } catch { /* email optional */ }

    await writeAudit(s.tid, s.email, 'team.invite', { email, role: parsed.data.teamRole });
    return json({ ok: true });
  });
}

const Patch = z.object({ userId: z.string().uuid(), teamRole: z.enum(['admin', 'staff']) });

export async function PATCH(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    if (!['owner', 'admin'].includes(await teamRole(s.uid))) return err('Not allowed.', 403);
    const parsed = Patch.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);
    if (parsed.data.userId === s.uid) return err('You cannot change your own role.', 400);

    const target = (await ownerQuery(`SELECT team_role FROM users WHERE id=$1 AND tenant_id=$2`, [parsed.data.userId, s.tid]))[0];
    if (!target) return err('Member not found.', 404);
    if (target.team_role === 'owner') return err('The owner role cannot be changed.', 400);

    await ownerQuery(`UPDATE users SET team_role=$2 WHERE id=$1 AND tenant_id=$3`, [parsed.data.userId, parsed.data.teamRole, s.tid]);
    await writeAudit(s.tid, s.email, 'team.role_change', { userId: parsed.data.userId, role: parsed.data.teamRole });
    return json({ ok: true });
  });
}

const Del = z.object({ userId: z.string().uuid() });

export async function DELETE(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    if (!['owner', 'admin'].includes(await teamRole(s.uid))) return err('Not allowed.', 403);
    const parsed = Del.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);
    if (parsed.data.userId === s.uid) return err('You cannot remove yourself.', 400);

    const target = (await ownerQuery(`SELECT team_role, email FROM users WHERE id=$1 AND tenant_id=$2`, [parsed.data.userId, s.tid]))[0];
    if (!target) return err('Member not found.', 404);
    if (target.team_role === 'owner') return err('The owner cannot be removed.', 400);

    await ownerQuery(`DELETE FROM users WHERE id=$1 AND tenant_id=$2`, [parsed.data.userId, s.tid]);
    await writeAudit(s.tid, s.email, 'team.remove', { email: target.email });
    return json({ ok: true });
  });
}
