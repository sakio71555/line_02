import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/073_supabase_staging_migration_apply_execution_gate.md"
);
const executionGateRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_migration_apply_execution_gate.md"
);
const applyPlanRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_migration_apply_plan.md"
);
const stagingRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_persistence_checklist.md"
);
const readmePath = join(repoRoot, "README.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");

describe("Loop 073 Supabase staging migration apply execution gate docs", () => {
  it("keeps the expected Loop 073 docs in place", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(executionGateRunbookPath)).toBe(true);
  });

  it("links README, dev loop, and staging runbooks to the execution gate", () => {
    const readme = readText(readmePath);
    const devLoop = readText(devLoopPath);
    const applyPlanRunbook = readText(applyPlanRunbookPath);
    const stagingRunbook = readText(stagingRunbookPath);

    expect(readme).toContain("073_supabase_staging_migration_apply_execution_gate.md");
    expect(readme).toContain("supabase_staging_migration_apply_execution_gate.md");
    expect(devLoop).toContain("execution gate Loop");
    expect(applyPlanRunbook).toContain("supabase_staging_migration_apply_execution_gate.md");
    expect(stagingRunbook).toContain("Supabase Staging Migration Apply Execution Gate");
  });

  it("documents Go conditions and No-Go conditions", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(executionGateRunbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("Go Conditions");
      expect(text).toContain("No-Go Conditions");
      expect(text).toContain("明示的なapply実行許可");
      expect(text).toContain("staging projectであることが確認済み");
      expect(text).toContain("production projectでないことが確認済み");
      expect(text).toContain("必要envがローカルに設定済み");
      expect(text).toContain("rollback / recovery方針確認済み");
    }
  });

  it("records the current No-Go decision and missing information", () => {
    const taskDoc = readText(taskDocPath);

    expect(taskDoc).toContain("Decision: **No-Go**");
    expect(taskDoc).toContain("staging migration apply実行の明示許可");
    expect(taskDoc).toContain("staging Supabase project確認");
    expect(taskDoc).toContain("production projectではないことの確認");
    expect(taskDoc).toContain("必要env/key readiness");
    expect(taskDoc).toContain("Missing Information For Human Preparation");
    expect(taskDoc).toContain("staging migration applyを実行してよいという明示許可");
    expect(taskDoc).toContain("dummy dataだけで進める確認");
    expect(taskDoc).toContain("push可否の判断");
  });

  it("keeps explicit safety stops in the gate docs", () => {
    const runbook = readText(executionGateRunbookPath);
    const taskDoc = readText(taskDocPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("Supabase接続しない");
      expect(text).toContain("migration applyしない");
      expect(text).toContain("git pushしない");
      expect(text).toContain("実keyを書かない");
      expect(text).toContain("project refを書かない");
      expect(text).toContain("RLS SQLを書かない");
      expect(text).toContain("API runtime switchしない");
    }
  });

  it("keeps apply result template reserved for actual apply loops", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(executionGateRunbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("supabase_staging_migration_apply_result_template.md");
      expect(text).toContain("実行結果を捏造しない");
    }
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
