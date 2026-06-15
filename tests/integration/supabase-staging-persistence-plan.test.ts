import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/065_supabase_persistence_staging_plan.md"
);
const envReadinessTaskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/066_supabase_staging_env_readiness_checklist.md"
);
const runtimeSwitchTaskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/067_supabase_runtime_switch_boundary_customers_messages.md"
);
const fakeClientRepositoryTaskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/068_supabase_repository_integration_tests_fake_client.md"
);
const stagingRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_persistence_checklist.md"
);
const envReadinessRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_env_readiness_checklist.md"
);
const internalReviewRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/amami_home_internal_review_checklist.md"
);
const readmePath = join(repoRoot, "README.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");

describe("Loop 065 Supabase staging persistence plan docs", () => {
  const taskDoc = readFileSync(taskDocPath, "utf8");
  const envReadinessTaskDoc = readFileSync(envReadinessTaskDocPath, "utf8");
  const runtimeSwitchTaskDoc = readFileSync(runtimeSwitchTaskDocPath, "utf8");
  const fakeClientRepositoryTaskDoc = readFileSync(fakeClientRepositoryTaskDocPath, "utf8");
  const stagingRunbook = readFileSync(stagingRunbookPath, "utf8");
  const envReadinessRunbook = readFileSync(envReadinessRunbookPath, "utf8");
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

  it("keeps the Loop 066 env readiness checklist reachable", () => {
    expect(readme).toContain("066_supabase_staging_env_readiness_checklist.md");
    expect(readme).toContain("supabase_staging_env_readiness_checklist.md");
    expect(readme).toContain("Supabase接続、`.env` 作成、migration applyは未実施");
    expect(stagingRunbook).toContain("supabase_staging_env_readiness_checklist.md");
    expect(internalReviewRunbook).toContain("Supabase staging env readiness checklist");
  });

  it("documents required Supabase env names without real values", () => {
    expect(envReadinessTaskDoc).toContain(
      "Loop 066: Supabase Staging Env Readiness Checklist"
    );
    expect(envReadinessTaskDoc).toContain("Required Env Names");
    expect(envReadinessTaskDoc).toContain("SUPABASE_URL");
    expect(envReadinessTaskDoc).toContain("SUPABASE_ANON_KEY");
    expect(envReadinessTaskDoc).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(envReadinessTaskDoc).toContain("SUPABASE_DB_URL");
    expect(envReadinessTaskDoc).toContain("実値は書かない");
    expect(envReadinessTaskDoc).toContain("browser / LIFF / client componentへ絶対に出さない");
  });

  it("documents staging production separation and migration readiness", () => {
    expect(envReadinessTaskDoc).toContain("Staging / Production Project Separation");
    expect(envReadinessTaskDoc).toContain("staging検証でproduction projectを使わない");
    expect(envReadinessTaskDoc).toContain("Migration Apply Pre-checklist");
    expect(envReadinessTaskDoc).toContain("project refを声出し確認する");
    expect(envReadinessTaskDoc).toContain("RLSなしでproductionへ進まない");
    expect(envReadinessTaskDoc).toContain("apply前に `git status --short` がclean");
  });

  it("keeps the env readiness runbook explicit about secrets and dummy data", () => {
    expect(envReadinessRunbook).toContain("Supabase Staging Env Readiness Checklist");
    expect(envReadinessRunbook).toContain("実keyを書かない");
    expect(envReadinessRunbook).toContain("実keyをCodexに貼らない");
    expect(envReadinessRunbook).toContain("実顧客情報を使わない");
    expect(envReadinessRunbook).toContain("LINE userIdを使わない");
    expect(envReadinessRunbook).toContain("Supabaseへ接続しない");
    expect(envReadinessRunbook).toContain("`.env` を作らない");
    expect(envReadinessRunbook).toContain("Tool Readiness");
  });

  it("keeps dev loop guidance for the env readiness gate", () => {
    expect(devLoop).toContain("Supabase staging接続へ進む前");
    expect(devLoop).toContain("env/key/project/migration/dummy data");
    expect(devLoop).toContain("readiness checklist");
  });

  it("documents the Loop 067 customer/message runtime switch boundary", () => {
    expect(runtimeSwitchTaskDoc).toContain(
      "Loop 067: Supabase Runtime Switch Boundary for Customers/Messages"
    );
    expect(runtimeSwitchTaskDoc).toContain("RepositoryRuntimeMode");
    expect(runtimeSwitchTaskDoc).toContain("CustomerMessageRepositoryBundle");
    expect(runtimeSwitchTaskDoc).toContain("createInMemoryCustomerMessageRepositories");
    expect(runtimeSwitchTaskDoc).toContain("createSupabaseCustomerMessageRepositories");
    expect(runtimeSwitchTaskDoc).toContain("SupabaseRuntimeNotConfiguredError");
    expect(runtimeSwitchTaskDoc).toContain("default runtimeはin-memory");
    expect(runtimeSwitchTaskDoc).toContain("API runtimeへSupabase repositoryを接続していない");
  });

  it("keeps README and runbooks linked to the Loop 067 runtime boundary", () => {
    expect(readme).toContain("067_supabase_runtime_switch_boundary_customers_messages.md");
    expect(readme).toContain("default in-memoryを維持");
    expect(readme).toContain("API runtime差し替えは未実施");
    expect(devLoop).toContain("runtime mode / repository bundle / factory");
    expect(stagingRunbook).toContain("Loop 067でcustomers/messages runtime switch boundary");
    expect(envReadinessRunbook).toContain(
      "Loop 067でcustomers/messagesのruntime mode / bundle / factory境界"
    );
  });

  it("documents the Loop 068 fake client repository integration tests", () => {
    expect(fakeClientRepositoryTaskDoc).toContain(
      "Loop 068: Supabase Repository Integration Tests with Fake Client"
    );
    expect(fakeClientRepositoryTaskDoc).toContain("SupabaseCustomerRepository");
    expect(fakeClientRepositoryTaskDoc).toContain("SupabaseMessageRepository");
    expect(fakeClientRepositoryTaskDoc).toContain("`tenant_id` filter");
    expect(fakeClientRepositoryTaskDoc).toContain("customer write payload mapping");
    expect(fakeClientRepositoryTaskDoc).toContain("message write payload mapping");
    expect(fakeClientRepositoryTaskDoc).toContain("secret値やURL値");
    expect(fakeClientRepositoryTaskDoc).toContain("Supabase実DBでのintegration testは未実施");
  });

  it("keeps README and runbooks linked to the Loop 068 fake client checks", () => {
    expect(readme).toContain("068_supabase_repository_integration_tests_fake_client.md");
    expect(readme).toContain("timeline order");
    expect(readme).toContain("API runtime switchは未実施");
    expect(devLoop).toContain("fake clientでrepository mapping");
    expect(stagingRunbook).toContain(
      "Loop 068でcustomers/messagesのfake client repository tests"
    );
  });
});
