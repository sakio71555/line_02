import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md"
);
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_alerts_knowledge_staging_runtime_plan.md"
);
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const finalRecordPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_verification_final_record.md"
);
const persistenceChecklistPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_persistence_checklist.md"
);
const rlsReadinessPath = join(
  repoRoot,
  "docs/15_runbooks/rls_auth_production_readiness.md"
);
const migrationPath = join(repoRoot, "packages/db/migrations/0001_initial_schema.sql");
const grantsMigrationPath = join(
  repoRoot,
  "packages/db/migrations/0002_service_role_postgrest_grants.sql"
);

describe("Loop 081 Supabase alerts/knowledge staging runtime plan docs", () => {
  it("adds the Loop 081 task doc and runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("documents the current staging state without marking production ready", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("customers/messages");
      expect(text).toContain("default runtime");
      expect(text).toContain("in_memory");
      expect(text).toContain("alerts runtime");
      expect(text).toContain("knowledge");
      expect(text).toContain("RLS");
      expect(text).toContain("production readiness");
      expect(text).toContain("No-Go");
    }
  });

  it("documents alerts and knowledge_pages inventory and runtime plans", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("SupabaseAlertRepository");
      expect(text).toContain("SupabaseKnowledgePageRepository");
      expect(text).toContain("GET /api/admin/alerts");
      expect(text).toContain("POST /api/admin/alerts/check-unreplied");
      expect(text).toContain("POST /api/admin/alerts/notify-open");
      expect(text).toContain("POST /api/admin/rag/search");
      expect(text).toContain("POST /api/admin/rag/answer-draft");
      expect(text).toContain("allowed_for_ai");
      expect(text).toContain("tenant_id");
    }
  });

  it("documents fake client and staging smoke requirements", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("fake client");
      expect(text).toContain("tenant_id + status");
      expect(text).toContain("tenant_id + alert_id");
      expect(text).toContain("SupabaseRepositoryError");
      expect(text).toContain("staging smoke");
      expect(text).toContain("MockStaffNotifier");
      expect(text).toContain("オンライン相談");
      expect(text).toContain("施工事例");
      expect(text).toContain("メンテナンス");
      expect(text).toContain("SoToNo MA");
    }
  });

  it("documents service_role, RLS, and production No-Go boundaries", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("service_role");
      expect(text).toContain("bypasses RLS");
      expect(text).toContain("browser");
      expect(text).toContain("LIFF");
      expect(text).toContain("anon");
      expect(text).toContain("authenticated");
      expect(text).toContain("RLS SQL");
      expect(text).toContain("Supabase Auth/JWT");
      expect(text).toContain("selectedTenantId");
      expect(text).toContain("production dev_header rejection");
    }
  });

  it("links README, database docs, dev loop docs, and staging runbooks to Loop 081", () => {
    const expectedLink = "081_supabase_alerts_knowledge_staging_runtime_plan.md";
    const expectedRunbook = "supabase_alerts_knowledge_staging_runtime_plan.md";

    for (const filePath of [
      readmePath,
      databaseDocPath,
      devLoopPath,
      finalRecordPath,
      persistenceChecklistPath,
      rlsReadinessPath
    ]) {
      const text = readText(filePath);
      expect(text).toContain(expectedLink);
      expect(text).toContain(expectedRunbook);
    }
  });

  it("keeps this Loop docs/test-only without adding RLS SQL to migrations", () => {
    const taskDoc = readText(taskDocPath);
    const migrationSql = `${readText(migrationPath)}\n${readText(grantsMigrationPath)}`;

    expect(taskDoc).toContain("Out of Scope");
    expect(taskDoc).toContain("API runtime変更");
    expect(taskDoc).toContain("migration SQL変更");
    expect(taskDoc).toContain("RLS SQL実装");
    expect(migrationSql).not.toContain("Loop 081");
    expect(migrationSql).not.toMatch(
      /alter table\s+[\w.]+\s+enable row level security|alter table\s+[\w.]+\s+force row level security|create policy/i
    );
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
