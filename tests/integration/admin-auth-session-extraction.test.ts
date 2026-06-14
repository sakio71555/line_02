import { describe, expect, it, vi } from "vitest";

import type { AuthUserIdentity } from "@amami-line-crm/domain";
import type {
  AuthSessionVerifier,
  AuthSessionVerifierFailureCode,
  AuthSessionVerifierResult
} from "../../apps/api/src/admin/auth-session";

function loadAuthSessionModule() {
  return import("../../apps/api/src/admin/auth-session");
}

describe("admin auth session extraction boundary", () => {
  it("imports without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadAuthSessionModule()).resolves.toHaveProperty("extractAdminAuthSession");

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("rejects missing Authorization header without calling the verifier", async () => {
    const { extractAdminAuthSession } = await loadAuthSessionModule();
    const verifier = new FakeAuthSessionVerifier();

    const result = await extractAdminAuthSession({
      authorizationHeader: null,
      verifier
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "missing_authorization_header" }
    });
    expect(verifier.tokens).toEqual([]);
  });

  it("rejects unsupported and malformed Authorization headers", async () => {
    const { extractBearerToken } = await loadAuthSessionModule();

    expect(extractBearerToken("Basic valid-token")).toEqual({
      ok: false,
      error: { code: "invalid_authorization_header" }
    });
    expect(extractBearerToken("Authorization:Token")).toEqual({
      ok: false,
      error: { code: "invalid_authorization_header" }
    });
    expect(extractBearerToken("Bearer valid-token extra")).toEqual({
      ok: false,
      error: { code: "invalid_authorization_header" }
    });
  });

  it("rejects Bearer headers without a token", async () => {
    const { extractBearerToken } = await loadAuthSessionModule();

    expect(extractBearerToken("Bearer")).toEqual({
      ok: false,
      error: { code: "missing_bearer_token" }
    });
    expect(extractBearerToken("Bearer    ")).toEqual({
      ok: false,
      error: { code: "missing_bearer_token" }
    });
  });

  it("accepts Bearer scheme case-insensitively and verifies the token", async () => {
    const { extractAdminAuthSession } = await loadAuthSessionModule();
    const verifier = new FakeAuthSessionVerifier({
      "valid-token": {
        ok: true,
        authUser: { authUserId: "auth_user_1", email: "staff@example.test" }
      }
    });

    const result = await extractAdminAuthSession({
      authorizationHeader: "bearer valid-token",
      verifier
    });

    expect(verifier.tokens).toEqual(["valid-token"]);
    expect(result).toEqual({
      ok: true,
      authUser: {
        authUserId: "auth_user_1",
        email: "staff@example.test"
      }
    });
  });

  it("trims auth user ids returned by the verifier", async () => {
    const { extractAdminAuthSession } = await loadAuthSessionModule();
    const verifier = new FakeAuthSessionVerifier({
      "valid-token": {
        authUserId: " auth_user_1 "
      }
    });

    await expect(
      extractAdminAuthSession({
        authorizationHeader: "Bearer valid-token",
        verifier
      })
    ).resolves.toEqual({
      ok: true,
      authUser: {
        authUserId: "auth_user_1"
      }
    });
  });

  it("returns invalid_bearer_token for invalid fake token results", async () => {
    const { extractAdminAuthSession } = await loadAuthSessionModule();
    const verifier = new FakeAuthSessionVerifier({
      "invalid-token": {
        ok: false,
        error: { code: "invalid_bearer_token" }
      }
    });

    await expect(
      extractAdminAuthSession({
        authorizationHeader: "Bearer invalid-token",
        verifier
      })
    ).resolves.toEqual({
      ok: false,
      error: { code: "invalid_bearer_token" }
    });
  });

  it("maps a null verifier result to authenticated_staff_required", async () => {
    const { extractAdminAuthSession } = await loadAuthSessionModule();
    const verifier = new FakeAuthSessionVerifier({
      "missing-staff-token": null
    });

    await expect(
      extractAdminAuthSession({
        authorizationHeader: "Bearer missing-staff-token",
        verifier
      })
    ).resolves.toEqual({
      ok: false,
      error: { code: "authenticated_staff_required" }
    });
  });

  it("keeps session_expired distinguishable for the existing auth error mapper", async () => {
    const { extractAdminAuthSession, mapAuthSessionErrorToAdminAuthError } =
      await loadAuthSessionModule();
    const { mapAdminAuthErrorToHttp } = await import(
      "../../apps/api/src/admin/auth-error-response"
    );
    const verifier = new FakeAuthSessionVerifier({
      "expired-token": {
        ok: false,
        error: { code: "session_expired" }
      }
    });

    const result = await extractAdminAuthSession({
      authorizationHeader: "Bearer expired-token",
      verifier
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "session_expired" }
    });
    if (!result.ok) {
      expect(mapAdminAuthErrorToHttp(mapAuthSessionErrorToAdminAuthError(result.error)))
        .toMatchObject({
          status: 401,
          body: { ok: false, error: "session_expired" },
          placeholderRoute: "/session-expired"
        });
    }
  });

  it("maps non-expired session extraction failures to authenticated_staff_required", async () => {
    const { mapAuthSessionErrorToAdminAuthError } = await loadAuthSessionModule();

    expect(
      mapAuthSessionErrorToAdminAuthError({ code: "missing_authorization_header" })
    ).toEqual({
      code: "authenticated_staff_required"
    });
    expect(mapAuthSessionErrorToAdminAuthError({ code: "invalid_bearer_token" })).toEqual({
      code: "authenticated_staff_required"
    });
  });

  it("does not leak token values through extraction errors", async () => {
    const { extractAdminAuthSession } = await loadAuthSessionModule();
    const verifier = new FakeAuthSessionVerifier({
      "private-invalid-token": {
        ok: false,
        error: { code: "invalid_bearer_token" }
      }
    });

    const result = await extractAdminAuthSession({
      authorizationHeader: "Bearer private-invalid-token",
      verifier
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("private-invalid-token");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("env");
  });
});

type FakeVerifierResponse = AuthSessionVerifierResult | AuthUserIdentity | null;

class FakeAuthSessionVerifier implements AuthSessionVerifier {
  readonly tokens: string[] = [];

  constructor(private readonly responses: Record<string, FakeVerifierResponse> = {}) {}

  async verifyBearerToken(token: string): Promise<FakeVerifierResponse> {
    this.tokens.push(token);
    if (Object.prototype.hasOwnProperty.call(this.responses, token)) {
      return this.responses[token] ?? null;
    }

    return {
      ok: false,
      error: { code: "invalid_bearer_token" satisfies AuthSessionVerifierFailureCode }
    };
  }
}
