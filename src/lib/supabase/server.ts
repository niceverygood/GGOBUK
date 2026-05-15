import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient(opts?: { admin?: boolean }) {
  const cookieStore = await cookies();
  const key = opts?.admin
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createSsrServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
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
