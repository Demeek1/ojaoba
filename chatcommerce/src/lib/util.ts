import { NextResponse } from 'next/server';
import { AuthError } from './auth';

export function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route handler so AuthError → proper status and unexpected errors → 500. */
export async function guard(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e: any) {
    if (e instanceof AuthError) return err(e.message, e.status);
    console.error('[api error]', e?.message ?? e);
    return err('Internal error', 500);
  }
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'store';
}
