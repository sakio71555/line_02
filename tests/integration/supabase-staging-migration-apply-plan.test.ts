import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/071_supabase_staging_migration_apply_plan.md"
);
const applyPlanRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_migration_apply_plan.md"
);
const applyResultTemplatePath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_migration_apply_result_template.md"
);
const dryRunRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_migration_dry_run.md"
);
const stagingRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_persistence_checklist.md"
);
const envReadinessRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_env_readiness_checklist.md"
);
const readmePath = join(repoRoot, "README.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");

describe("Loop 071 Supabase staging migration apply plan docs", () => {
  it("keeps the expected Loop 071 docs in place", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(applyPlanRunbookPath)).toBe(true);
    expect(existsSync(applyResultTemplatePath)).toBe(true);
  });

  it("documents that Loop 071 does not connect, apply, or push", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(applyPlanRunbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("Supabase接続");
      expect(text).toContain("migration apply");
      expect(text).toContain("git push");
      expect(text).toContain("行わない");
      expect(text).toContain("`.env`");
      expect(text).toContain("作成");
    }
  });

  it("records approval conditions and pre-apply checklist requirements", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(applyPlanRunbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("人間が明示的");
      expect(text).toContain("staging Supabase project");
      expect(text).toContain("production projectではない");
      expect(text).toContain("project refは");
      expect(text).toContain("docsには書かない");
      expect(text).toContain("git status --short");
      expect(text).toContain("Loop 070");
      expect(text).toContain("RLS未実装");
      expect(text).toContain("実顧客情報");
      expect(text).toContain("LINE userId");
      expect(text).toContain("rollback");
    }
  });

  it("keeps dangerous commands documented as prohibited", () => {
    const runbook = readText(applyPlanRunbookPath);

    expect(runbook).toContain("Prohibited Commands");
    expect(runbook).toContain("supabase db reset");
    expect(runbook).toContain("supabase db push --linked");
    expect(runbook).toContain("supabase migration repair");
    expect(runbook).toContain("supabase link --project-ref <PRODUCTION_PROJECT_REF>");
    expect(runbook).toContain("production key");
    expect(runbook).toContain("実顧客情報入りseed");
    expect(runbook).toContain("LINE userId入りseed");
  });

  it("keeps candidate commands clearly marked as not executed in Loop 071", () => {
    const taskDoc = readText(taskDocPath);

    expect(taskDoc).toContain("Candidate Commands");
    expect(taskDoc).toContain("supabase --version");
    expect(taskDoc).toContain("supabase link --project-ref <STAGING_PROJECT_REF>");
    expect(taskDoc).toContain("supabase db push");
    expect(taskDoc).toContain("Loop 071では実行しない");
  });

  it("documents post-apply checks, rollback policy, and Go No-Go criteria", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(applyPlanRunbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("Post-apply Checks");
      expect(text).toContain("customers.last_customer_message_at");
      expect(text).toContain("knowledge_pages.allowed_for_ai");
      expect(text).toContain("staff_tenant_memberships");
      expect(text).toContain("Rollback / Recovery");
      expect(text).toContain("Go / No-Go");
      expect(text).toContain("No-Go");
      expect(text).toContain("projectがstagingか不明");
    }
  });

  it("keeps the apply result template free of project ref and secret values", () => {
    const template = readText(applyResultTemplatePath);

    expect(template).toContain("Date / time");
    expect(template).toContain("Operator");
    expect(template).toContain("Target environment: staging only");
    expect(template).toContain("Target migration");
    expect(template).toContain("Commands Run");
    expect(template).toContain("Tables Checked");
    expect(template).toContain("Indexes Checked");
    expect(template).toContain("Constraints Checked");
    expect(template).toContain("RLS State");
    expect(template).toContain("Rollback");
    expect(template).toContain("Can proceed to next loop");
    expect(template).toContain("Do not write secrets");
    expect(template).toContain("Supabase project refs");
    expect(template).toContain("LINE userId");
    expect(template).toContain("real customer information");
  });

  it("links README, dev loop, and staging runbooks to the apply plan", () => {
    const readme = readText(readmePath);
    const devLoop = readText(devLoopPath);
    const stagingRunbook = readText(stagingRunbookPath);
    const envReadinessRunbook = readText(envReadinessRunbookPath);
    const dryRunRunbook = readText(dryRunRunbookPath);

    expect(readme).toContain("071_supabase_staging_migration_apply_plan.md");
    expect(readme).toContain("supabase_staging_migration_apply_plan.md");
    expect(readme).toContain("supabase_staging_migration_apply_result_template.md");
    expect(devLoop).toContain("apply plan Loop");
    expect(stagingRunbook).toContain("supabase_staging_migration_apply_plan.md");
    expect(stagingRunbook).toContain("supabase_staging_migration_apply_result_template.md");
    expect(envReadinessRunbook).toContain("Loop 071 apply plan");
    expect(dryRunRunbook).toContain("Supabase Staging Migration Apply Plan");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
