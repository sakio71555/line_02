import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(repoRoot, "docs/11_codex_tasks/099_staging_real_auth_user_smoke.md");
const smokeScriptPath = join(repoRoot, "scripts/dev-loop/smoke-staging-real-auth-api.mjs");
const smokeTestPath = join(repoRoot, "tests/integration/staging-real-auth-api-smoke.test.ts");
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const authRunbookPath = join(repoRoot, "docs/15_runbooks/supabase_auth_jwt_connection_plan.md");
const readinessRunbookPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const hardeningRunbookPath = join(repoRoot, "docs/15_runbooks/production_hardening_split_plan.md");
const stagingRecordPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_verification_final_record.md"
);

describe("Loop 099 staging real Auth user smoke docs", () => {
  it("adds the task doc, smoke helper, and explicit staging smoke test", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(smokeScriptPath)).toBe(true);
    expect(existsSync(smokeTestPath)).toBe(true);

    const script = readText(smokeScriptPath);
    const testSource = readText(smokeTestPath);

    expect(script).toContain("RUN_STAGING_REAL_AUTH_SMOKE");
    expect(script).toContain("verify-staging-env.mjs");
    expect(script).toContain("verify-staging-schema.mjs");
    expect(script).toContain("verify-staging-postgrest-grants.mjs");
    expect(script).toContain("verify-staging-rls-policies.mjs");
    expect(testSource).toContain("describe.skip");
    expect(testSource).toContain("auth.admin.createUser");
    expect(testSource).toContain("auth.admin.deleteUser");
  });

  it("documents real verifier, staff mapping, selectedTenantId, and RLS linkage", () => {
    const combined = readText(taskDocPath) + "\n" + readText(authRunbookPath);

    expect(combined).toContain("SupabaseAuthSessionVerifier");
    expect(combined).toContain("staff_users.auth_user_id");
    expect(combined).toContain("active staff_tenant_memberships");
    expect(combined).toContain("selectedTenantId");
    expect(combined).toContain("auth.uid()");
    expect(combined).toContain("allowed_for_ai=false");
  });

  it("records the staging result while keeping production readiness No-Go", () => {
    const combined = [
      readText(taskDocPath),
      readText(authRunbookPath),
      readText(readinessRunbookPath),
      readText(hardeningRunbookPath),
      readText(stagingRecordPath)
    ].join("\n");

    expect(combined).toContain("Loop 099");
    expect(combined).toContain("staging real Auth user smoke");
    expect(combined).toContain("Bearer token");
    expect(combined).toContain("Admin route smoke");
    expect(combined).toContain("cleanup");
    expect(combined).toContain("production readiness remains No-Go");
    expect(combined).toContain("production Auth/JWT");
    expect(combined).toContain("Admin UI selectedTenantId");
    expect(combined).toContain("LINE real push");
    expect(combined).toContain("OpenAI real API");
  });

  it("links Loop 099 from README, database docs, dev loop docs, and runbooks", () => {
    const expectedTaskLink = "docs/11_codex_tasks/099_staging_real_auth_user_smoke.md";

    expect(readText(readmePath)).toContain(expectedTaskLink);
    expect(readText(databaseDocPath)).toContain(expectedTaskLink);
    expect(readText(devLoopPath)).toContain(expectedTaskLink);
    expect(readText(authRunbookPath)).toContain("Loop 099");
    expect(readText(readinessRunbookPath)).toContain("Loop 099");
    expect(readText(hardeningRunbookPath)).toContain("Loop 099");
    expect(readText(stagingRecordPath)).toContain("Loop 099");
  });

  it("does not include obvious secret, token, or project values in the Loop 099 docs", () => {
    const combined = [
      readText(taskDocPath),
      readText(authRunbookPath),
      readText(readinessRunbookPath),
      readText(hardeningRunbookPath),
      readText(stagingRecordPath)
    ].join("\n");

    expect(combined).not.toContain("SUPABASE_DB_URL=");
    expect(combined).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(combined).not.toContain("SUPABASE_ANON_KEY=");
    expect(combined).not.toContain("SUPABASE_URL=");
    expect(combined).not.toContain("Authorization: Bearer eyJ");
    expect(combined).not.toContain("postgres://");
    expect(combined).not.toContain("postgresql://");
    expect(combined).not.toContain("service_role=");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
