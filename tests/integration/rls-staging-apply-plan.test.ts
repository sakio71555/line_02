import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = join(repoRoot, "docs/11_codex_tasks/095a_rls_staging_apply_plan.md");
const runbookPath = join(repoRoot, "docs/15_runbooks/rls_staging_apply_plan.md");
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const readinessRunbookPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const productionHardeningPath = join(
  repoRoot,
  "docs/15_runbooks/production_hardening_split_plan.md"
);
const rollbackRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_rollback_recovery.md"
);
const finalRecordPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_verification_final_record.md"
);
const verifyScriptPath = join(repoRoot, "scripts/dev-loop/verify-rls-migration-static.mjs");

describe("Loop 095A RLS staging apply planning docs", () => {
  it("adds the Loop 095A task doc and staging apply runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("documents the target RLS migration and that staging apply is not performed", () => {
    for (const text of [readText(taskDocPath), readText(runbookPath)]) {
      expect(text).toContain("0003_rls_core_tables.sql");
      expect(text).toContain("staging apply");
      expect(text).toContain("未実施");
      expect(text).toContain("Supabase実DB接続");
      expect(text).toContain("production readiness");
      expect(text).toContain("No-Go");
    }
  });

  it("documents Go No-Go, secret safety, planned commands, and psql path handling", () => {
    const runbook = readText(runbookPath);

    expect(runbook).toContain("Go Checklist");
    expect(runbook).toContain("No-Go Conditions");
    expect(runbook).toContain("Planned Commands");
    expect(runbook).toContain("Secret Non-Disclosure Rules");
    expect(runbook).toContain("verify-staging-env.mjs");
    expect(runbook).toContain("verify-staging-schema.mjs");
    expect(runbook).toContain("verify-staging-postgrest-grants.mjs");
    expect(runbook).toContain("verify-rls-migration-static.mjs");
    expect(runbook).toContain("apply-staging-migration.mjs");
    expect(runbook).toContain("/usr/local/opt/libpq/bin/psql");
    expect(runbook).toContain("/opt/homebrew/opt/libpq/bin/psql");
    expect(runbook).toContain("Loop 095Aでは実行しない");
  });

  it("documents post-apply verification and staging smoke requirements", () => {
    for (const text of [readText(taskDocPath), readText(runbookPath)]) {
      expect(text).toContain("Apply後 Verification Checklist");
      expect(text).toContain("RLS enabled tables count");
      expect(text).toContain("force RLS enabled table count");
      expect(text).toContain("policies count");
      expect(text).toContain("service_role grants");
      expect(text).toContain("allowed_for_ai = true");
      expect(text).toContain("Staging Smoke Checklist");
      expect(text).toContain("customers/messages smoke");
      expect(text).toContain("alerts smoke");
      expect(text).toContain("knowledge/RAG smoke");
      expect(text).toContain("authenticated_staff route smoke");
      expect(text).toContain("service_roleはRLS bypass");
    }
  });

  it("documents rollback recovery policy and dangerous commands as prohibited", () => {
    const runbook = readText(runbookPath);

    expect(runbook).toContain("Rollback / Recovery");
    expect(runbook).toContain("supabase db reset");
    expect(runbook).toContain("supabase migration repair");
    expect(runbook).toContain("rollback SQL");
    expect(runbook).toContain("partial apply");
    expect(runbook).toContain("productionには触らない");
    expect(runbook).toContain("別Loopで明示許可");
  });

  it("links README, dev docs, readiness docs, and rollback docs to the plan", () => {
    const linkedDocs = [
      readmePath,
      databaseDocPath,
      devLoopPath,
      readinessRunbookPath,
      productionHardeningPath,
      rollbackRunbookPath,
      finalRecordPath
    ];

    for (const filePath of linkedDocs) {
      const text = readText(filePath);

      expect(text, filePath).toContain("095a_rls_staging_apply_plan.md");
    }

    for (const filePath of [
      readmePath,
      databaseDocPath,
      devLoopPath,
      readinessRunbookPath,
      productionHardeningPath,
      rollbackRunbookPath
    ]) {
      const text = readText(filePath);

      expect(text, filePath).toContain("rls_staging_apply_plan.md");
    }
  });

  it("runs the existing RLS static verifier without external DB access", () => {
    const result = spawnSync(process.execPath, [verifyScriptPath], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[ok] RLS migration static verification passed");
    expect(result.stderr).toBe("");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
