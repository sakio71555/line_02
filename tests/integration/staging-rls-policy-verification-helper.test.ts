import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const helperPath = join(repoRoot, "scripts/dev-loop/verify-staging-rls-policies.mjs");
const validFixturePath = join(repoRoot, "tests/fixtures/staging-migration/valid.env.fixture");

describe("Loop 095B staging RLS policy verification helper", () => {
  it("adds the RLS policy verification helper", () => {
    expect(existsSync(helperPath)).toBe(true);
  });

  it("keeps helper source focused on RLS policy verification and safety checks", () => {
    const source = readText(helperPath);

    expect(source).toContain("relrowsecurity");
    expect(source).toContain("relforcerowsecurity");
    expect(source).toContain("pg_policies");
    expect(source).toContain("auth.uid()");
    expect(source).toContain("staff_users");
    expect(source).toContain("staff_tenant_memberships");
    expect(source).toContain("allowed_for_ai = true");
    expect(source).toContain("broad anon/public table grants");
    expect(source).toContain("authenticated minimal grants verified");
    expect(source).toContain("service_role grants remain usable");
  });

  it("does not contain dangerous Supabase CLI commands or obvious env value logging", () => {
    const source = readText(helperPath);

    expect(source).not.toContain("supabase db reset");
    expect(source).not.toContain("supabase db push");
    expect(source).not.toContain("supabase migration repair");
    expect(source).not.toContain("console.log(process.env");
    expect(source).not.toContain("SUPABASE_DB_URL=");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
  });

  it("parses fake env in check-config-only mode without leaking fake values", () => {
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
    expect(output).toContain("[ok] staging RLS policy verification config parsed");
    expect(output).not.toContain("fixture_db_password");
    expect(output).not.toContain("fixture_project_ref");
    expect(output).not.toContain("fixture-project-ref.supabase.co");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
