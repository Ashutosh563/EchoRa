/** Result of validating a credential against its provider. */
export type CredentialCheck = { ok: true } | { ok: false; reason: "invalid" | "unreachable"; message: string };

