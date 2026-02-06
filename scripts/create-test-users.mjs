#!/usr/bin/env node
/**
 * Create test auth users in Supabase
 *
 * Run: node scripts/create-test-users.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * For local: these are printed when you run `npx supabase start`
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nFor local Supabase, run `npx supabase start` and copy the values.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test users to create (matching seed-data.ts)
const TEST_USERS = [
  { email: 'test-free-athlete@voicefit.ai', password: 'testpass123', name: 'Free Tier Athlete' },
  { email: 'test-premium-athlete@voicefit.ai', password: 'testpass123', name: 'Premium Tier Athlete' },
  { email: 'test-coach@voicefit.ai', password: 'testpass123', name: 'Test Coach' },
  { email: 'test-client-1@voicefit.ai', password: 'testpass123', name: 'Client One' },
  { email: 'test-client-2@voicefit.ai', password: 'testpass123', name: 'Client Two' },
  { email: 'coach@voicefit.demo', password: 'testpass123', name: 'Demo Coach' },
];

async function createTestUsers() {
  console.log('🔐 Creating test auth users in Supabase...\n');
  console.log(`   Supabase URL: ${supabaseUrl}\n`);

  const results = [];

  for (const user of TEST_USERS) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const exists = existingUsers?.users?.some(u => u.email === user.email);

      if (exists) {
        console.log(`⏭️  ${user.email} - already exists`);
        results.push({ email: user.email, status: 'exists' });
        continue;
      }

      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { name: user.name },
      });

      if (error) {
        console.error(`❌ ${user.email} - ${error.message}`);
        results.push({ email: user.email, status: 'error', error: error.message });
      } else {
        console.log(`✅ ${user.email} - created`);
        results.push({ email: user.email, status: 'created', id: data.user?.id });
      }
    } catch (err) {
      console.error(`❌ ${user.email} - ${err.message}`);
      results.push({ email: user.email, status: 'error', error: err.message });
    }
  }

  console.log('\n========================================');
  console.log('📋 Test User Credentials');
  console.log('========================================\n');

  console.log('All users have password: testpass123\n');

  console.log('| Email                              | Role            |');
  console.log('|------------------------------------|-----------------|');
  for (const user of TEST_USERS) {
    const role = user.name.includes('Coach') ? 'Coach' :
                 user.name.includes('Client') ? 'Client' : 'Athlete';
    console.log(`| ${user.email.padEnd(34)} | ${role.padEnd(15)} |`);
  }

  console.log('\n✨ Done!');

  const created = results.filter(r => r.status === 'created').length;
  const existed = results.filter(r => r.status === 'exists').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log(`   Created: ${created}, Already existed: ${existed}, Errors: ${errors}`);
}

createTestUsers().catch(console.error);
