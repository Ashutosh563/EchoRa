/**
 * Application error codes and their user-facing defaults.
 * Messages are safe to show in the UI; technical details are only logged.
 */
export const ERROR_CATALOG = {
  VALIDATION_ERROR: { status: 400, message: "Please describe what you'd like to listen to." },
  INVALID_JSON: { status: 400, message: "The request could not be read. Please try again." },
  NOT_FOUND: { status: 404, message: "That endpoint does not exist." },

  GEMINI_AUTH_FAILED: {
    status: 502,
    message: "The Gemini API key was rejected. Run `npm run setup` to enter a valid key.",
  },
  GEMINI_RATE_LIMITED: {
    status: 429,
    message: "The AI service is receiving too many requests right now. Please wait a moment and try again.",
  },
  GEMINI_UNAVAILABLE: {
    status: 503,
    message: "The AI service is temporarily unavailable. Please try again shortly.",
  },
  GEMINI_INVALID_RESPONSE: {
    status: 502,
    message: "We couldn't interpret that request. Try rephrasing it.",
  },

  SPOTIFY_AUTH_REQUIRED: {
    status: 401,
    message: "Spotify is not connected. Click “Connect Spotify” to authorize the app.",
  },
  SPOTIFY_AUTH_FAILED: {
    status: 502,
    message: "Spotify rejected the configured Client ID or Client Secret. Run `npm run setup` to update them.",
  },
  SPOTIFY_FORBIDDEN: {
    status: 403,
    message:
      "Spotify denied access. Make sure the app owner has an active Spotify Premium subscription and your account is on the app's user allow-list in the Spotify Developer Dashboard.",
  },
  SPOTIFY_RATE_LIMITED: {
    status: 429,
    message: "Spotify is receiving too many requests right now. Please wait a moment and try again.",
  },
  SPOTIFY_UNAVAILABLE: {
    status: 503,
    message: "Spotify is temporarily unavailable. Please try again shortly.",
  },

  NETWORK_ERROR: {
    status: 503,
    message: "A network problem prevented the search. Check your internet connection and try again.",
  },
  INTERNAL_ERROR: { status: 500, message: "Something went wrong. Please try again." },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

