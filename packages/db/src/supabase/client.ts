import {
  createClient,
  type SupabaseClient,
  type WebSocketLikeConstructor
} from "@supabase/supabase-js";
import WebSocket from "ws";

import type { SupabaseConfig } from "./config";

type MaybeBrowserGlobal = typeof globalThis & {
  window?: unknown;
};

const webSocketTransport = WebSocket as unknown as WebSocketLikeConstructor;

const serverSideClientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  },
  realtime: {
    transport: webSocketTransport
  }
} as const;

export function createSupabaseServiceRoleServerClient(config: SupabaseConfig): SupabaseClient {
  assertServerRuntime();
  return createClient(config.url, config.serviceRoleKey, serverSideClientOptions);
}

export function createSupabaseAnonServerClient(config: SupabaseConfig): SupabaseClient {
  assertServerRuntime();
  return createClient(config.url, config.anonKey, serverSideClientOptions);
}

function assertServerRuntime(globalObject: MaybeBrowserGlobal = globalThis): void {
  if (typeof globalObject.window !== "undefined") {
    throw new Error("Supabase server clients must not be created in browser or LIFF runtimes.");
  }
}
