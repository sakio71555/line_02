import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/097_supabase_auth_jwt_connection_plan.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/supabase_auth_jwt_connection_plan.md");
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopDocPath = join(repoRoot, "docs/08_dev_loop.md");
const readinessRunbookPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const hardeningRunbookPath = join(repoRoot, "docs/15_runbooks/production_hardening_split_plan.md");
const stagingRecordPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_verification_final_record.md"
);

describe("Loop 097 Supabase Auth/JWT connection plan", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("documents Authorization Bearer handling and safe errors", () => {
    const combined = readText(taskDocPath) + "\n" + readText(runbookPath);

    expect(combined).toContain("Authorization: Bearer <access_token>");
    expect(combined).toContain("authenticated_staff_required");
    expect(combined).toContain("session_expired");
    expect(combined).toContain("token値はlog、error body、docs、dev logに出さない");
    expect(combined).toContain("x-selected-tenant-id");
    expect(combined).toContain("認証ではない");
  });

  it("documents Supabase Auth user and staff lookup mapping", () => {
    const combined = readText(taskDocPath) + "\n" + readText(runbookPath);

    expect(combined).toContain("Supabase Auth user.id");
    expect(combined).toContain("staff_users.auth_user_id");
    expect(combined).toContain("StaffAuthLookup");
    expect(combined).toContain("active staff");
    expect(combined).toContain("active membership");
    expect(combined).toContain("tenant_membership_denied");
  });

  it("documents fake verifier versus real verifier and the real boundary contract", () => {
    const taskDoc = readText(taskDocPath);

    expect(taskDoc).toContain("Fake Verifier vs Real Verifier");
    expect(taskDoc).toContain("real verifier");
    expect(taskDoc).toContain("AuthSessionVerifier");
    expect(taskDoc).toContain("module import時にenv validation、client生成、network accessを走らせない");
    expect(taskDoc).toContain("network failure");
  });

  it("documents selectedTenantId revalidation and RLS auth.uid relation", () => {
    const combined = readText(taskDocPath) + "\n" + readText(runbookPath);

    expect(combined).toContain("selectedTenantId");
    expect(combined).toContain("active membershipで必ず再検証");
    expect(combined).toContain("auth.uid()");
    expect(combined).toContain("service_role smokeはRLS bypass");
    expect(combined).toContain("authenticated role smoke");
  });

  it("documents staging real Auth smoke Go/No-Go and the later Loop 099 result", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);
    const combined = `${taskDoc}\n${runbook}`;

    expect(combined).toContain("Staging Real Auth Smoke");
    expect(combined).toContain("Go / No-Go");
    expect(combined).toContain("productionには接続しない");
    expect(taskDoc).toContain("Supabase Auth user作成");
    expect(taskDoc).toContain("Supabase Auth/JWT本接続");
    expect(taskDoc).toContain("未実施");
    expect(runbook).toContain("Loop 099でstaging real Auth user smokeは成功済み");
    expect(runbook).toContain("production Auth/JWT runtime connection");
    expect(combined).toContain("production readiness remains No-Go");
  });

  it("links the plan from existing docs and runbooks", () => {
    const expectedTaskLink = "docs/11_codex_tasks/097_supabase_auth_jwt_connection_plan.md";
    const expectedRunbookLink = "docs/15_runbooks/supabase_auth_jwt_connection_plan.md";

    expect(readText(readmePath)).toContain(expectedTaskLink);
    expect(readText(readmePath)).toContain(expectedRunbookLink);
    expect(readText(databaseDocPath)).toContain(expectedTaskLink);
    expect(readText(devLoopDocPath)).toContain(expectedTaskLink);
    expect(readText(readinessRunbookPath)).toContain("Loop 097");
    expect(readText(hardeningRunbookPath)).toContain("Loop 097");
    expect(readText(stagingRecordPath)).toContain("Loop 097");
  });

  it("does not include obvious secret or token values in the added docs", () => {
    const combined = readText(taskDocPath) + "\n" + readText(runbookPath);

    expect(combined).not.toContain("SUPABASE_DB_URL=");
    expect(combined).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(combined).not.toContain("SUPABASE_ANON_KEY=");
    expect(combined).not.toContain("SUPABASE_URL=");
    expect(combined).not.toContain("postgres://");
    expect(combined).not.toContain("postgresql://");
    expect(combined).not.toContain("eyJ");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
