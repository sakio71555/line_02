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
import { MockStaffNotifier, type Customer, type Message } from "@amami-line-crm/domain";

const runStagingSmoke = process.env.RUN_STAGING_ALERTS_SMOKE === "1";
const describeStagingSmoke = runStagingSmoke ? describe : describe.skip;
const tenantId = "tenant_amamihome";
const smokeNow = "2026-06-17T00:00:00.000Z";

describe("staging alerts API smoke safety", () => {
  it("keeps staging alerts smoke explicit and avoids secret printing patterns", () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const script = readFileSync(
      resolve(repoRoot, "scripts/dev-loop/smoke-staging-alerts-api.mjs"),
      "utf8"
    );
    const testSource = readFileSync(fileURLToPath(import.meta.url), "utf8");

    expect(script).toContain("RUN_STAGING_ALERTS_SMOKE");
    expect(script).toContain("verify-staging-env.mjs");
    expect(script).toContain("verify-staging-schema.mjs");
    expect(script).toContain("verify-staging-postgrest-grants.mjs");
    expect(script).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(script).not.toContain("SUPABASE_DB_URL");
    expect(script).not.toContain("supabase db push");
    expect(script).not.toContain("LINE_REAL_PUSH_ENABLED=true");
    expect(testSource).toContain('REPOSITORY_RUNTIME: "supabase"');
    expect(testSource).toContain('LINE_REAL_PUSH_ENABLED: "false"');
    expect(testSource).toContain('AI_PROVIDER: "mock"');
  });
});

describeStagingSmoke("staging alerts API smoke", () => {
  it("creates notifies and re-reads a dummy unreplied alert through the Supabase runtime bundle", async () => {
    const env = loadSmokeEnv();
    const bundle = createSupabaseCustomerMessageRepositoriesFromEnv(env);
    const staffNotifier = new MockStaffNotifier();
    const runId = createSmokeRunId();
    const customerId = `customer_smoke_alert_${runId}`;

    await bundle.customerRepository.save(createSmokeCustomer(customerId, runId));
    await bundle.messageRepository.insert(createSmokeMessage(customerId, runId));

    const app = createApiApp({
      customerMessageRepositories: bundle,
      staffNotifier,
      now: () => smokeNow,
      env: createApiEnv(env)
    });

    const check = await fetchJson(app, "/api/admin/alerts/check-unreplied", { method: "POST" });
    expect(check.status).toBe(200);
    expect(check.body.alerts?.some((alert) => alert.customer_id === customerId)).toBe(true);

    const openList = await fetchJson(app, "/api/admin/alerts?status=open");
    expect(openList.status).toBe(200);
    expect(
      openList.body.alerts?.some(
        (alert) => alert.customer_id === customerId && alert.status === "open"
      )
    ).toBe(true);

    const notify = await fetchJson(app, "/api/admin/alerts/notify-open", { method: "POST" });
    expect(notify.status).toBe(200);
    expect(notify.body.notified ?? 0).toBeGreaterThanOrEqual(1);
    expect(
      notify.body.notified_alerts?.some(
        (alert) => alert.customer_id === customerId && alert.status === "notified"
      )
    ).toBe(true);
    expect(staffNotifier.notifications.some((payload) => payload.customer_id === customerId)).toBe(
      true
    );

    const restartedApp = createApiApp({
      customerMessageRepositories: createSupabaseCustomerMessageRepositoriesFromEnv(env),
      staffNotifier: new MockStaffNotifier(),
      env: createApiEnv(env)
    });
    const persisted = await fetchJson(restartedApp, "/api/admin/alerts?status=notified");

    expect(persisted.status).toBe(200);
    expect(
      persisted.body.alerts?.some(
        (alert) => alert.customer_id === customerId && alert.status === "notified"
      )
    ).toBe(true);
    expect(persisted.body.alerts?.every((alert) => alert.tenant_id === tenantId)).toBe(true);
  });
});

interface SmokeAlert {
  id: string;
  tenant_id: string;
  customer_id: string;
  status: string;
}

interface SmokeBody {
  checked_customers?: number;
  alerts_created?: number;
  alerts?: SmokeAlert[];
  notified?: number;
  failed?: number;
  skipped?: number;
  notified_alerts?: SmokeAlert[];
  failed_alerts?: SmokeAlert[];
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
    TENANT_ID: tenantId,
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
  headers.set("x-tenant-id", tenantId);

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

function createSmokeRunId(): string {
  return new Date().toISOString().replace(/\D/g, "").slice(0, 14);
}

function createSmokeCustomer(customerId: string, runId: string): Customer {
  return {
    id: customerId,
    tenant_id: tenantId,
    line_user_id: `dummy_line_user_alert_${runId}`,
    display_name: "デモ 未返信アラート",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: ["staging-alert-smoke"],
    response_mode: "human_required",
    status: "active",
    last_message_at: "2026-06-16T22:00:00.000Z",
    last_customer_message_at: "2026-06-16T22:00:00.000Z",
    last_staff_reply_at: null,
    created_at: "2026-06-16T22:00:00.000Z",
    updated_at: "2026-06-16T22:00:00.000Z"
  };
}

function createSmokeMessage(customerId: string, runId: string): Message {
  return {
    id: `message_smoke_alert_${runId}`,
    tenant_id: tenantId,
    customer_id: customerId,
    consultation_id: null,
    line_message_id: `dummy_line_message_alert_${runId}`,
    role: "customer",
    message_type: "text",
    body: "staging dummy alert smoke message",
    media_storage_path: null,
    staff_user_id: null,
    ai_generated: false,
    sent_to_line_at: null,
    created_at: "2026-06-16T22:00:00.000Z"
  };
}
