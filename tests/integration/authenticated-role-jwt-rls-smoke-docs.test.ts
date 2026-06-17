import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md"
);
const readmePath = join(repoRoot, "README.md");
const databaseDocPath = join(repoRoot, "docs/03_database.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/rls_auth_production_readiness.md");
const hardeningPath = join(repoRoot, "docs/15_runbooks/production_hardening_split_plan.md");
const finalRecordPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_verification_final_record.md"
);
const persistenceChecklistPath = join(
  repoRoot,
  "docs/15_runbooks/supabase_staging_persistence_checklist.md"
);

describe("Loop 096 authenticated role JWT RLS smoke docs", () => {
  it("adds the Loop 096 task doc", () => {
    expect(existsSync(taskDocPath)).toBe(true);
  });

  it("records authenticated role JWT claim smoke method and results", () => {
    const taskDoc = readText(taskDocPath);

    expect(taskDoc).toContain("SET LOCAL ROLE authenticated");
    expect(taskDoc).toContain("request.jwt.claim.sub");
    expect(taskDoc).toContain("auth.uid()");
    expect(taskDoc).toContain("tenant A/B read separation");
    expect(taskDoc).toContain("inactive staff");
    expect(taskDoc).toContain("inactive membership");
    expect(taskDoc).toContain("allowed_for_ai=false");
    expect(taskDoc).toContain("BEGIN ... ROLLBACK");
  });

  it("records service_role smoke limitation and production No-Go", () => {
    const taskDoc = readText(taskDocPath);

    expect(taskDoc).toContain("service_role smoke");
    expect(taskDoc).toContain("RLS bypass");
    expect(taskDoc).toContain("Supabase Auth/JWT本接続");
    expect(taskDoc).toContain("production readiness remains No-Go");
    expect(taskDoc).toContain("Supabase Auth user作成");
  });

  it("links README, database, dev loop, and runbooks to Loop 096", () => {
    for (const filePath of [
      readmePath,
      databaseDocPath,
      devLoopPath,
      readinessPath,
      hardeningPath,
      finalRecordPath,
      persistenceChecklistPath
    ]) {
      const text = readText(filePath);

      expect(text, filePath).toContain("096_authenticated_role_jwt_rls_smoke.md");
      expect(text, filePath).toContain("Loop 096");
    }
  });

  it("keeps docs clear that real external providers and production were not used", () => {
    for (const filePath of [taskDocPath, readinessPath, hardeningPath, finalRecordPath]) {
      const text = readText(filePath);

      expect(text, filePath).toContain("production");
      expect(text, filePath).toContain("No-Go");
      expect(text, filePath).toContain("LINE");
      expect(text, filePath).toContain("OpenAI");
    }
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
