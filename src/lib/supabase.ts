import { createClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error('Klien Supabase hanya diizinkan berjalan di sisi server (API Route / Server Component).');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Utamakan SUPABASE_SERVICE_ROLE_KEY agar aman saat Row Level Security (RLS) diaktifkan penuh di Supabase
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
