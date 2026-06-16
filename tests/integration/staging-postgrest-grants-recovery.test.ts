import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const grantMigrationPath = join(
  repoRoot,
  "packages/db/migrations/0002_service_role_postgrest_grants.sql"
);
const grantVerifyHelperPath = join(
  repoRoot,
  "scripts/dev-loop/verify-staging-postgrest-grants.mjs"
);
const smokeHelperPath = join(repoRoot, "scripts/dev-loop/smoke-staging-customer-message-api.mjs");
const smokeTestPath = join(repoRoot, "tests/integration/staging-customer-message-api-smoke.test.ts");
const validFixturePath = join(repoRoot, "tests/fixtures/staging-migration/valid.env.fixture");

describe("Loop 079.1 staging PostgREST service_role grants recovery", () => {
  it("adds a service_role-only PostgREST grants migration", () => {
    const sql = readText(grantMigrationPath);

    expect(sql).toMatch(/grant usage on schema public to service_role;/i);
    expect(sql).toMatch(/grant select, insert, update, delete on table[\s\S]*to service_role;/i);
    expect(sql).toContain("public.customers");
    expect(sql).toContain("public.messages");
    expect(sql).toContain("public.knowledge_pages");
    expect(sql).toMatch(/grant usage, select on all sequences in schema public to service_role;/i);
    expect(sql).not.toMatch(/\bto\s+anon\b/i);
    expect(sql).not.toMatch(/\bto\s+authenticated\b/i);
    expect(sql).not.toMatch(/grant\s+all\s+on\s+all\s+tables/i);
    expect(sql).not.toMatch(/enable row level security|create policy/i);
  });

  it("keeps the grant verification and smoke helpers present", () => {
    expect(existsSync(grantVerifyHelperPath)).toBe(true);
    expect(existsSync(smokeHelperPath)).toBe(true);
    expect(existsSync(smokeTestPath)).toBe(true);
  });

  it("keeps helpers from printing env values or dangerous Supabase CLI commands", () => {
    const source = [readText(grantVerifyHelperPath), readText(smokeHelperPath), readText(smokeTestPath)].join(
      "\n"
    );

    expect(source).toContain("RUN_STAGING_SMOKE");
    expect(source).not.toContain("console.log(process.env");
    expect(source).not.toContain("console.log(env");
    expect(source).not.toContain("SUPABASE_DB_URL=");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(source).not.toContain("supabase db reset");
    expect(source).not.toContain("supabase migration repair");
    expect(source).not.toContain("supabase db push");
    expect(source).not.toContain("supabase link");
  });

  it("parses fake env in check-config-only mode without leaking fake values", () => {
    const result = spawnSync(
      "node",
      [grantVerifyHelperPath, "--env", validFixturePath, "--check-config-only"],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    expect(output).toContain("[ok] staging PostgREST grants verification config parsed");
    expect(output).not.toContain("fixture_db_password");
    expect(output).not.toContain("fixture_project_ref");
    expect(output).not.toContain("fixture-project-ref.supabase.co");
  });

  it("keeps staging API smoke skipped unless explicitly enabled", () => {
    const source = readText(smokeTestPath);

    expect(source).toContain("process.env.RUN_STAGING_SMOKE === \"1\"");
    expect(source).toContain("describe.skip");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
