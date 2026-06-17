import type { AdminApiConfig, AdminApiRequestOptions } from "./admin-api";
import type { AdminAccessTokenProvider } from "./admin-auth-token";

export type AdminSessionOperation =
  | "sign_in"
  | "read_session"
  | "refresh_session"
  | "logout";

export type AdminSessionErrorCode =
  | "invalid_login_input"
  | "login_failed"
  | "session_unavailable"
  | "refresh_failed"
  | "logout_failed";

export interface AdminSessionUser {
  id: string | null;
  email: string | null;
}

export interface AdminSessionStatus {
  isAuthenticated: boolean;
  user: AdminSessionUser | null;
  expiresAt: number | null;
}

export type AdminSessionResult =
  | {
      ok: true;
      session: AdminSessionStatus;
    }
  | {
      ok: false;
      error: {
        code: AdminSessionErrorCode;
        operation: AdminSessionOperation;
        message: string;
      };
    };

export interface AdminSupabaseAuthSessionLike {
  access_token?: string | null;
  expires_at?: number | null;
  user?: {
    id?: string | null;
    email?: string | null;
  } | null;
}

export interface AdminSupabaseAuthResultLike {
  data?: {
    session?: AdminSupabaseAuthSessionLike | null;
  } | null;
  error?: unknown;
}

export interface AdminSupabaseSignOutResultLike {
  error?: unknown;
}

export interface AdminSupabaseAuthClientLike {
  auth: {
    signInWithPassword(input: {
      email: string;
      password: string;
    }): Promise<AdminSupabaseAuthResultLike>;
    getSession(): Promise<AdminSupabaseAuthResultLike>;
    refreshSession(): Promise<AdminSupabaseAuthResultLike>;
    signOut(): Promise<AdminSupabaseSignOutResultLike>;
  };
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface AdminSessionController {
  signIn(input: AdminLoginCredentials): Promise<AdminSessionResult>;
  getSession(): Promise<AdminSessionResult>;
  refreshSession(): Promise<AdminSessionResult>;
  logout(): Promise<AdminSessionResult>;
  accessTokenProvider: AdminAccessTokenProvider;
}

const SAFE_AUTH_MESSAGE = "Admin session operation failed.";

export function createAdminSessionController(
  client: AdminSupabaseAuthClientLike
): AdminSessionController {
  return {
    signIn: (input) => signInAdminSession(client, input),
    getSession: () => getAdminSession(client),
    refreshSession: () => refreshAdminSession(client),
    logout: () => logoutAdminSession(client),
    accessTokenProvider: createAdminSessionAccessTokenProvider(client)
  };
}

export async function signInAdminSession(
  client: AdminSupabaseAuthClientLike,
  input: AdminLoginCredentials
): Promise<AdminSessionResult> {
  const email = input.email.trim();
  const password = input.password;

  if (!email || !password) {
    return adminSessionFailure("invalid_login_input", "sign_in");
  }

  try {
    const result = await client.auth.signInWithPassword({ email, password });

    return toAdminSessionResult(result, "sign_in", "login_failed");
  } catch {
    return adminSessionFailure("login_failed", "sign_in");
  }
}

export async function getAdminSession(
  client: AdminSupabaseAuthClientLike
): Promise<AdminSessionResult> {
  try {
    const result = await client.auth.getSession();

    return toAdminSessionResult(result, "read_session", "session_unavailable");
  } catch {
    return adminSessionFailure("session_unavailable", "read_session");
  }
}

export async function refreshAdminSession(
  client: AdminSupabaseAuthClientLike
): Promise<AdminSessionResult> {
  try {
    const result = await client.auth.refreshSession();

    return toAdminSessionResult(result, "refresh_session", "refresh_failed");
  } catch {
    return adminSessionFailure("refresh_failed", "refresh_session");
  }
}

export async function logoutAdminSession(
  client: AdminSupabaseAuthClientLike
): Promise<AdminSessionResult> {
  try {
    const result = await client.auth.signOut();

    if (result.error) {
      return adminSessionFailure("logout_failed", "logout");
    }

    return {
      ok: true,
      session: {
        isAuthenticated: false,
        user: null,
        expiresAt: null
      }
    };
  } catch {
    return adminSessionFailure("logout_failed", "logout");
  }
}

export function createAdminSessionAccessTokenProvider(
  client: AdminSupabaseAuthClientLike
): AdminAccessTokenProvider {
  return async () => {
    try {
      const result = await client.auth.getSession();

      if (result.error) {
        return null;
      }

      return readAccessToken(result.data?.session ?? null);
    } catch {
      return null;
    }
  };
}

export function createAdminSessionApiRequestOptions(input: {
  client: AdminSupabaseAuthClientLike;
  config?: AdminApiConfig;
}): AdminApiRequestOptions {
  const accessTokenProvider = createAdminSessionAccessTokenProvider(input.client);

  if (input.config) {
    return {
      config: input.config,
      accessTokenProvider
    };
  }

  return {
    accessTokenProvider
  };
}

function toAdminSessionResult(
  result: AdminSupabaseAuthResultLike,
  operation: AdminSessionOperation,
  failureCode: AdminSessionErrorCode
): AdminSessionResult {
  if (result.error) {
    return adminSessionFailure(failureCode, operation);
  }

  const session = result.data?.session ?? null;
  const accessToken = readAccessToken(session);

  if (!session || !accessToken) {
    return adminSessionFailure(
      operation === "read_session" ? "session_unavailable" : failureCode,
      operation
    );
  }

  return {
    ok: true,
    session: {
      isAuthenticated: true,
      user: toAdminSessionUser(session),
      expiresAt: typeof session.expires_at === "number" ? session.expires_at : null
    }
  };
}

function readAccessToken(session: AdminSupabaseAuthSessionLike | null): string | null {
  const accessToken = session?.access_token?.trim();

  return accessToken && accessToken.length > 0 ? accessToken : null;
}

function toAdminSessionUser(
  session: AdminSupabaseAuthSessionLike
): AdminSessionUser | null {
  const user = session.user;

  if (!user) {
    return null;
  }

  return {
    id: typeof user.id === "string" && user.id.trim() ? user.id.trim() : null,
    email: typeof user.email === "string" && user.email.trim() ? user.email.trim() : null
  };
}

function adminSessionFailure(
  code: AdminSessionErrorCode,
  operation: AdminSessionOperation
): AdminSessionResult {
  return {
    ok: false,
    error: {
      code,
      operation,
      message: SAFE_AUTH_MESSAGE
    }
  };
}
