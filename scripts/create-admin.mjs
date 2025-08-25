import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.mjs <email> <password>');
    process.exit(1);
  }

  // Load .env from project root
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    // Create auth user (or fetch if exists)
    let userId;
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      userId = data.user.id;
      console.log('Created user:', userId);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
        // Find existing user by iterating listUsers
        let page = 1;
        const perPage = 1000;
        let found = null;
        while (!found) {
          const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
          if (error) throw error;
          if (!data?.users?.length) break;
          found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (found) break;
          page += 1;
        }
        if (!found) {
          throw new Error('User exists but could not be retrieved via listUsers');
        }
        userId = found.id;
        console.log('User already exists:', userId);
      } else {
        throw e;
      }
    }

    // Ensure profile exists and set role=admin
    const profilePayload = {
      user_id: userId,
      email: email,
      role: 'admin',
      updated_at: new Date().toISOString(),
    };

    // Try update, if none updated then insert
    const { data: updated, error: updateErr } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('user_id', userId)
      .select('id, user_id, role')
      .maybeSingle();

    if (updateErr) throw updateErr;

    if (!updated) {
      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          ...profilePayload,
          created_at: new Date().toISOString(),
        })
        .select('id, user_id, role')
        .maybeSingle();
      if (insertErr) throw insertErr;
      console.log('Inserted profile with admin role:', inserted);
    } else {
      console.log('Updated profile to admin role:', updated);
    }

    console.log('Admin setup complete for', email);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

main();
