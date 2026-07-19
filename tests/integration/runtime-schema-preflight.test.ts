import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  assertSupabaseRuntimeSchemaReady,
  SupabaseRuntimeSchemaNotReadyError,
  supabaseRuntimeSchemaPreflightRpc
} from "@amami-line-crm/db";
import { assertApiRuntimeSchemaReady } from "../../apps/api/src/index";

type RuntimeSchemaClient = Parameters<typeof assertSupabaseRuntimeSchemaReady>[0];

describe("runtime database schema preflight", () => {
  it("keeps the readiness RPC service-role-only and checks the required schema", async () => {
    const migration = await readFile(
      new URL(
        "../../packages/db/migrations/20260719120000_api_runtime_schema_readiness.sql",
        import.meta.url
      ),
      "utf8"
    );

    expect(migration).toMatch(/staff_tenant_memberships[\s\S]+display_name[\s\S]+is_nullable = 'NO'/u);
    expect(migration).toContain("public.list_operations_staff_members(text)");
    expect(migration).toContain("public.list_staff_management_records(text)");
    expect(migration).toContain("public.create_staff_management_record(jsonb,jsonb)");
    expect(migration).toContain("public.save_staff_management_record(jsonb,jsonb)");
    expect(migration).toMatch(
      /revoke all on function public\.assert_api_runtime_schema_ready\(\) from public/iu
    );
    expect(migration).toMatch(
      /grant execute on function public\.assert_api_runtime_schema_ready\(\) to service_role/iu
    );
    expect(migration).toMatch(/security invoker/iu);
    expect(migration).not.toMatch(/security definer/iu);
  });

  it("accepts only an explicit ready result", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });

    await expect(
      assertSupabaseRuntimeSchemaReady({ rpc } as unknown as RuntimeSchemaClient)
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith(supabaseRuntimeSchemaPreflightRpc);
  });

  it.each([
    { data: false, error: null },
    { data: null, error: { message: "internal database detail" } }
  ])("fails closed without exposing database details", async (result) => {
    const rpc = vi.fn().mockResolvedValue(result);

    await expect(
      assertSupabaseRuntimeSchemaReady({ rpc } as unknown as RuntimeSchemaClient)
    ).rejects.toMatchObject({
      name: "SupabaseRuntimeSchemaNotReadyError",
      code: "supabase_runtime_schema_not_ready",
      message: "Supabase runtime schema is not ready."
    });
  });

  it("normalizes unexpected RPC failures to the safe readiness error", async () => {
    const rpc = vi.fn().mockRejectedValue(new Error("connection string or raw service error"));

    await expect(
      assertSupabaseRuntimeSchemaReady({ rpc } as unknown as RuntimeSchemaClient)
    ).rejects.toEqual(new SupabaseRuntimeSchemaNotReadyError());
  });

  it("skips the database check for the in-memory runtime", async () => {
    const preflight = vi.fn();

    await assertApiRuntimeSchemaReady(
      { REPOSITORY_RUNTIME: "in_memory" },
      { assertSupabaseRuntimeSchemaReadyFromEnv: preflight }
    );

    expect(preflight).not.toHaveBeenCalled();
  });

  it("requires the database check before using the Supabase runtime", async () => {
    const preflight = vi.fn().mockResolvedValue(undefined);
    const env = { REPOSITORY_RUNTIME: "supabase" };

    await assertApiRuntimeSchemaReady(env, {
      assertSupabaseRuntimeSchemaReadyFromEnv: preflight
    });

    expect(preflight).toHaveBeenCalledOnce();
    expect(preflight).toHaveBeenCalledWith(env);
  });
});
