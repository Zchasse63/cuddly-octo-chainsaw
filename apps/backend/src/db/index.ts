import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database URL from environment (validated at startup in index.ts)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('[FATAL] DATABASE_URL environment variable is not set');
}

// Create postgres connection with Supabase Transaction Pooler settings
const client = postgres(connectionString, {
  prepare: false, // Required for Transaction pooler mode
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in other files
export * from './schema';

// Type helpers
export type Database = typeof db;
