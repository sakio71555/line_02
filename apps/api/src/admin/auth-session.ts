import type { AuthUserIdentity } from "@amami-line-crm/domain";

import type { AdminAuthError } from "./auth-error-response";

export type AuthSessionErrorCode =
  | "missing_authorization_header"
  | "invalid_authorization_header"
  | "missing_bearer_token"
  | "invalid_bearer_token"
  | "session_expired"
  | "authenticated_staff_required";

export type AuthSessionVerifierFailureCode =
  | "invalid_bearer_token"
  | "session_expired"
  | "authenticated_staff_required";

export interface AuthSessionError {
  code: AuthSessionErrorCode;
}

export type BearerTokenExtractionResult =
  | { ok: true; token: string }
  | { ok: false; error: AuthSessionError };

export type AuthSessionVerifierResult =
  | { ok: true; authUser: AuthUserIdentity }
  | { ok: false; error: { code: AuthSessionVerifierFailureCode } };

export interface AuthSessionVerifier {
  verifyBearerToken(token: string): Promise<AuthSessionVerifierResult | AuthUserIdentity | null>;
}

export type AuthSessionExtractionResult =
  | { ok: true; authUser: AuthUserIdentity }
  | { ok: false; error: AuthSessionError };

export interface ExtractAdminAuthSessionInput {
  authorizationHeader: string | null | undefined;
  verifier: AuthSessionVerifier;
}

export function extractBearerToken(
  authorizationHeader: string | null | undefined
): BearerTokenExtractionResult {
  const rawHeader = authorizationHeader?.trim();

  if (!rawHeader) {
    return authSessionFailure("missing_authorization_header");
  }

  const parts = rawHeader.split(/\s+/u);
  const scheme = parts[0]?.toLowerCase();

  if (scheme !== "bearer") {
    return authSessionFailure("invalid_authorization_header");
  }

  if (parts.length === 1) {
    return authSessionFailure("missing_bearer_token");
  }

  if (parts.length !== 2) {
    return authSessionFailure("invalid_authorization_header");
  }

  const token = parts[1]?.trim();

  if (!token) {
    return authSessionFailure("missing_bearer_token");
  }

  return {
    ok: true,
    token
  };
}

export async function extractAdminAuthSession(
  input: ExtractAdminAuthSessionInput
): Promise<AuthSessionExtractionResult> {
  const tokenResult = extractBearerToken(input.authorizationHeader);

  if (!tokenResult.ok) {
    return tokenResult;
  }

  const verifierResult = await input.verifier.verifyBearerToken(tokenResult.token);

  if (verifierResult === null) {
    return authSessionFailure("authenticated_staff_required");
  }

  if (isAuthSessionVerifierResult(verifierResult)) {
    if (!verifierResult.ok) {
      return authSessionFailure(verifierResult.error.code);
    }

    return normalizeAuthUserIdentity(verifierResult.authUser);
  }

  return normalizeAuthUserIdentity(verifierResult);
}

export function mapAuthSessionErrorToAdminAuthError(error: AuthSessionError): AdminAuthError {
  if (error.code === "session_expired") {
    return { code: "session_expired" };
  }

  return { code: "authenticated_staff_required" };
}

function isAuthSessionVerifierResult(
  value: AuthSessionVerifierResult | AuthUserIdentity
): value is AuthSessionVerifierResult {
  return typeof value === "object" && value !== null && "ok" in value;
}

function normalizeAuthUserIdentity(authUser: AuthUserIdentity): AuthSessionExtractionResult {
  const authUserId = authUser.authUserId.trim();

  if (!authUserId) {
    return authSessionFailure("authenticated_staff_required");
  }

  if ("email" in authUser) {
    return {
      ok: true,
      authUser: {
        authUserId,
        email: authUser.email
      }
    };
  }

  return {
    ok: true,
    authUser: {
      authUserId
    }
  };
}

function authSessionFailure(code: AuthSessionErrorCode): { ok: false; error: AuthSessionError } {
  return {
    ok: false,
    error: { code }
  };
}
