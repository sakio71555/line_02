import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const rlsMigrationPath = join(repoRoot, "packages/db/migrations/0003_rls_core_tables.sql");
const serviceRoleGrantsPath = join(
  repoRoot,
  "packages/db/migrations/0002_service_role_postgrest_grants.sql"
);
const verifyScriptPath = join(repoRoot, "scripts/dev-loop/verify-rls-migration-static.mjs");
const taskDocPath = join(repoRoot, "docs/11_codex_tasks/094a_rls_sql_draft_review.md");
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const productionHardeningPath = join(
  repoRoot,
  "docs/15_runbooks/production_hardening_split_plan.md"
);
const readinessRunbookPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const rollbackRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_rollback_recovery.md"
);

const rlsSql = readFileSync(rlsMigrationPath, "utf8");
const serviceRoleGrantsSql = readFileSync(serviceRoleGrantsPath, "utf8");

const rlsTargetTables = [
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

const tenantScopedTables = [
  "tenant_line_settings",
  "tenant_ai_settings",
  "customers",
  "messages",
  "alerts",
  "knowledge_pages"
] as const;

describe("Loop 094A RLS core tables migration static review", () => {
  it("adds the RLS draft migration and verification script without applying it", () => {
    expect(existsSync(rlsMigrationPath)).toBe(true);
    expect(existsSync(verifyScriptPath)).toBe(true);
    expect(rlsSql).toContain("Loop 094A");
    expect(rlsSql).toContain("intentionally not applied");
  });

  it("enables and forces RLS on the selected core tables", () => {
    for (const table of rlsTargetTables) {
      expect(rlsSql).toMatch(
        new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i")
      );
      expect(rlsSql).toMatch(
        new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, "i")
      );
      expect(rlsSql).toMatch(
        new RegExp(`drop\\s+policy\\s+if\\s+exists[\\s\\S]+on\\s+public\\.${table}`, "i")
      );
    }
  });

  it("uses auth.uid and active staff membership for tenant scoped policies", () => {
    expect(rlsSql).toMatch(/auth\.uid\(\)::text/i);
    expect(rlsSql).toMatch(/\bpublic\.staff_users\b/i);
    expect(rlsSql).toMatch(/\bpublic\.staff_tenant_memberships\b/i);
    expect(rlsSql).toMatch(/su\.status\s*=\s*'active'/i);
    expect(rlsSql).toMatch(/su\.is_active\s*=\s*true/i);
    expect(rlsSql).toMatch(/stm\.status\s*=\s*'active'/i);

    for (const table of tenantScopedTables) {
      expect(rlsSql).toMatch(new RegExp(`stm\\.tenant_id\\s*=\\s*${table}\\.tenant_id`, "i"));
    }

    expect(rlsSql).toMatch(/stm\.tenant_id\s*=\s*tenants\.id/i);
  });

  it("limits staff table policies to the authenticated user's active staff and memberships", () => {
    expect(rlsSql).toMatch(/staff_users_select_own_active_staff_row/i);
    expect(rlsSql).toMatch(/auth_user_id\s*=\s*auth\.uid\(\)::text/i);
    expect(rlsSql).toMatch(/staff_tenant_memberships_select_own_active_memberships/i);
    expect(rlsSql).toMatch(
      /su\.id\s*=\s*staff_tenant_memberships\.staff_user_id[\s\S]+su\.auth_user_id\s*=\s*auth\.uid\(\)::text/i
    );
  });

  it("keeps grants explicit and avoids anon or broad grants", () => {
    expect(rlsSql).toMatch(/grant\s+usage\s+on\s+schema\s+public\s+to\s+authenticated/i);
    expect(rlsSql).toMatch(
      /grant\s+select\s+on\s+table[\s\S]+public\.tenants[\s\S]+public\.staff_users[\s\S]+public\.staff_tenant_memberships[\s\S]+to\s+authenticated/i
    );
    expect(rlsSql).toMatch(
      /grant\s+select,\s*insert,\s*update\s+on\s+table[\s\S]+public\.customers[\s\S]+public\.alerts[\s\S]+to\s+authenticated/i
    );
    expect(rlsSql).toMatch(
      /grant\s+select,\s*insert\s+on\s+table[\s\S]+public\.messages[\s\S]+to\s+authenticated/i
    );

    expect(rlsSql).not.toMatch(/\bto\s+anon\b/i);
    expect(rlsSql).not.toMatch(/\bto\s+public\b/i);
    expect(rlsSql).not.toMatch(/grant\s+all\b/i);
    expect(rlsSql).not.toMatch(/on\s+all\s+tables/i);
    expect(rlsSql).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(rlsSql).not.toMatch(/with\s+check\s*\(\s*true\s*\)/i);
  });

  it("keeps service_role recovery grants untouched and outside the RLS draft", () => {
    expect(serviceRoleGrantsSql).toMatch(
      /grant\s+usage\s+on\s+schema\s+public\s+to\s+service_role/i
    );
    expect(serviceRoleGrantsSql).toMatch(
      /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table/i
    );
    expect(rlsSql).not.toMatch(/\brevoke[\s\S]+service_role\b/i);
    expect(rlsSql).not.toMatch(/\bto\s+service_role\b/i);
  });

  it("keeps knowledge_pages RAG access scoped to allowed_for_ai true", () => {
    expect(rlsSql).toMatch(/knowledge_pages_select_allowed_for_active_staff_membership/i);
    expect(rlsSql).toMatch(/allowed_for_ai\s*=\s*true/i);
    expect(rlsSql).not.toMatch(/allowed_for_ai\s*=\s*false/i);
  });

  it("runs the static verification script without external DB access", () => {
    const result = spawnSync(process.execPath, [verifyScriptPath], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[ok] RLS migration static verification passed");
    expect(result.stderr).toBe("");
  });

  it("documents the Loop 094A RLS draft without marking production ready", () => {
    const linkedDocs = [
      readmePath,
      databaseDocPath,
      devLoopPath,
      productionHardeningPath,
      readinessRunbookPath,
      rollbackRunbookPath
    ];

    expect(existsSync(taskDocPath)).toBe(true);

    for (const filePath of linkedDocs) {
      const text = readFileSync(filePath, "utf8");

      expect(text, filePath).toContain("094a_rls_sql_draft_review.md");
    }

    const taskDoc = readFileSync(taskDocPath, "utf8");

    expect(taskDoc).toContain("0003_rls_core_tables.sql");
    expect(taskDoc).toContain("verify-rls-migration-static.mjs");
    expect(taskDoc).toContain("staging apply");
    expect(taskDoc).toContain("No-Go");
    expect(taskDoc).toContain("Supabase実DB接続");
  });
});
