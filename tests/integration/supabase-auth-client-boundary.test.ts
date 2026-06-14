import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseAuthBrowserClient,
  createSupabaseAuthServerClient,
  readSupabaseAuthConfigFromEnv,
  SupabaseAuthConfigError,
  validateSupabaseAuthConfig,
  type SupabaseAuthEnv
} from "@amami-line-crm/db";

const fakeAuthEnv: SupabaseAuthEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
  SUPABASE_DB_URL: "postgresql://postgres:postgres@localhost:54322/postgres"
};

describe("Supabase Auth client boundary", () => {
  it("does not validate env or create clients when the db package is imported", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("@amami-line-crm/db")).resolves.toHaveProperty(
      "readSupabaseAuthConfigFromEnv"
    );
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("creates auth config from fake env without service role key fields", () => {
    const config = readSupabaseAuthConfigFromEnv(fakeAuthEnv);

    expect(config).toEqual({
      url: "https://example.supabase.co",
      anonKey: "fake-anon-key"
    });
    expect("serviceRoleKey" in config).toBe(false);
    expect("dbUrl" in config).toBe(false);
  });

  it("throws a validation error when SUPABASE_URL is missing", () => {
    expect(() =>
      readSupabaseAuthConfigFromEnv({
        ...fakeAuthEnv,
        SUPABASE_URL: ""
      })
    ).toThrow(SupabaseAuthConfigError);

    try {
      readSupabaseAuthConfigFromEnv({
        ...fakeAuthEnv,
        SUPABASE_URL: ""
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseAuthConfigError);
      expect((error as SupabaseAuthConfigError).codes).toContain("missing_supabase_url");
      expect((error as SupabaseAuthConfigError).missing).toEqual(["SUPABASE_URL"]);
    }
  });

  it("throws a validation error when SUPABASE_ANON_KEY is missing", () => {
    expect(() =>
      readSupabaseAuthConfigFromEnv({
        ...fakeAuthEnv,
        SUPABASE_ANON_KEY: " "
      })
    ).toThrow(SupabaseAuthConfigError);

    try {
      readSupabaseAuthConfigFromEnv({
        ...fakeAuthEnv,
        SUPABASE_ANON_KEY: " "
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseAuthConfigError);
      expect((error as SupabaseAuthConfigError).codes).toContain("missing_supabase_anon_key");
      expect((error as SupabaseAuthConfigError).missing).toEqual(["SUPABASE_ANON_KEY"]);
    }
  });

  it("rejects invalid Supabase Auth URL without exposing key values", () => {
    expect(() =>
      validateSupabaseAuthConfig({
        url: "not-a-url",
        anonKey: "fake-anon-key"
      })
    ).toThrow("Invalid Supabase Auth env URL: SUPABASE_URL");
  });

  it("creates a stateless auth server client without network access", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = createSupabaseAuthServerClient(readSupabaseAuthConfigFromEnv(fakeAuthEnv));

    expect(client.auth).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("creates a stateless auth browser client without network access", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {});

    const client = createSupabaseAuthBrowserClient(readSupabaseAuthConfigFromEnv(fakeAuthEnv));

    expect(client.auth).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("keeps server and browser auth client runtimes separated", () => {
    const config = readSupabaseAuthConfigFromEnv(fakeAuthEnv);

    expect(() => createSupabaseAuthBrowserClient(config)).toThrow(
      "Supabase Auth browser client must only be created in browser runtimes."
    );

    vi.stubGlobal("window", {});
    expect(() => createSupabaseAuthServerClient(config)).toThrow(
      "Supabase Auth server client must not be created in browser runtimes."
    );

    vi.unstubAllGlobals();
  });

  it("does not export login, logout, or session helpers yet", async () => {
    const dbModule = await import("@amami-line-crm/db");

    expect(dbModule).not.toHaveProperty("signInWithPassword");
    expect(dbModule).not.toHaveProperty("signOut");
    expect(dbModule).not.toHaveProperty("getSession");
  });
});
