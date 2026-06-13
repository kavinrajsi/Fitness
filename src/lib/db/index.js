/**
 * Neon (Postgres) data client — Phase 1 of the Supabase→Neon data migration.
 *
 * SERVER-ONLY. Uses the Neon serverless HTTP driver over the POOLED connection string
 * (`DATABASE_URL`), wrapped with Drizzle ORM. Not yet used by the app — Supabase remains the
 * live data + auth layer until later migration phases. Supabase Auth stays regardless.
 *
 * `db`  — Drizzle query client (typed once schema.js is filled out).
 * `sql` — raw tagged-template SQL for one-off queries / health checks.
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql, { schema })
