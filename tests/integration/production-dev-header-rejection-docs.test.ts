import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/093_production_dev_header_rejection_auth_jwt_boundary.md"
);
const readmePath = join(repoRoot, "README.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const productionHardeningPath = join(
  repoRoot,
  "docs/15_runbooks/production_hardening_split_plan.md"
);
const rlsReadinessPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const completionAuditPath = join(
  repoRoot,
  "docs/15_runbooks/authenticated_staff_route_rollout_completion_audit.md"
);
const apiIndexPath = join(repoRoot, "apps/api/src/index.ts");
const initialMigrationPath = join(repoRoot, "packages/db/migrations/0001_initial_schema.sql");
const grantsMigrationPath = join(
  repoRoot,
  "packages/db/migrations/0002_service_role_postgrest_grants.sql"
);

describe("Loop 093 production dev header rejection docs", () => {
  it("adds the Loop 093 task doc", () => {
    expect(existsSync(taskDocPath)).toBe(true);
  });

  it("links current docs to the Loop 093 task doc", () => {
    for (const filePath of [
      readmePath,
      devLoopPath,
      databaseDocPath,
      productionHardeningPath,
      rlsReadinessPath,
      completionAuditPath
    ]) {
      expect(readText(filePath), filePath).toContain(
        "093_production_dev_header_rejection_auth_jwt_boundary.md"
      );
    }
  });

  it("documents production env, dev header rejection, and dev seed rejection", () => {
    const taskDoc = readText(taskDocPath);
    const hardeningDoc = readText(productionHardeningPath);
    const readinessDoc = readText(rlsReadinessPath);

    for (const text of [taskDoc, hardeningDoc, readinessDoc]) {
      expect(text).toContain("APP_ENV=production");
      expect(text).toContain("NODE_ENV=production");
      expect(text).toContain("x-tenant-id");
      expect(text).toContain("dev_header");
      expect(text).toContain("dev_tenant_header_not_allowed");
      expect(text).toContain("dev_route_not_allowed");
      expect(text).toContain("authenticated_staff_required");
    }
  });

  it("documents selectedTenantId as selector and keeps production No-Go explicit", () => {
    const taskDoc = readText(taskDocPath);
    const completionAudit = readText(completionAuditPath);

    for (const text of [taskDoc, completionAudit]) {
      expect(text).toContain("x-selected-tenant-id");
      expect(text).toContain("selector");
      expect(text).toContain("認証ではなく");
      expect(text).toContain("Supabase Auth/JWT");
      expect(text).toContain("RLS SQL");
      expect(text).toContain("No-Go");
    }
  });

  it("documents that real external connections and RLS SQL are still out of scope", () => {
    const taskDoc = readText(taskDocPath);

    for (const text of [
      "Supabase Auth/JWT本接続",
      "Supabase実DB接続",
      "RLS SQL",
      "LINE API実送信",
      "OpenAI API実接続",
      ".env"
    ]) {
      expect(taskDoc).toContain(text);
    }
  });

  it("keeps Loop 093 out of migrations and avoids RLS SQL changes", () => {
    const combinedSql = `${readText(initialMigrationPath)}\n${readText(grantsMigrationPath)}`;

    expect(combinedSql).not.toContain("Loop 093");
    expect(combinedSql).not.toMatch(
      /alter table\s+[\w.]+\s+enable row level security|alter table\s+[\w.]+\s+force row level security|create policy/i
    );
  });

  it("records the API production gate in the shared Admin route boundary", () => {
    const apiIndex = readText(apiIndexPath);

    expect(apiIndex).toContain("isProductionRuntime(input.env)");
    expect(apiIndex).toContain("dev_tenant_header_not_allowed");
    expect(apiIndex).toContain("authenticated_staff_required");
    expect(apiIndex).toContain("dev_route_not_allowed");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
