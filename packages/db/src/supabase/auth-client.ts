import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { SupabaseAuthConfig } from "./auth-config";

type MaybeBrowserGlobal = typeof globalThis & {
  window?: unknown;
};

const statelessAuthClientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  }
} as const;

export function createSupabaseAuthServerClient(config: SupabaseAuthConfig): SupabaseClient {
  assertServerRuntime();
  return createClient(config.url, config.anonKey, statelessAuthClientOptions);
}

export function createSupabaseAuthBrowserClient(config: SupabaseAuthConfig): SupabaseClient {
  assertBrowserRuntime();
  return createClient(config.url, config.anonKey, statelessAuthClientOptions);
}

function assertServerRuntime(globalObject: MaybeBrowserGlobal = globalThis): void {
  if (typeof globalObject.window !== "undefined") {
    throw new Error("Supabase Auth server client must not be created in browser runtimes.");
  }
}

function assertBrowserRuntime(globalObject: MaybeBrowserGlobal = globalThis): void {
  if (typeof globalObject.window === "undefined") {
    throw new Error("Supabase Auth browser client must only be created in browser runtimes.");
  }
}
