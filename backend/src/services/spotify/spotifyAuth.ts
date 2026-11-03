import { randomBytes } from "node:crypto";
import { AppError } from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";
import type { StoredTokens, TokenStore } from "./tokenStore.js";

export const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

/** Search needs no user scopes; we request none (least privilege, no profile data). */
export const SPOTIFY_SCOPES: string[] = [];

const STATE_TTL_MS = 10 * 60 * 1000;
/** Refresh a little early to avoid using a token that expires mid-request. */
const EXPIRY_MARGIN_MS = 60 * 1000;

export interface SpotifyAuthOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenStore: TokenStore;
  fetchFn?: typeof fetch;
  now?: () => number;
  /** Reports whether Spotify accepted the client credentials. */
  onClientValidity?: (valid: boolean) => void;
}

export interface SpotifyAuth {
  /** Creates the Spotify consent URL with a single-use CSRF state value. */
  createAuthorizeUrl(): string;
  /** Validates the state, exchanges the code for tokens and stores them. */
  handleCallback(code: string, state: string): Promise<void>;
  /** Returns a valid access token, refreshing when needed. */
  getAccessToken(options?: { forceRefresh?: boolean }): Promise<string>;
  isAuthorized(): boolean;
  disconnect(): void;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export function createSpotifyAuth(options: SpotifyAuthOptions): SpotifyAuth {
  const { clientId, clientSecret, redirectUri, tokenStore } = options;
  const fetchFn = options.fetchFn ?? fetch;
  const now = options.now ?? Date.now;
  const pendingStates = new Map<string, number>();
  let refreshInFlight: Promise<string> | null = null;

  const basicAuth = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

  async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
    let response: Response;
    try {
      response = await fetchFn(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: { Authorization: basicAuth, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new AppError("NETWORK_ERROR", { detail: "Spotify token request failed", cause: err });
    }

    const body = (await response.json().catch(() => ({}))) as TokenResponse;

    if (response.ok && body.access_token) {
      options.onClientValidity?.(true);
      return body;
    }

    const detail = `Spotify token endpoint ${response.status}: ${body.error ?? "unknown"} ${body.error_description ?? ""}`;
    if (body.error === "invalid_client") {
      options.onClientValidity?.(false);
      throw new AppError("SPOTIFY_AUTH_FAILED", { detail });
    }
    if (body.error === "invalid_grant") {
      // Code expired/reused or refresh token revoked: the user must reconnect.
      throw new AppError("SPOTIFY_AUTH_REQUIRED", { detail });
    }
    if (response.status === 429) throw new AppError("SPOTIFY_RATE_LIMITED", { detail });
    if (response.status >= 500) throw new AppError("SPOTIFY_UNAVAILABLE", { detail });
    throw new AppError("SPOTIFY_AUTH_FAILED", {
      message: "Spotify authorization failed. Please try connecting Spotify again.",
      detail,
    });
  }

  function storeTokens(body: TokenResponse, previousRefreshToken?: string): StoredTokens {
    const refreshToken = body.refresh_token ?? previousRefreshToken;
    if (!body.access_token || !refreshToken) {
      throw new AppError("SPOTIFY_AUTH_FAILED", { detail: "Spotify token response missing tokens" });
    }
    const tokens: StoredTokens = {
      accessToken: body.access_token,
      refreshToken,
      expiresAt: now() + (body.expires_in ?? 3600) * 1000,
    };
    tokenStore.save(tokens);
    return tokens;
  }

  function pruneStates() {
    const t = now();
    for (const [state, expires] of pendingStates) {
      if (expires < t) pendingStates.delete(state);
    }
  }

  async function refresh(current: StoredTokens): Promise<string> {
    try {
      const body = await requestToken({ grant_type: "refresh_token", refresh_token: current.refreshToken });
      return storeTokens(body, current.refreshToken).accessToken;
    } catch (err) {
      if (err instanceof AppError && (err.code === "SPOTIFY_AUTH_REQUIRED" || err.code === "SPOTIFY_AUTH_FAILED")) {
        logger.warn("Spotify refresh token rejected; clearing stored tokens");
        tokenStore.clear();
        throw new AppError("SPOTIFY_AUTH_REQUIRED", {
          message: "Your Spotify session expired. Click “Connect Spotify” to reconnect.",
          detail: err.detail,
        });
      }
      throw err;
    }
  }

  return {
    createAuthorizeUrl() {
      pruneStates();
      const state = randomBytes(16).toString("hex");
      pendingStates.set(state, now() + STATE_TTL_MS);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
      });
      if (SPOTIFY_SCOPES.length) params.set("scope", SPOTIFY_SCOPES.join(" "));
      return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
    },

    async handleCallback(code, state) {
      pruneStates();
      if (!state || !pendingStates.has(state)) {
        throw new AppError("SPOTIFY_AUTH_FAILED", {
          message: "The Spotify authorization link expired or was invalid. Please try connecting again.",
          detail: "OAuth state mismatch",
        });
      }
      pendingStates.delete(state); // single use
      const body = await requestToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
      storeTokens(body);
    },

    async getAccessToken({ forceRefresh = false } = {}) {
      const current = tokenStore.load();
      if (!current) throw new AppError("SPOTIFY_AUTH_REQUIRED");
      if (!forceRefresh && current.expiresAt - EXPIRY_MARGIN_MS > now()) return current.accessToken;

      // De-duplicate concurrent refreshes.
      refreshInFlight ??= refresh(current).finally(() => {
        refreshInFlight = null;
      });
      return refreshInFlight;
    },

    isAuthorized() {
      return tokenStore.load() !== null;
    },

    disconnect() {
      tokenStore.clear();
    },
  };
}

