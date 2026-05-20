/**
 * Detect if running inside Capacitor iOS native shell.
 * SSR-safe: always returns false on the server.
 */
export function isNativeIOS(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() === true && cap?.getPlatform?.() === "ios";
}
