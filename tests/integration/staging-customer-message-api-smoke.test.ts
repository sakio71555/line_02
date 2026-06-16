import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  loadStagingDatabaseConfig,
  parseEnvFile,
  resolveProjectPath
} from "../../scripts/dev-loop/lib/staging-psql.mjs";
import {
  createSupabaseCustomerMessageRepositoriesFromEnv,
  type SupabaseEnv
} from "@amami-line-crm/db";

const runStagingSmoke = process.env.RUN_STAGING_SMOKE === "1";
const describeStagingSmoke = runStagingSmoke ? describe : describe.skip;

describeStagingSmoke("staging customer/message API smoke", () => {
  it("reads and writes dummy customers/messages through the Supabase runtime bundle", async () => {
    const env = loadSmokeEnv();
    const app = createApiApp({
      customerMessageRepositories: createSupabaseCustomerMessageRepositoriesFromEnv(env),
      env: createApiEnv(env)
    });

    const list = await fetchJson(app, "/api/admin/customers");
    expect(list.status).toBe(200);
    expect(list.body.customers).toBeDefined();
    expect(list.body.customers?.length ?? 0).toBeGreaterThanOrEqual(2);

    const detail = await fetchJson(app, "/api/admin/customers/customer_demo_yamada_taro");
    expect(detail.status).toBe(200);
    expect(detail.body.customer).toMatchObject({
      id: "customer_demo_yamada_taro",
      tenant_id: "tenant_amamihome"
    });

    const initialTimeline = await fetchJson(
      app,
      "/api/admin/customers/customer_demo_yamada_taro/timeline"
    );
    expect(initialTimeline.status).toBe(200);
    expect(initialTimeline.body.messages?.length ?? 0).toBeGreaterThanOrEqual(2);

    const reply = await fetchJson(app, "/api/admin/customers/customer_demo_yamada_taro/reply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "staging dummy reply" })
    });
    expect(reply.status).toBe(200);
    expect(reply.body.message).toMatchObject({
      tenant_id: "tenant_amamihome",
      role: "staff",
      message_type: "text"
    });

    const summary = await fetchJson(
      app,
      "/api/admin/customers/customer_demo_yamada_taro/ai-summary",
      {
        method: "POST"
      }
    );
    expect(summary.status).toBe(200);
    expect(summary.body.message).toMatchObject({
      tenant_id: "tenant_amamihome",
      role: "ai",
      message_type: "summary"
    });

    const restartedApp = createApiApp({
      customerMessageRepositories: createSupabaseCustomerMessageRepositoriesFromEnv(env),
      env: createApiEnv(env)
    });
    const persistedTimeline = await fetchJson(
      restartedApp,
      "/api/admin/customers/customer_demo_yamada_taro/timeline"
    );

    expect(persistedTimeline.status).toBe(200);
    expect(persistedTimeline.body.messages?.length ?? 0).toBeGreaterThanOrEqual(
      (initialTimeline.body.messages?.length ?? 0) + 2
    );
    expect(
      persistedTimeline.body.messages?.every((message) => message.tenant_id === "tenant_amamihome")
    ).toBe(true);
  });
});

interface SmokeBody {
  customer?: {
    id: string;
    tenant_id: string;
  };
  customers?: Array<{
    id: string;
    tenant_id: string;
  }>;
  message?: {
    tenant_id: string;
    role: string;
    message_type: string;
  };
  messages?: Array<{
    tenant_id: string;
  }>;
}

function loadSmokeEnv(): SupabaseEnv {
  const envFile = process.env.STAGING_ENV_FILE ?? ".env.staging";
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const envPath = resolveProjectPath(repoRoot, envFile);

  loadStagingDatabaseConfig({ repoRoot, envFile });

  return Object.fromEntries(parseEnvFile(readFileSync(envPath, "utf8")).entries());
}

function createApiEnv(env: SupabaseEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    APP_ENV: "staging",
    REPOSITORY_RUNTIME: "supabase",
    TENANT_ID: "tenant_amamihome",
    TENANT_SLUG: "amamihome",
    LINE_MESSAGING_ENABLED: "false",
    LINE_REAL_PUSH_ENABLED: "false",
    AI_PROVIDER: "mock"
  };
}

async function fetchJson(
  app: { fetch: (request: Request) => Promise<Response> },
  path: string,
  init: RequestInit & { headers?: HeadersInit } = {}
): Promise<{ status: number; body: SmokeBody }> {
  const headers = new Headers(init.headers);
  headers.set("x-tenant-id", "tenant_amamihome");

  const response = await app.fetch(
    new Request(`http://localhost${path}`, {
      ...init,
      headers
    })
  );

  return {
    status: response.status,
    body: (await response.json()) as SmokeBody
  };
}
