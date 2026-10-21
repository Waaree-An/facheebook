import { createClient } from '@supabase/supabase-js';

// Prefer the modern publishable key, but accept Supabase's legacy anon key too.
// Both are client-side keys; never place a service_role/secret key in VITE_ variables.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
)?.trim();

const hasPlaceholder = Boolean(key && /^(your_|paste_|replace_with)|example/i.test(key));
export const isSupabaseConfigured = Boolean(url && key && !hasPlaceholder && /^https:\/\//i.test(url));
export const supabase = isSupabaseConfigured && url && key ? createClient(url, key) : null;
