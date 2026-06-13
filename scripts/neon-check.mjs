/**
 * One-off Neon connectivity check (not wired into the app or CI).
 *
 * Loads .env.local, opens the Neon serverless HTTP connection via DATABASE_URL, and runs a
 * trivial `select 1`. Run with:  node scripts/neon-check.mjs
 */
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

// Minimal .env.local loader (avoids adding a dotenv dependency just for this check).
try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
} catch {
  // no .env.local — rely on the ambient environment
}

if (!process.env.DATABASE_URL) {
  console.error('✗ DATABASE_URL is not set (.env.local / environment)')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const rows = await sql`select 1 as ok`
console.log('Neon OK:', rows[0])
