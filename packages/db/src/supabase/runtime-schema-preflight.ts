import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServiceRoleServerClient } from "./client";
import { readSupabaseConfigFromEnv, type SupabaseEnv } from "./config";

export const supabaseRuntimeSchemaPreflightRpc = "assert_api_runtime_schema_ready";

export class SupabaseRuntimeSchemaNotReadyError extends Error {
  readonly code = "supabase_runtime_schema_not_ready";

  constructor() {
    super("Supabase runtime schema is not ready.");
    this.name = "SupabaseRuntimeSchemaNotReadyError";
  }
}

export async function assertSupabaseRuntimeSchemaReady(
  client: Pick<SupabaseClient, "rpc">
): Promise<void> {
  try {
    const result = await client.rpc(supabaseRuntimeSchemaPreflightRpc);

    if (result.error || result.data !== true) {
      throw new SupabaseRuntimeSchemaNotReadyError();
    }
  } catch (error) {
    if (error instanceof SupabaseRuntimeSchemaNotReadyError) {
      throw error;
    }

    throw new SupabaseRuntimeSchemaNotReadyError();
  }
}

export async function assertSupabaseRuntimeSchemaReadyFromEnv(
  env: SupabaseEnv = process.env
): Promise<void> {
  const config = readSupabaseConfigFromEnv(env);
  const client = createSupabaseServiceRoleServerClient(config);
  await assertSupabaseRuntimeSchemaReady(client);
}
