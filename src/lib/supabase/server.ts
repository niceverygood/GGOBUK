import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseUrl, supabasePublicKey, supabaseServiceKey } from './env';

export async function createServerClient(opts?: { admin?: boolean }) {
  const cookieStore = await cookies();
  const key = opts?.admin ? supabaseServiceKey() : supabasePublicKey();

  return createSsrServerClient(supabaseUrl(), key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies; ignored when called from RSC context.
        }
      },
    },
  });
}
