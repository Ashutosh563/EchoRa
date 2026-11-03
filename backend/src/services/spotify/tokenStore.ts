import fs from "node:fs";
import path from "node:path";

/**
 * Only OAuth tokens are persisted. No Spotify content/metadata is ever stored.
 */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds when the access token expires. */
  expiresAt: number;
}

export interface TokenStore {
  load(): StoredTokens | null;
  save(tokens: StoredTokens): void;
  clear(): void;
}

function isStoredTokens(value: unknown): value is StoredTokens {
  const v = value as StoredTokens;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.accessToken === "string" &&
    typeof v.refreshToken === "string" &&
    v.refreshToken.length > 0 &&
    typeof v.expiresAt === "number"
  );
}

/**
 * File-backed store (backend/.data/spotify-token.json, gitignored).
 * Directory is 0700 and file is 0600 so only the current OS user can read it.
 */
export function createFileTokenStore(filePath: string): TokenStore {
  let cache: StoredTokens | null | undefined;

  return {
    load() {
      if (cache !== undefined) return cache;
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
        cache = isStoredTokens(parsed) ? parsed : null;
      } catch {
        cache = null;
      }
      return cache;
    },
    save(tokens) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
      fs.writeFileSync(filePath, JSON.stringify(tokens), { encoding: "utf8", mode: 0o600 });
      fs.chmodSync(filePath, 0o600);
      cache = tokens;
    },
    clear() {
      fs.rmSync(filePath, { force: true });
      cache = null;
    },
  };
}

/** In-memory store, used by tests. */
export function createMemoryTokenStore(initial: StoredTokens | null = null): TokenStore {
  let tokens = initial;
  return {
    load: () => tokens,
    save: (t) => {
      tokens = t;
    },
    clear: () => {
      tokens = null;
    },
  };
}

