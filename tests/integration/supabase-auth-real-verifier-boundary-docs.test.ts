import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/098_supabase_auth_real_verifier_boundary.md"
);
const sourcePath = join(repoRoot, "apps/api/src/admin/supabase-auth-session-verifier.ts");
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

describe("Loop 098 Supabase Auth real verifier boundary docs", () => {
  it("adds the task doc and source boundary", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(sourcePath)).toBe(true);
  });

  it("documents the verifier boundary and fake client test approach", () => {
    const combined = readText(taskDocPath) + "\n" + readText(runbookPath);

    expect(combined).toContain("SupabaseAuthSessionVerifier");
    expect(combined).toContain("SupabaseAuthClientLike");
    expect(combined).toContain("AuthSessionVerifier");
    expect(combined).toContain("fake Supabase auth client");
    expect(combined).toContain("client.auth.getUser");
  });

  it("documents token redaction and safe error mapping", () => {
    const combined = readText(taskDocPath) + "\n" + readText(runbookPath);

    expect(combined).toContain("token/secret redaction");
    expect(combined).toContain("session_expired");
    expect(combined).toContain("authenticated_staff_required");
    expect(combined).toContain("raw Supabase error");
    expect(combined).toContain("project ref");
  });

  it("documents production fake verifier guard and local/test compatibility", () => {
    const combined = readText(taskDocPath) + "\n" + readText(runbookPath);

    expect(combined).toContain("production modeではfake verifierをdefault利用しない");
    expect(combined).toContain("authenticated_staff_required");
    expect(combined).toContain("local/test");
    expect(combined).toContain("明示注入");
  });

  it("documents StaffAuthLookup, selectedTenantId, and RLS auth.uid relationships", () => {
    const combined = readText(taskDocPath) + "\n" + readText(runbookPath);

    expect(combined).toContain("StaffAuthLookup");
    expect(combined).toContain("selectedTenantId");
    expect(combined).toContain("active membership");
    expect(combined).toContain("auth.uid()");
    expect(combined).toContain("staff_users.auth_user_id");
  });

  it("records that real Supabase Auth connection and Auth user creation are still not done", () => {
    const combined = readText(taskDocPath) + "\n" + readText(runbookPath);

    expect(combined).toContain("実Supabase Auth接続");
    expect(combined).toContain("Supabase Auth user作成");
    expect(combined).toContain("staging real Auth smoke");
    expect(combined).toContain("production readiness remains No-Go");
  });

  it("links Loop 098 from existing docs and runbooks", () => {
    const expectedTaskLink = "docs/11_codex_tasks/098_supabase_auth_real_verifier_boundary.md";

    expect(readText(readmePath)).toContain(expectedTaskLink);
    expect(readText(databaseDocPath)).toContain(expectedTaskLink);
    expect(readText(devLoopDocPath)).toContain(expectedTaskLink);
    expect(readText(readinessRunbookPath)).toContain("Loop 098");
    expect(readText(hardeningRunbookPath)).toContain("Loop 098");
    expect(readText(stagingRecordPath)).toContain("Loop 098");
  });

  it("does not include obvious secret or token values in the Loop 098 docs", () => {
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
