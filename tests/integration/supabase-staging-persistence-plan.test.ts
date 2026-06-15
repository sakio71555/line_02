import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/065_supabase_persistence_staging_plan.md"
);
const stagingRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_persistence_checklist.md"
);
const internalReviewRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/amami_home_internal_review_checklist.md"
);
const readmePath = join(repoRoot, "README.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");

describe("Loop 065 Supabase staging persistence plan docs", () => {
  const taskDoc = readFileSync(taskDocPath, "utf8");
  const stagingRunbook = readFileSync(stagingRunbookPath, "utf8");
  const internalReviewRunbook = readFileSync(internalReviewRunbookPath, "utf8");
  const readme = readFileSync(readmePath, "utf8");
  const devLoop = readFileSync(devLoopPath, "utf8");

  it("documents the staging persistence plan and current in-memory runtime", () => {
    expect(taskDoc).toContain("Loop 065: Supabase Persistence Staging Plan");
    expect(taskDoc).toContain("Current Runtime Status");
    expect(taskDoc).toContain("InMemoryCustomerRepository");
    expect(taskDoc).toContain("InMemoryMessageRepository");
    expect(taskDoc).toContain("InMemoryAlertRepository");
    expect(taskDoc).toContain("InMemoryKnowledgePageRepository");
    expect(taskDoc).toContain("API processを再起動するとdemo customers");
    expect(taskDoc).toContain("Supabase repositoryは追加済みだが");
  });

  it("keeps the repository inventory and data priorities explicit", () => {
    expect(taskDoc).toContain("SupabaseCustomerRepository");
    expect(taskDoc).toContain("SupabaseMessageRepository");
    expect(taskDoc).toContain("SupabaseAlertRepository");
    expect(taskDoc).toContain("SupabaseKnowledgePageRepository");
    expect(taskDoc).toContain("SupabaseStaffAuthLookupRepository");
    expect(taskDoc).toContain("customers");
    expect(taskDoc).toContain("messages");
    expect(taskDoc).toContain("alerts");
    expect(taskDoc).toContain("knowledge_pages");
    expect(taskDoc).toContain("Phase A: customer timeline persistence");
    expect(taskDoc).toContain("Phase B: alert and knowledge persistence");
  });

  it("defines local staging production separation and key handling", () => {
    expect(taskDoc).toContain("Local / Staging / Production Policy");
    expect(taskDoc).toContain("local");
    expect(taskDoc).toContain("staging");
    expect(taskDoc).toContain("production");
    expect(taskDoc).toContain("SUPABASE_URL");
    expect(taskDoc).toContain("SUPABASE_ANON_KEY");
    expect(taskDoc).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(taskDoc).toContain("SUPABASE_DB_URL");
    expect(taskDoc).toContain("service role keyを絶対に出さない");
    expect(taskDoc).toContain("Codexに秘密情報を貼らない");
  });

  it("includes migration apply and RLS service role safety checks", () => {
    expect(taskDoc).toContain("Migration Apply Pre-checklist");
    expect(taskDoc).toContain("production projectではない");
    expect(taskDoc).toContain("seed dataはdummy");
    expect(taskDoc).toContain("rollback方針");
    expect(taskDoc).toContain("RLS / Service Role Policy");
    expect(taskDoc).toContain("RLSなしのままproductionへ進まない");
    expect(taskDoc).toContain("repository層で `tenant_id` filter test");
  });

  it("keeps README and runbooks linked to the Loop 065 plan", () => {
    expect(readme).toContain("065_supabase_persistence_staging_plan.md");
    expect(readme).toContain("supabase_staging_persistence_checklist.md");
    expect(readme).toContain("Supabase接続やmigration applyは未実施");
    expect(stagingRunbook).toContain("Supabase Staging Persistence Checklist");
    expect(stagingRunbook).toContain("Before Migration Apply");
    expect(stagingRunbook).toContain("Before Runtime Switch");
    expect(stagingRunbook).toContain("Stop Conditions");
    expect(internalReviewRunbook).toContain("現在の社内確認版は一時保存");
    expect(internalReviewRunbook).toContain("Loop 065以降のSupabase staging plan");
  });

  it("keeps dev loop guidance clear before runtime switch", () => {
    expect(devLoop).toContain("社内確認版からstaging検証版へ進む場合");
    expect(devLoop).toContain("env/key管理");
    expect(devLoop).toContain("migration apply前チェック");
    expect(devLoop).toContain("runtime switch");
  });
});
