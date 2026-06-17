import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/095b_rls_staging_apply_execution_gate.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/rls_staging_apply_plan.md");
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const finalRecordPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_verification_final_record.md"
);
const persistenceChecklistPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_persistence_checklist.md"
);
const rollbackPath = join(repoRoot, "docs/15_runbooks/supabase_staging_rollback_recovery.md");
const helperPath = join(repoRoot, "scripts/dev-loop/verify-staging-rls-policies.mjs");

describe("Loop 095B RLS staging apply execution gate docs", () => {
  it("records the Loop 095B task doc and RLS verification helper", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(helperPath)).toBe(true);
  });

  it("records the target migration, apply result, and RLS verification counts", () => {
    const taskDoc = readText(taskDocPath);

    expect(taskDoc).toContain("0003_rls_core_tables.sql");
    expect(taskDoc).toContain("staging DBへのapplyは成功");
    expect(taskDoc).toContain("RLS enabled tables: `9/9`");
    expect(taskDoc).toContain("FORCE RLS tables: `9/9`");
    expect(taskDoc).toContain("policies verified: `14/14`");
    expect(taskDoc).toContain("broad anon/public table grants: `0`");
    expect(taskDoc).toContain("service_role grants: remain usable");
  });

  it("records staging smoke and production No-Go limitations", () => {
    const taskDoc = readText(taskDocPath);

    expect(taskDoc).toContain("smoke-staging-customer-message-api.mjs");
    expect(taskDoc).toContain("smoke-staging-alerts-api.mjs");
    expect(taskDoc).toContain("smoke-staging-knowledge-rag-api.mjs");
    expect(taskDoc).toContain("service_roleはRLS bypass");
    expect(taskDoc).toContain("authenticated role / JWT smokeは後続Loop");
    expect(taskDoc).toContain("production readiness remains No-Go");
  });

  it("updates README, database, dev loop, and runbooks with Loop 095B", () => {
    for (const filePath of [
      readmePath,
      databaseDocPath,
      devLoopPath,
      runbookPath,
      readinessPath,
      finalRecordPath,
      persistenceChecklistPath,
      rollbackPath
    ]) {
      const text = readText(filePath);

      expect(text, filePath).toContain("095b_rls_staging_apply_execution_gate.md");
      expect(text, filePath).toContain("Loop 095B");
    }
  });

  it("keeps docs clear that rollback production and real providers were not used", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("rollback");
      expect(text).toContain("実行していない");
      expect(text).toContain("production");
      expect(text).toContain("No-Go");
      expect(text).toContain("LINE");
      expect(text).toContain("OpenAI");
    }
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
