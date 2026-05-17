const PRODUCTION_APP_ORIGIN = 'https://ggobuk.vercel.app';
const LOCAL_APP_ORIGIN = 'http://localhost:3000';

export function normalizeOrigin(
  value: string | undefined | null,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.origin;
  } catch {
    return null;
  }
}

export function isLocalOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    );
  } catch {
    return false;
  }
}

export function browserAppOrigin(): string {
  const current =
    typeof window === 'undefined'
      ? null
      : normalizeOrigin(window.location.origin);
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_BASE_URL);

  if (current && !isLocalOrigin(current)) return current;
  if (configured && !isLocalOrigin(configured)) return configured;
  if (process.env.NODE_ENV === 'production') return PRODUCTION_APP_ORIGIN;

  return current ?? configured ?? LOCAL_APP_ORIGIN;
}

export function serverAppOrigin(): string {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_BASE_URL);
  if (configured && !isLocalOrigin(configured)) return configured;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  if (process.env.NODE_ENV === 'production') return PRODUCTION_APP_ORIGIN;

  return configured ?? LOCAL_APP_ORIGIN;
}
