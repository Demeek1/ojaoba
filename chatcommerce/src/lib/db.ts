import { neon, neonConfig, Pool } from '@neondatabase/serverless';

/**
 * Database access with enforced multi-tenant isolation.
 *
 * Two entry points only:
 *   - tenantDb(tenantId): every statement runs inside a transaction that first
 *     does `SET LOCAL app.tenant_id = <id>`, activating the RLS policies in
 *     db/schema.sql. Vendor code can ONLY get a client bound to the tenant id
 *     from their signed session — never a tenant id chosen by the request body.
 *   - ownerDb(): unscoped pool for the platform owner (super-admin) and for
 *     auth/tenant-provisioning that must read across tenants. Used only behind
 *     the platform_owner role check.
 *
 * The serverless Pool keeps a WebSocket so we can run a real transaction with
 * SET LOCAL (required for RLS), which the stateless HTTP driver cannot do.
 */

neonConfig.poolQueryViaFetch = true;

function connString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return url;
}

/**
 * Unscoped query — platform owner / provisioning only.
 * The client is created lazily (on first call) so importing this module during
 * the build does not require a live DATABASE_URL.
 */
export async function ownerQuery<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const sql = neon(connString());
  const rows = await (sql as any).query(text, params);
  return rows as T[];
}

export interface TenantClient {
  query<T = any>(text: string, params?: any[]): Promise<T[]>;
  tenantId: string;
}

/**
 * Returns a client whose every query is wrapped in a transaction scoped to one
 * tenant via SET LOCAL app.tenant_id, so RLS physically blocks cross-tenant rows.
 */
export function tenantDb(tenantId: string): TenantClient {
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) {
    throw new Error('Invalid tenant id');
  }
  return {
    tenantId,
    async query<T = any>(text: string, params: any[] = []): Promise<T[]> {
      const pool = new Pool({ connectionString: connString() });
      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          // set_config(name, value, is_local=true) — scoped to this transaction
          await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
          const res = await client.query(text, params);
          await client.query('COMMIT');
          return res.rows as T[];
        } catch (e) {
          await client.query('ROLLBACK').catch(() => {});
          throw e;
        } finally {
          client.release();
        }
      } finally {
        await pool.end();
      }
    },
  };
}

/** Helper to run several statements for one tenant in a single transaction. */
export async function tenantTx<T>(
  tenantId: string,
  fn: (q: (text: string, params?: any[]) => Promise<any[]>) => Promise<T>,
): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) throw new Error('Invalid tenant id');
  const pool = new Pool({ connectionString: connString() });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
      const q = async (text: string, params: any[] = []) => (await client.query(text, params)).rows;
      const out = await fn(q);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
