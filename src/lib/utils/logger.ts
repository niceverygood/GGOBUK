/**
 * Structured logging abstraction.
 *
 * - Development: routes to console.warn / console.error.
 * - Production: forwards to Sentry (if DSN configured) and PostHog (if key configured).
 *
 * Dependencies are dynamically imported so they don't break the build when not installed.
 * Install when ready:
 *   pnpm add @sentry/nextjs   (error tracking)
 *   pnpm add posthog-node     (server-side analytics)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sentry: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _posthog: any = null;
let _initialized = false;

async function ensureInit() {
  if (_initialized) return;
  _initialized = true;

  // Sentry — server-side only.
  if (process.env.SENTRY_DSN && typeof window === "undefined") {
    try {
      // @ts-expect-error — @sentry/nextjs is an optional peer dependency
      const Sentry = await import(/* turbopackIgnore: true */ "@sentry/nextjs");
      if (!Sentry.isInitialized()) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          tracesSampleRate: 0.1,
          environment: process.env.NODE_ENV ?? "development",
        });
      }
      _sentry = Sentry;
    } catch {
      // @sentry/nextjs not installed — skip silently.
    }
  }

  // PostHog — server-side capture via REST.
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY && typeof window === "undefined") {
    try {
      // @ts-expect-error — posthog-node is an optional peer dependency
      const mod = await import(/* turbopackIgnore: true */ "posthog-node");
      _posthog = new mod.PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        host: "https://us.i.posthog.com",
        flushAt: 10,
        flushInterval: 5_000,
      });
    } catch {
      // posthog-node not installed — skip silently.
    }
  }
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta) return "";
  try {
    return " " + JSON.stringify(meta);
  } catch {
    return "";
  }
}

export const logger = {
  warn(tag: string, message: string, meta?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.warn(`[${tag}] ${message}${formatMeta(meta)}`);

    void ensureInit().then(() => {
      _sentry?.addBreadcrumb?.({
        category: tag,
        message,
        level: "warning",
        data: meta,
      });

      _posthog?.capture?.({
        distinctId: (meta?.userId as string) ?? "server",
        event: "server_warning",
        properties: { tag, message, ...meta },
      });
    });
  },

  error(tag: string, message: string, meta?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.error(`[${tag}] ${message}${formatMeta(meta)}`);

    void ensureInit().then(() => {
      _sentry?.captureException?.(new Error(`[${tag}] ${message}`), {
        tags: { component: tag },
        extra: meta,
      });

      _posthog?.capture?.({
        distinctId: (meta?.userId as string) ?? "server",
        event: "server_error",
        properties: { tag, message, ...meta },
      });
    });
  },
};
