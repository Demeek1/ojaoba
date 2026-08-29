/**
 * Provider-agnostic transactional email. Uses Resend when RESEND_API_KEY is set;
 * otherwise it's a no-op that logs (so local/dev works without a key). Swapping
 * providers later means changing only this file.
 */

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'ChatCommerce <onboarding@resend.dev>';
  if (!key) {
    console.log(`[email disabled] would send "${opts.subject}" to ${opts.to}`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) console.error('[email] send failed', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.error('[email] send error', e);
  }
}

/** Minimal branded email shell. */
export function emailLayout(title: string, body: string, cta?: { href: string; label: string }): string {
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0b150d">
    <div style="font-weight:800;font-size:20px;color:#0b150d">chatcommerce</div>
    <h1 style="font-size:22px;margin:20px 0 8px">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#334">${body}</div>
    ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:20px;background:#7ed957;color:#0b150d;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">${cta.label}</a>` : ''}
    <p style="margin-top:28px;font-size:12px;color:#889">If you didn't request this, you can ignore this email.</p>
  </div>`;
}
