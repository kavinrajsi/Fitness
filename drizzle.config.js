import { defineConfig } from 'drizzle-kit'

// drizzle-kit config for the Neon database. Used in Phase 2+ to generate/apply migrations
// from src/lib/db/schema.js. Reads the pooled Neon connection string from the environment.
export default defineConfig({
  schema: './src/lib/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
})
