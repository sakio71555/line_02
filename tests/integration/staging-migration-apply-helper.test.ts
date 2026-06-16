import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const applyHelperPath = join(repoRoot, "scripts/dev-loop/apply-staging-migration.mjs");
const verifyHelperPath = join(repoRoot, "scripts/dev-loop/verify-staging-schema.mjs");
const psqlLibPath = join(repoRoot, "scripts/dev-loop/lib/staging-psql.mjs");
const validFixturePath = join(repoRoot, "tests/fixtures/staging-migration/valid.env.fixture");
const invalidFixturePath = join(repoRoot, "tests/fixtures/staging-migration/invalid-url.env.fixture");
const migrationPath = join(repoRoot, "packages/db/migrations/0001_initial_schema.sql");
const readmePath = join(repoRoot, "README.md");
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/078_supabase_staging_migration_apply_retry.md"
);

describe("Loop 078 staging migration apply helpers", () => {
  it("keeps the expected helper files in place", () => {
    expect(existsSync(applyHelperPath)).toBe(true);
    expect(existsSync(verifyHelperPath)).toBe(true);
    expect(existsSync(psqlLibPath)).toBe(true);
  });

  it("keeps helper source free of prohibited Supabase CLI commands", () => {
    const source = [
      readText(applyHelperPath),
      readText(verifyHelperPath),
      readText(psqlLibPath)
    ].join("\n");

    expect(source).not.toContain("supabase db push");
    expect(source).not.toContain("supabase link");
    expect(source).not.toContain("supabase db reset");
    expect(source).not.toContain("supabase migration repair");
    expect(source).not.toContain("console.log(raw");
    expect(source).not.toContain("console.log(dbUrl");
    expect(source).not.toContain("console.log(process.env");
  });

  it("parses a fake env in check-config-only mode without leaking fake values", () => {
    const result = spawnSync(
      "node",
      [
        applyHelperPath,
        "--env",
        validFixturePath,
        "--migration",
        migrationPath,
        "--check-config-only"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );
    const output = joinOutput(result);

    expect(result.status).toBe(0);
    expect(output).toContain("[ok] staging migration config parsed");
    expect(output).not.toContain("fixture_db_password");
    expect(output).not.toContain("fixture_project_ref");
    expect(output).not.toContain("fixture-project-ref.supabase.co");
  });

  it("handles fake parse errors without leaking fake values", () => {
    const result = spawnSync(
      "node",
      [
        applyHelperPath,
        "--env",
        invalidFixturePath,
        "--migration",
        migrationPath,
        "--check-config-only"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );
    const output = joinOutput(result);

    expect(result.status).toBe(1);
    expect(output).toContain("SUPABASE_DB_URL could not be parsed safely");
    expect(output).not.toContain("fixture_db_password");
  });

  it("lets schema helper parse fake env in check-config-only mode without leaking fake values", () => {
    const result = spawnSync(
      "node",
      [verifyHelperPath, "--env", validFixturePath, "--check-config-only"],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );
    const output = joinOutput(result);

    expect(result.status).toBe(0);
    expect(output).toContain("[ok] staging schema verification config parsed");
    expect(output).not.toContain("fixture_db_password");
    expect(output).not.toContain("fixture_project_ref");
    expect(output).not.toContain("fixture-project-ref.supabase.co");
  });

  it("links README to the apply result and keeps task doc secret rules", () => {
    const readme = readText(readmePath);
    const taskDoc = readText(taskDocPath);

    expect(readme).toContain("supabase_staging_migration_apply_result.md");
    expect(taskDoc).toContain("secret");
    expect(taskDoc).toContain("project ref");
    expect(taskDoc).toContain("DB URL");
    expect(taskDoc).toContain("Loop 078 result commit is not pushed");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function joinOutput(result: ReturnType<typeof spawnSync>): string {
  return `${result.stdout}\n${result.stderr}`;
}
