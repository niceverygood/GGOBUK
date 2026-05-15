import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function RootPage() {
  let hasSession = false;
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    hasSession = !!data.user;
  } catch {
    // Supabase not configured yet — fall through to login.
  }
  redirect(hasSession ? '/home' : '/login');
}
