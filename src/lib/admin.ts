// Admin access control.
//
// A user is an admin if ANY of these are true:
//   1. their auth user id is listed in ADMIN_USER_IDS (comma-separated)
//   2. their email is listed in ADMIN_EMAILS (comma-separated, case-insensitive)
//   3. their public.users row has is_admin = true
//
// Env allowlist is the safest default (no DB write needed, controlled in
// Vercel). The is_admin column lets you grant access from the Supabase
// dashboard without a redeploy.

import { createServerClient } from '@/lib/supabase/server';

function splitEnv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function adminUserIds(): string[] {
  return splitEnv(process.env.ADMIN_USER_IDS);
}

function adminEmails(): string[] {
  return splitEnv(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase());
}

/** Whether any admin path is configured at all (env or expecting is_admin). */
export function isAdminConfigured(): boolean {
  return adminUserIds().length > 0 || adminEmails().length > 0;
}

export interface AdminCheck {
  isAdmin: boolean;
  userId: string | null;
  email: string | null;
  /** True when no env allowlist is set AND no is_admin row — guides setup. */
  needsSetup: boolean;
}

/**
 * Check the currently authenticated user against the admin allowlist.
 * Returns details so the page can render a helpful setup hint.
 */
export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, userId: null, email: null, needsSetup: false };
  }

  const email = user.email?.toLowerCase() ?? null;
  const byId = adminUserIds().includes(user.id);
  const byEmail = !!email && adminEmails().includes(email);

  let byColumn = false;
  // Only hit the DB when env allowlist didn't already match.
  if (!byId && !byEmail) {
    const { data } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    byColumn = !!data?.is_admin;
  }

  const isAdmin = byId || byEmail || byColumn;
  return {
    isAdmin,
    userId: user.id,
    email: user.email ?? null,
    needsSetup: !isAdmin && !isAdminConfigured(),
  };
}
