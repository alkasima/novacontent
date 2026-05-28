import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = (config.SUPABASE_URL && config.SUPABASE_SERVICE_KEY)
  ? createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;

export function getSupabaseAuthClient() {
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return null;
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
}
