#!/usr/bin/env node
/**
 * One-time database setup. Runs db/schema.sql against DATABASE_URL.
 * Safe to re-run — every statement is idempotent (IF NOT EXISTS / DROP+CREATE).
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/setup-db.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Pool } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
const pool = new Pool({ connectionString: url });

try {
  console.log('Applying schema…');
  await pool.query(sql);
  console.log('✅ Schema applied. ChatCommerce database is ready.');
} catch (e) {
  console.error('❌ Schema failed:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
