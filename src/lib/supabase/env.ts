// Centralized Supabase env resolution.
// Supabase recently renamed `anon` keys to `publishable` keys. Support both so this app
// works with old and new dashboard onboarding flows.

function nonEmpty(v: string | undefined): string | undefined {
  return v && v.trim().length > 0 ? v : undefined;
}

export function supabaseUrl(): string {
  const v = nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!v) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return v;
}

export function supabasePublicKey(): string {
  const v =
    nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!v) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or _ANON_KEY) is not set');
  return v;
}

// Service-role key for server-side admin operations.
// Falls back to the public key when not configured — this keeps the app functional
// in local dev where only the publishable key is available, at the cost of RLS
// being enforced on the "admin" path (still fine for most routes since they act
// on the authenticated user's own rows).
export function supabaseServiceKey(): string {
  return nonEmpty(process.env.SUPABASE_SERVICE_ROLE_KEY) ?? supabasePublicKey();
}

export function isSupabaseConfigured(): boolean {
  return (
    !!nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !!(nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
      nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
  );
}
