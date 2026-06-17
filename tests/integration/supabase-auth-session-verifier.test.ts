import { describe, expect, it, vi } from "vitest";

import {
  extractAdminAuthSession,
  mapAuthSessionErrorToAdminAuthError
} from "../../apps/api/src/admin/auth-session";
import {
  createSupabaseAuthSessionVerifier,
  SupabaseAuthSessionVerifier,
  type SupabaseAuthClientLike,
  type SupabaseAuthGetUserResultLike
} from "../../apps/api/src/admin/supabase-auth-session-verifier";

function loadVerifierModule() {
  return import("../../apps/api/src/admin/supabase-auth-session-verifier");
}

describe("SupabaseAuthSessionVerifier", () => {
  it("imports without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadVerifierModule()).resolves.toHaveProperty("SupabaseAuthSessionVerifier");

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("returns AuthUserIdentity for a valid Supabase Auth user", async () => {
    const client = new FakeSupabaseAuthClient({
      "private-valid-token": {
        data: {
          user: {
            id: " auth_user_1 ",
            email: "staff@example.test"
          }
        },
        error: null
      }
    });
    const verifier = createSupabaseAuthSessionVerifier(client);

    const result = await verifier.verifyBearerToken("private-valid-token");

    expect(client.tokens).toEqual(["private-valid-token"]);
    expect(result).toEqual({
      ok: true,
      authUser: {
        authUserId: "auth_user_1",
        email: "staff@example.test"
      }
    });
  });

  it("integrates with extractAdminAuthSession without leaking the Bearer token", async () => {
    const client = new FakeSupabaseAuthClient({
      "private-valid-token": {
        data: {
          user: {
            id: "auth_user_1"
          }
        },
        error: null
      }
    });
    const verifier = new SupabaseAuthSessionVerifier(client);

    const result = await extractAdminAuthSession({
      authorizationHeader: "Bearer private-valid-token",
      verifier
    });
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      ok: true,
      authUser: {
        authUserId: "auth_user_1"
      }
    });
    expect(serialized).not.toContain("private-valid-token");
  });

  it("maps missing Supabase user to session_expired", async () => {
    const verifier = new SupabaseAuthSessionVerifier(
      new FakeSupabaseAuthClient({
        "private-missing-user-token": {
          data: { user: null },
          error: null
        }
      })
    );

    await expect(verifier.verifyBearerToken("private-missing-user-token")).resolves.toEqual({
      ok: false,
      error: { code: "session_expired" }
    });
  });

  it("maps blank Supabase user ids to session_expired", async () => {
    const verifier = new SupabaseAuthSessionVerifier(
      new FakeSupabaseAuthClient({
        "private-blank-user-token": {
          data: { user: { id: "   " } },
          error: null
        }
      })
    );

    await expect(verifier.verifyBearerToken("private-blank-user-token")).resolves.toEqual({
      ok: false,
      error: { code: "session_expired" }
    });
  });

  it("sanitizes Supabase auth errors without returning token, URL, key, or project details", async () => {
    const verifier = new SupabaseAuthSessionVerifier(
      new FakeSupabaseAuthClient({
        "private-invalid-token": {
          data: { user: null },
          error: {
            message: "invalid private-invalid-token at project-ref.example",
            url: "https://project-ref.example",
            key: "private-key"
          }
        }
      })
    );

    const result = await verifier.verifyBearerToken("private-invalid-token");
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      ok: false,
      error: { code: "session_expired" }
    });
    expect(serialized).not.toContain("private-invalid-token");
    expect(serialized).not.toContain("project-ref");
    expect(serialized).not.toContain("private-key");
    expect(serialized).not.toContain("https://");
  });

  it("sanitizes thrown network errors", async () => {
    const client: SupabaseAuthClientLike = {
      auth: {
        async getUser() {
          throw new Error("network failed for private-network-token at project-ref.example");
        }
      }
    };
    const verifier = new SupabaseAuthSessionVerifier(client);

    const result = await verifier.verifyBearerToken("private-network-token");
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      ok: false,
      error: { code: "session_expired" }
    });
    expect(serialized).not.toContain("private-network-token");
    expect(serialized).not.toContain("project-ref");
    expect(serialized).not.toContain("network failed");
  });

  it("maps empty verifier input to invalid_bearer_token defensively", async () => {
    const verifier = new SupabaseAuthSessionVerifier(new FakeSupabaseAuthClient({}));

    await expect(verifier.verifyBearerToken("   ")).resolves.toEqual({
      ok: false,
      error: { code: "invalid_bearer_token" }
    });
  });

  it("keeps auth error HTTP mapping compatible with existing session_expired behavior", async () => {
    const verifier = new SupabaseAuthSessionVerifier(
      new FakeSupabaseAuthClient({
        "private-expired-token": {
          data: { user: null },
          error: { message: "expired token" }
        }
      })
    );
    const session = await extractAdminAuthSession({
      authorizationHeader: "Bearer private-expired-token",
      verifier
    });

    expect(session).toEqual({
      ok: false,
      error: { code: "session_expired" }
    });
    if (!session.ok) {
      expect(mapAuthSessionErrorToAdminAuthError(session.error)).toEqual({
        code: "session_expired"
      });
    }
  });
});

class FakeSupabaseAuthClient implements SupabaseAuthClientLike {
  readonly tokens: string[] = [];

  constructor(private readonly responses: Record<string, SupabaseAuthGetUserResultLike>) {}

  readonly auth = {
    getUser: async (accessToken: string): Promise<SupabaseAuthGetUserResultLike> => {
      this.tokens.push(accessToken);

      return (
        this.responses[accessToken] ?? {
          data: { user: null },
          error: { message: "invalid token" }
        }
      );
    }
  };
}
