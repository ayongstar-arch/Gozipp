import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL is required in production');
  }
  console.warn('Warning: SUPABASE_URL environment variable is missing.');
}

if (process.env.NODE_ENV === 'production' && !supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in production');
}

// Client for general public/anonymous operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client with service role bypass for secure backend-only operations (e.g. database inserts, overrides)
export const supabaseAdmin = typeof window === 'undefined' && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase;
