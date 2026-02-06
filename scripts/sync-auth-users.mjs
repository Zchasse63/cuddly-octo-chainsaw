#!/usr/bin/env node
/**
 * Sync Supabase auth users with database users
 *
 * This script ensures database users have the same ID as their Supabase auth counterpart.
 * Run: node scripts/sync-auth-users.mjs
 */

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load env from apps/backend
dotenv.config({ path: './apps/backend/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = postgres(databaseUrl);

async function syncUsers() {
  console.log('🔄 Syncing Supabase auth users with database...\n');

  // Get all auth users
  const { data: authUsers, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Failed to list auth users:', error);
    process.exit(1);
  }

  console.log(`Found ${authUsers.users.length} auth users\n`);

  for (const authUser of authUsers.users) {
    const email = authUser.email;
    const authId = authUser.id;

    console.log(`Processing: ${email}`);
    console.log(`  Auth ID: ${authId}`);

    // Check if user exists in database by email
    const dbUsers = await sql`SELECT id, email FROM users WHERE email = ${email}`;

    if (dbUsers.length === 0) {
      // Create user with auth ID
      console.log(`  → Creating database user with auth ID...`);
      await sql`INSERT INTO users (id, email) VALUES (${authId}, ${email}) ON CONFLICT (id) DO NOTHING`;

      // Create basic profile
      await sql`
        INSERT INTO user_profiles (user_id, name, tier)
        VALUES (${authId}, ${authUser.user_metadata?.name || 'User'}, 'coach')
        ON CONFLICT (user_id) DO NOTHING
      `;
      console.log(`  ✅ Created user and profile`);
    } else {
      const dbUser = dbUsers[0];
      if (dbUser.id !== authId) {
        console.log(`  ⚠️  ID mismatch! DB: ${dbUser.id}`);
        console.log(`  → Updating database to use auth ID...`);

        // Update the user ID to match auth ID
        // First, check if there's already a user with the auth ID
        const existingWithAuthId = await sql`SELECT id FROM users WHERE id = ${authId}`;

        if (existingWithAuthId.length > 0) {
          console.log(`  → Auth ID already exists in DB, merging...`);
          // Delete the old user record (profile will cascade)
          await sql`DELETE FROM users WHERE id = ${dbUser.id}`;
        } else {
          // Update the existing user to have the correct ID
          // Need to update in correct order due to foreign keys
          await sql`UPDATE user_profiles SET user_id = ${authId} WHERE user_id = ${dbUser.id}`;
          await sql`UPDATE users SET id = ${authId} WHERE id = ${dbUser.id}`;
        }
        console.log(`  ✅ Synced user ID`);
      } else {
        console.log(`  ✅ Already synced`);
      }
    }

    // Ensure profile exists
    const profiles = await sql`SELECT user_id FROM user_profiles WHERE user_id = ${authId}`;
    if (profiles.length === 0) {
      console.log(`  → Creating missing profile...`);
      await sql`
        INSERT INTO user_profiles (user_id, name, tier)
        VALUES (${authId}, ${authUser.user_metadata?.name || 'User'}, 'coach')
        ON CONFLICT (user_id) DO NOTHING
      `;
      console.log(`  ✅ Profile created`);
    }

    console.log('');
  }

  console.log('✨ Sync complete!');
  await sql.end();
}

syncUsers().catch(console.error);
