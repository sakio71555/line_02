import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/080_rls_auth_production_readiness_plan.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const finalRecordPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_verification_final_record.md"
);
const migrationPath = join(repoRoot, "packages/db/migrations/0001_initial_schema.sql");
const grantsMigrationPath = join(
  repoRoot,
  "packages/db/migrations/0002_service_role_postgrest_grants.sql"
);

const expectedTables = [
  "tenants",
  "tenant_line_settings",
  "tenant_ai_settings",
  "customers",
  "messages",
  "alerts",
  "knowledge_pages",
  "staff_users",
  "staff_tenant_memberships"
] as const;

describe("Loop 080 RLS/Auth production readiness docs", () => {
  it("adds the Loop 080 task doc and production readiness runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("records current production readiness as No-Go with the required reasons", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    expect(taskDoc).toContain("production readiness: No-Go");
    expect(taskDoc).toContain("RLS 未実装");

    expect(runbook).toContain("production readiness: No-Go");
    expect(runbook).toContain("RLS SQLはLoop 095Bでstaging apply済み");
    expect(runbook).toContain("authenticated role / JWT smoke");

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("Supabase Auth/JWT");
      expect(text).toContain("selectedTenantId");
      expect(text).toContain("再検証");
      expect(text).toContain("production dev_header rejection");
      expect(text).toContain("LINE real push");
      expect(text).toContain("OpenAI");
    }
  });

  it("documents table-level RLS policy coverage for the core production tables", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const table of expectedTables) {
      expect(taskDoc).toContain(`\`${table}\``);
      expect(runbook).toContain(`\`${table}\``);
    }

    expect(taskDoc).toContain("Table RLS Policy Matrix");
    expect(runbook).toContain("Table Policy Summary");
  });

  it("documents service_role, anon, authenticated, and postgres/admin access boundaries", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("service_role");
      expect(text).toContain("server-side only");
      expect(text).toContain("browser");
      expect(text).toContain("LIFF");
      expect(text).toContain("anon");
      expect(text).toContain("authenticated");
      expect(text).toContain("postgres/admin");
    }
  });

  it("documents Auth/JWT, staff memberships, selectedTenantId, and role guard flow", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("staff_users.auth_user_id");
      expect(text).toContain("staff_tenant_memberships");
      expect(text).toContain("Authorization");
      expect(text).toContain("Bearer");
      expect(text).toContain("AdminTenantContext");
      expect(text).toContain("tenant_selection_required");
      expect(text).toContain("tenant_membership_denied");
      expect(text).toContain("permission_denied");
      expect(text).toContain("dev_tenant_header_not_allowed");
    }
  });

  it("documents real LINE send and OpenAI connection preconditions without enabling them", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("本物LINE送信前条件");
      expect(text).toContain("LINE_REAL_PUSH_ENABLED=true");
      expect(text).toContain("send_staff_reply");
      expect(text).toContain("OpenAI接続前条件");
      expect(text).toContain("AI_PROVIDER=openai");
      expect(text).toContain("OPENAI_API_KEY");
      expect(text).toContain("AI does not auto-send to LINE");
    }
  });

  it("links README, database docs, dev loop docs, and staging record to the Loop 080 runbook", () => {
    const readme = readText(readmePath);
    const databaseDoc = readText(databaseDocPath);
    const devLoop = readText(devLoopPath);
    const finalRecord = readText(finalRecordPath);

    for (const text of [readme, databaseDoc, finalRecord]) {
      expect(text).toContain("080_rls_auth_production_readiness_plan.md");
      expect(text).toContain("rls_auth_production_readiness.md");
    }

    expect(devLoop).toContain("RLS/Auth production readiness runbook");
    expect(devLoop).toContain("production readiness");
  });

  it("keeps RLS SQL out of migrations in this docs-only loop", () => {
    const migrationSql = readText(migrationPath);
    const grantsSql = readText(grantsMigrationPath);
    const combinedSql = `${migrationSql}\n${grantsSql}`;

    expect(combinedSql).not.toMatch(
      /alter table\s+[\w.]+\s+enable row level security|alter table\s+[\w.]+\s+force row level security|create policy/i
    );
    expect(combinedSql).not.toContain("Loop 080");
    expect(readText(taskDocPath)).toContain("migration SQL変更");
    expect(readText(taskDocPath)).toContain("Out of Scope");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
