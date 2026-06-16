import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/production_hardening_split_plan.md");
const readmePath = join(repoRoot, "README.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const readinessRunbookPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const finalRecordPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_verification_final_record.md"
);
const stagingChecklistPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_persistence_checklist.md"
);
const initialMigrationPath = join(repoRoot, "packages/db/migrations/0001_initial_schema.sql");
const grantsMigrationPath = join(
  repoRoot,
  "packages/db/migrations/0002_service_role_postgrest_grants.sql"
);

const forbiddenRuntimePrefixes = [
  "apps/api/",
  "apps/admin/",
  "apps/liff/",
  "packages/ai/src/",
  "packages/config/src/",
  "packages/db/src/",
  "packages/domain/src/",
  "packages/line/src/",
  "packages/rag/src/",
  "packages/db/migrations/"
];

describe("Loop 086 production hardening split plan docs", () => {
  it("adds the Loop 086 task doc and production hardening runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("records staging 100 percent milestone and production No-Go reasons", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("staging拡張検証版100%相当");
      expect(text).toContain("production No-Go");
      expect(text).toContain("RLS未実装");
      expect(text).toContain("Auth/JWT未接続");
      expect(text).toContain("selectedTenantId");
      expect(text).toContain("production dev_header rejection");
      expect(text).toContain("service_role");
      expect(text).toContain("server-side only");
      expect(text).toContain("LINE real push");
      expect(text).toContain("OpenAI real API");
    }
  });

  it("documents the Loop 087 and later split without implementing everything in one loop", () => {
    const taskDoc = readText(taskDocPath);
    const runbook = readText(runbookPath);

    for (const text of [taskDoc, runbook]) {
      expect(text).toContain("Loop 087");
      expect(text).toContain("selectedTenantId transport boundary");
      expect(text).toContain("Loop 091");
      expect(text).toContain("production dev_header rejection");
      expect(text).toContain("Loop 092");
      expect(text).toContain("RLS SQL");
      expect(text).toContain("Loop 095");
      expect(text).toContain("LINE real push gate");
      expect(text).toContain("Loop 096");
      expect(text).toContain("OpenAI real API gate");
    }
  });

  it("links README and existing docs to the Loop 086 plan", () => {
    const expectedLinks = [
      "086_rls_auth_jwt_production_hardening_split_plan.md",
      "production_hardening_split_plan.md"
    ];

    for (const filePath of [
      readmePath,
      devLoopPath,
      databaseDocPath,
      readinessRunbookPath,
      finalRecordPath,
      stagingChecklistPath
    ]) {
      const text = readText(filePath);
      for (const link of expectedLinks) {
        expect(text, filePath).toContain(link);
      }
    }
  });

  it("does not add RLS SQL to migrations in Loop 086", () => {
    const sql = `${readText(initialMigrationPath)}\n${readText(grantsMigrationPath)}`;

    expect(sql).not.toMatch(/alter table\s+[\w.]+\s+enable row level security/i);
    expect(sql).not.toMatch(/alter table\s+[\w.]+\s+force row level security/i);
    expect(sql).not.toMatch(/create\s+policy/i);
    expect(sql).not.toContain("Loop 086");
  });

  it("keeps runtime, API, UI, package, and migration files unchanged in the working diff", () => {
    const changedFiles = new Set([
      ...gitChangedFiles(["diff", "--name-only"]),
      ...gitChangedFiles(["diff", "--cached", "--name-only"])
    ]);
    const forbiddenChanges = Array.from(changedFiles).filter((filePath) =>
      forbiddenRuntimePrefixes.some((prefix) => filePath.startsWith(prefix))
    );

    expect(forbiddenChanges).toEqual([]);
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function gitChangedFiles(args: string[]): string[] {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
