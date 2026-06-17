import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const seedHelperPath = join(repoRoot, "scripts/dev-loop/seed-staging-rls-smoke-data.mjs");
const smokeHelperPath = join(repoRoot, "scripts/dev-loop/smoke-staging-authenticated-rls.mjs");
const validFixturePath = join(repoRoot, "tests/fixtures/staging-migration/valid.env.fixture");

describe("Loop 096 authenticated RLS staging smoke helpers", () => {
  it("adds seed and authenticated RLS smoke helpers", () => {
    expect(existsSync(seedHelperPath)).toBe(true);
    expect(existsSync(smokeHelperPath)).toBe(true);
  });

  it("keeps authenticated smoke focused on JWT claim simulation and tenant separation", () => {
    const source = readText(smokeHelperPath);

    expect(source).toContain("set local role authenticated");
    expect(source).toContain("request.jwt.claim.sub");
    expect(source).toContain("auth.uid()");
    expect(source).toContain("tenant_rls_a");
    expect(source).toContain("tenant_rls_b");
    expect(source).toContain("staff_rls_inactive");
    expect(source).toContain("membership_rls_b_inactive_a");
    expect(source).toContain("allowed_for_ai=false");
    expect(source).toContain("rollback");
    expect(source).toContain("wrong-tenant insert denied");
  });

  it("keeps seed helper limited to dummy data and no Supabase Auth user creation", () => {
    const source = readText(seedHelperPath);

    expect(source).toContain("tenant_rls_a");
    expect(source).toContain("tenant_rls_b");
    expect(source).toContain("11111111-1111-1111-1111-111111111111");
    expect(source).toContain("22222222-2222-2222-2222-222222222222");
    expect(source).toContain("33333333-3333-3333-3333-333333333333");
    expect(source).toContain("example.invalid");
    expect(source).toContain("dummy_line_user_rls_a");
    expect(source).toContain("no Supabase Auth users were created");
    expect(source).not.toContain("auth.users");
    expect(source).not.toContain("supabase db reset");
    expect(source).not.toContain("supabase db push");
    expect(source).not.toContain("supabase migration repair");
  });

  it("does not contain obvious env value logging", () => {
    const combined = `${readText(seedHelperPath)}\n${readText(smokeHelperPath)}`;

    expect(combined).not.toContain("console.log(process.env");
    expect(combined).not.toContain("SUPABASE_DB_URL=");
    expect(combined).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(combined).not.toContain("SUPABASE_ANON_KEY=");
    expect(combined).not.toContain("SUPABASE_URL=");
  });

  it("parses fake env in check-config-only mode without leaking fake values", () => {
    for (const helperPath of [seedHelperPath, smokeHelperPath]) {
      const result = spawnSync(
        "node",
        [helperPath, "--env", validFixturePath, "--check-config-only"],
        {
          cwd: repoRoot,
          encoding: "utf8"
        }
      );
      const output = `${result.stdout}\n${result.stderr}`;

      expect(result.status).toBe(0);
      expect(output).toContain("[ok]");
      expect(output).not.toContain("fixture_db_password");
      expect(output).not.toContain("fixture_project_ref");
      expect(output).not.toContain("fixture-project-ref.supabase.co");
    }
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
