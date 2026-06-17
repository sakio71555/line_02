import { describe, expect, it } from "vitest";

import {
  adminApiFetch,
  type AdminApiConfig
} from "../../apps/admin/src/admin-api";
import {
  createAdminSessionAccessTokenProvider,
  createAdminSessionApiRequestOptions,
  createAdminSessionController,
  getAdminSession,
  logoutAdminSession,
  refreshAdminSession,
  signInAdminSession,
  type AdminSupabaseAuthClientLike,
  type AdminSupabaseAuthResultLike,
  type AdminSupabaseSignOutResultLike
} from "../../apps/admin/src/admin-session";
import { SELECTED_TENANT_STORAGE_KEY } from "../../apps/admin/src/selected-tenant";

const privateToken = "private-admin-session-token";
const refreshedPrivateToken = "private-admin-refreshed-token";

describe("Loop 105 admin login session boundary", () => {
  it("signs in with a fake Supabase auth client and returns safe session status", async () => {
    const client = new FakeAdminSupabaseAuthClient();

    const result = await signInAdminSession(client, {
      email: " owner@example.test ",
      password: "private-password"
    });
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      ok: true,
      session: {
        isAuthenticated: true,
        user: {
          id: "auth_owner",
          email: "owner@example.test"
        },
        expiresAt: 1_800_000_000
      }
    });
    expect(client.credentials).toEqual([{ email: "owner@example.test", password: "private-password" }]);
    expect(serialized).not.toContain(privateToken);
    expect(serialized).not.toContain("private-password");
  });

  it("uses the session token provider with the Admin API helper", async () => {
    const client = new FakeAdminSupabaseAuthClient();
    await signInAdminSession(client, {
      email: "owner@example.test",
      password: "private-password"
    });
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await adminApiFetch(
      "/api/admin/customers",
      {},
      {
        ...createAdminSessionApiRequestOptions({
          client,
          config: productionStyleConfig()
        }),
        fetchFn: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(headers.get("authorization")).toBe(`Bearer ${privateToken}`);
    expect(headers.get("x-selected-tenant-id")).toBe("tenant_amamihome");
    expect(headers.get("x-tenant-id")).toBeNull();
  });

  it("does not attach Authorization when the fake client has no session", async () => {
    const client = new FakeAdminSupabaseAuthClient();
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await adminApiFetch(
      "/api/admin/customers",
      {},
      {
        config: productionStyleConfig(),
        accessTokenProvider: createAdminSessionAccessTokenProvider(client),
        fetchFn: async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-selected-tenant-id")).toBe("tenant_amamihome");
  });

  it("keeps selectedTenantId storage separate from Authorization token state", async () => {
    const client = new FakeAdminSupabaseAuthClient();
    const storage = new MemoryStorage();
    storage.setItem(SELECTED_TENANT_STORAGE_KEY, "tenant_amamihome");

    await signInAdminSession(client, {
      email: "owner@example.test",
      password: "private-password"
    });

    expect(storage.getItem(SELECTED_TENANT_STORAGE_KEY)).toBe("tenant_amamihome");
    expect(storage.dump()).not.toContain(privateToken);
  });

  it("refreshes session without exposing old or refreshed tokens", async () => {
    const client = new FakeAdminSupabaseAuthClient();
    await signInAdminSession(client, {
      email: "owner@example.test",
      password: "private-password"
    });

    const result = await refreshAdminSession(client);
    const providerToken = await createAdminSessionAccessTokenProvider(client)();
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      ok: true,
      session: {
        isAuthenticated: true
      }
    });
    expect(providerToken).toBe(refreshedPrivateToken);
    expect(serialized).not.toContain(privateToken);
    expect(serialized).not.toContain(refreshedPrivateToken);
  });

  it("clears the token provider after logout", async () => {
    const client = new FakeAdminSupabaseAuthClient();
    const controller = createAdminSessionController(client);

    await controller.signIn({
      email: "owner@example.test",
      password: "private-password"
    });
    await expect(controller.accessTokenProvider()).resolves.toBe(privateToken);

    const logout = await controller.logout();

    expect(logout).toEqual({
      ok: true,
      session: {
        isAuthenticated: false,
        user: null,
        expiresAt: null
      }
    });
    await expect(controller.accessTokenProvider()).resolves.toBeNull();
  });

  it("sanitizes login, session, refresh, and logout failures", async () => {
    const client = new FakeAdminSupabaseAuthClient({
      failWith: "private-token project-ref database-password"
    });

    for (const result of [
      await signInAdminSession(client, { email: "", password: "" }),
      await signInAdminSession(client, { email: "owner@example.test", password: "private-password" }),
      await getAdminSession(client),
      await refreshAdminSession(client),
      await logoutAdminSession(client)
    ]) {
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain("private-token");
      expect(serialized).not.toContain("project-ref");
      expect(serialized).not.toContain("database-password");
      expect(serialized).toContain("Admin session operation failed.");
    }
  });
});

class FakeAdminSupabaseAuthClient implements AdminSupabaseAuthClientLike {
  readonly credentials: Array<{ email: string; password: string }> = [];
  private session: AdminSupabaseAuthResultLike["data"]["session"] = null;

  constructor(private readonly options: { failWith?: string } = {}) {}

  readonly auth = {
    signInWithPassword: async (input: {
      email: string;
      password: string;
    }): Promise<AdminSupabaseAuthResultLike> => {
      this.credentials.push(input);

      if (this.options.failWith) {
        return { error: { message: this.options.failWith } };
      }

      this.session = createSession(privateToken);

      return { data: { session: this.session }, error: null };
    },
    getSession: async (): Promise<AdminSupabaseAuthResultLike> => {
      if (this.options.failWith) {
        return { error: { message: this.options.failWith } };
      }

      return { data: { session: this.session }, error: null };
    },
    refreshSession: async (): Promise<AdminSupabaseAuthResultLike> => {
      if (this.options.failWith) {
        return { error: { message: this.options.failWith } };
      }

      this.session = createSession(refreshedPrivateToken);

      return { data: { session: this.session }, error: null };
    },
    signOut: async (): Promise<AdminSupabaseSignOutResultLike> => {
      if (this.options.failWith) {
        return { error: { message: this.options.failWith } };
      }

      this.session = null;

      return { error: null };
    }
  };
}

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  dump(): string {
    return JSON.stringify(Object.fromEntries(this.data));
  }
}

function createSession(accessToken: string): NonNullable<AdminSupabaseAuthResultLike["data"]>["session"] {
  return {
    access_token: accessToken,
    expires_at: 1_800_000_000,
    user: {
      id: "auth_owner",
      email: "owner@example.test"
    }
  };
}

function productionStyleConfig(): AdminApiConfig {
  return {
    apiBaseUrl: "http://localhost:4000",
    tenantId: "tenant_amamihome",
    selectedTenantId: "tenant_amamihome",
    includeDevTenantHeader: false
  };
}
