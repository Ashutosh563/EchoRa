/**
 * Minimal logger that redacts registered secret values from every message.
 * Secrets are registered once at startup from configuration.
 */
const secrets = new Set<string>();

export function registerSecret(value: string | undefined | null): void {
  // Ignore very short values to avoid redacting common substrings.
  if (value && value.length >= 6) secrets.add(value);
}

export function clearSecrets(): void {
  secrets.clear();
}

export function redact(text: string): string {
  let result = text;
  for (const secret of secrets) {
    result = result.split(secret).join("[REDACTED]");
  }
  return result;
}

function format(args: unknown[]): string {
  return redact(
    args
      .map((arg) => {
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        if (typeof arg === "string") return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" "),
  );
}

const silent = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

export const logger = {
  info: (...args: unknown[]) => {
    if (!silent) console.log(`[echora] ${format(args)}`);
  },
  warn: (...args: unknown[]) => {
    if (!silent) console.warn(`[echora] WARN ${format(args)}`);
  },
  error: (...args: unknown[]) => {
    if (!silent) console.error(`[echora] ERROR ${format(args)}`);
  },
};

