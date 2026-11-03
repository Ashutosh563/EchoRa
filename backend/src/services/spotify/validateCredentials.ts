import { SPOTIFY_TOKEN_URL } from "./spotifyAuth.js";
import type { CredentialCheck } from "../../types/credentials.js";

/**
 * Validates the Spotify Client ID/Secret pair by requesting an app token
 * (client credentials grant). Only used to verify credentials during setup
 * and startup; the token is discarded and no catalogue data is requested.
 */
export async function validateSpotifyCredentials(
  clientId: string,
  clientSecret: string,
  fetchFn: typeof fetch = fetch,
): Promise<CredentialCheck> {
  try {
    const response = await fetchFn(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (body.error === "invalid_client" || response.status === 401) {
      return { ok: false, reason: "invalid", message: "Spotify rejected the Client ID / Client Secret." };
    }
    return { ok: false, reason: "unreachable", message: `Spotify returned HTTP ${response.status}.` };
  } catch {
    return { ok: false, reason: "unreachable", message: "Could not reach Spotify (network problem)." };
  }
}
