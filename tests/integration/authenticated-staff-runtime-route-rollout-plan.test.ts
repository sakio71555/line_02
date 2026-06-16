import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md"
);
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/authenticated_staff_runtime_route_rollout.md"
);
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const productionHardeningPath = join(
  repoRoot,
  "docs/15_runbooks/production_hardening_split_plan.md"
);
const rlsReadinessPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const finalRecordPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_verification_final_record.md"
);
const apiIndexPath = join(repoRoot, "apps/api/src/index.ts");
const initialMigrationPath = join(repoRoot, "packages/db/migrations/0001_initial_schema.sql");
const grantsMigrationPath = join(
  repoRoot,
  "packages/db/migrations/0002_service_role_postgrest_grants.sql"
);

const expectedAdminRoutes = [
  "GET /api/admin/customers",
  "GET /api/admin/customers/:customerId",
  "GET /api/admin/customers/:customerId/timeline",
  "POST /api/admin/customers/:customerId/reply",
  "POST /api/admin/customers/:customerId/ai-summary",
  "POST /api/admin/customers/:customerId/ai-reply-draft",
  "GET /api/admin/alerts",
  "POST /api/admin/alerts/check-unreplied",
  "POST /api/admin/alerts/notify-open",
  "POST /api/admin/rag/search",
  "POST /api/admin/rag/answer-draft"
] as const;

describe("Loop 088 authenticated staff runtime route rollout plan docs", () => {
  it("adds the Loop 088 task doc and authenticated staff route rollout runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("links README and existing docs to the Loop 088 task doc and runbook", () => {
    for (const filePath of [
      readmePath,
      databaseDocPath,
      devLoopPath,
      productionHardeningPath,
      rlsReadinessPath,
      finalRecordPath
    ]) {
      const text = readText(filePath);
      expect(text, filePath).toContain(
        "088_authenticated_staff_runtime_full_route_rollout_plan.md"
      );
      expect(text, filePath).toContain("authenticated_staff_runtime_route_rollout.md");
    }
  });

  it("documents a route matrix for every current Admin API route", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const route of expectedAdminRoutes) {
      expect(taskDoc).toContain(route);
      expect(runbook).toContain(route);
    }

    expect(taskDoc).toContain("Route Matrix");
    expect(taskDoc).toContain("current runtime");
    expect(taskDoc).toContain("authenticated_staff required");
    expect(taskDoc).toContain("selectedTenantId required");
    expect(taskDoc).toContain("AdminAction");
    expect(taskDoc).toContain("role guard");
    expect(taskDoc).toContain("dev_header compatibility");
  });

  it("documents customer, alerts, RAG, dev seed, LINE webhook, and health route policies", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("Customer Routes");
      expect(text).toContain("Alerts Routes");
      expect(text).toContain("RAG Routes");
      expect(text).toContain("Dev Seed");
      expect(text).toContain("LINE Webhook");
      expect(text).toContain("Health");
      expect(text).toContain("selectedTenantId");
      expect(text).toContain("AdminTenantContext.tenantId");
      expect(text).toContain("allowed_for_ai=true");
      expect(text).toContain("MockStaffNotifier");
    }
  });

  it("documents AdminAction and role guard decisions without adding new actions", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("view_customers");
      expect(text).toContain("view_customer_detail");
      expect(text).toContain("view_timeline");
      expect(text).toContain("send_staff_reply");
      expect(text).toContain("create_ai_summary");
      expect(text).toContain("create_ai_reply_draft");
      expect(text).toContain("search_rag");
      expect(text).toContain("create_rag_answer_draft");
      expect(text).toContain("view_alerts");
      expect(text).toContain("check_unreplied_alerts");
      expect(text).toContain("notify_open_alerts");
    }

    expect(taskDoc).toContain("No new AdminAction is implemented in this Loop");
  });

  it("documents rollout phases and Go/No-Go gates before implementation", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("Loop 089");
      expect(text).toContain("customer read");
      expect(text).toContain("Loop 090");
      expect(text).toContain("customer write");
      expect(text).toContain("Loop 091");
      expect(text).toContain("alerts");
      expect(text).toContain("Loop 092");
      expect(text).toContain("RAG");
      expect(text).toContain("Loop 093");
      expect(text).toContain("production dev_header rejection");
      expect(text).toContain("Go");
      expect(text).toContain("No-Go");
    }
  });

  it("keeps this Loop docs/test-only without runtime route implementation or RLS SQL", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);
    const apiIndex = readText(apiIndexPath);
    const migrationSql = `${readText(initialMigrationPath)}\n${readText(grantsMigrationPath)}`;

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("route実装");
      expect(text).toContain("RLS SQL");
      expect(text).toContain("Supabase Auth/JWT");
      expect(text).toContain("production dev_header rejection");
      expect(text).toMatch(/Out of Scope|Do Not Do|行わない/);
    }

    expect(apiIndex).not.toContain("Loop 088");
    expect(migrationSql).not.toContain("Loop 088");
    expect(migrationSql).not.toMatch(
      /alter table\s+[\w.]+\s+enable row level security|alter table\s+[\w.]+\s+force row level security|create policy/i
    );
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
