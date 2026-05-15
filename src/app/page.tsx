import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function RootPage() {
  // If Supabase isn't configured, show splash → login flow.
  const { isSupabaseConfigured } = await import('@/lib/supabase/env');
  if (!isSupabaseConfigured()) {
    redirect('/splash');
  }
  let hasSession = false;
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    hasSession = !!data.user;
  } catch {
    // ignore
  }
  redirect(hasSession ? '/home' : '/splash');
}
