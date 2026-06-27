import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseAnonServerClient,
  createSupabaseServiceRoleServerClient,
  readSupabaseConfigFromEnv,
  SupabaseConfigError,
  type SupabaseConfig,
  type SupabaseEnv
} from "@amami-line-crm/db";

const fakeEnv: SupabaseEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
  SUPABASE_DB_URL: "postgresql://postgres:postgres@localhost:54322/postgres"
};

describe("Supabase client boundary", () => {
  it("does not validate env when the db package is imported", async () => {
    await expect(import("@amami-line-crm/db")).resolves.toHaveProperty("readSupabaseConfigFromEnv");
  });

  it("throws a validation error when required env is missing", () => {
    expect(() => readSupabaseConfigFromEnv({})).toThrow(SupabaseConfigError);

    try {
      readSupabaseConfigFromEnv({});
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseConfigError);
      expect((error as SupabaseConfigError).missing).toEqual([
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_DB_URL"
      ]);
    }
  });

  it("creates config from fake env", () => {
    expect(readSupabaseConfigFromEnv(fakeEnv)).toEqual({
      url: "https://example.supabase.co",
      anonKey: "fake-anon-key",
      serviceRoleKey: "fake-service-role-key",
      dbUrl: "postgresql://postgres:postgres@localhost:54322/postgres"
    });
  });

  it("rejects invalid Supabase URLs without exposing key values", () => {
    expect(() =>
      readSupabaseConfigFromEnv({
        ...fakeEnv,
        SUPABASE_URL: "not-a-url",
        SUPABASE_DB_URL: "also-not-a-url"
      })
    ).toThrow("Invalid Supabase env URL: SUPABASE_URL, SUPABASE_DB_URL");
  });

  it("creates a service role server client without network access", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = createSupabaseServiceRoleServerClient(readSupabaseConfigFromEnv(fakeEnv));

    expect(client.from).toBeTypeOf("function");
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("creates an anon server client without network access", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = createSupabaseAnonServerClient(readSupabaseConfigFromEnv(fakeEnv));

    expect(client.from).toBeTypeOf("function");
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("does not create server clients in browser-like runtimes", () => {
    const config: SupabaseConfig = readSupabaseConfigFromEnv(fakeEnv);
    vi.stubGlobal("window", {});

    expect(() => createSupabaseServiceRoleServerClient(config)).toThrow(
      "Supabase server clients must not be created in browser or LIFF runtimes."
    );
    expect(() => createSupabaseAnonServerClient(config)).toThrow(
      "Supabase server clients must not be created in browser or LIFF runtimes."
    );

    vi.unstubAllGlobals();
  });
});
