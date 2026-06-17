import type { AuthUserIdentity } from "@amami-line-crm/domain";

import type {
  AuthSessionVerifier,
  AuthSessionVerifierFailureCode,
  AuthSessionVerifierResult
} from "./auth-session";

export interface SupabaseAuthUserLike {
  id?: string | null;
  email?: string | null;
}

export interface SupabaseAuthGetUserResultLike {
  data?: {
    user?: SupabaseAuthUserLike | null;
  } | null;
  error?: unknown;
}

export interface SupabaseAuthClientLike {
  auth: {
    getUser(accessToken: string): Promise<SupabaseAuthGetUserResultLike>;
  };
}

export class SupabaseAuthSessionVerifier implements AuthSessionVerifier {
  constructor(private readonly client: SupabaseAuthClientLike) {}

  async verifyBearerToken(token: string): Promise<AuthSessionVerifierResult> {
    const accessToken = token.trim();

    if (!accessToken) {
      return authVerifierFailure("invalid_bearer_token");
    }

    try {
      const result = await this.client.auth.getUser(accessToken);

      if (result.error) {
        return authVerifierFailure("session_expired");
      }

      return authUserIdentityFromSupabaseUser(result.data?.user ?? null);
    } catch {
      return authVerifierFailure("session_expired");
    }
  }
}

export function createSupabaseAuthSessionVerifier(
  client: SupabaseAuthClientLike
): SupabaseAuthSessionVerifier {
  return new SupabaseAuthSessionVerifier(client);
}

function authUserIdentityFromSupabaseUser(
  user: SupabaseAuthUserLike | null
): AuthSessionVerifierResult {
  const authUserId = user?.id?.trim();

  if (!authUserId) {
    return authVerifierFailure("session_expired");
  }

  const authUser: AuthUserIdentity = {
    authUserId
  };

  if (user && "email" in user) {
    authUser.email = user.email ?? null;
  }

  return {
    ok: true,
    authUser
  };
}

function authVerifierFailure(code: AuthSessionVerifierFailureCode): AuthSessionVerifierResult {
  return {
    ok: false,
    error: { code }
  };
}
