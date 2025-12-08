import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database URL from environment
const connectionString = process.env.DATABASE_URL!;

// Create postgres connection with Supabase Transaction Pooler settings
const client = postgres(connectionString, {
  prepare: false, // Required for Transaction pooler mode
  ssl: { rejectUnauthorized: false },
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
