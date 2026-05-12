import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      const url = process.env.SUPABASE_URL ?? '';
      const key = process.env.SUPABASE_SERVICE_KEY ?? '';
      if (!url || !key) throw new Error('[Supabase] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
      _client = createClient(url, key);
    }
    return (_client as any)[prop];
  },
});
