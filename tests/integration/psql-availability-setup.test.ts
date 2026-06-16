import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const runbookPath = join(repoRoot, "docs/15_runbooks/psql_availability_setup.md");
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/077_psql_availability_setup_apply_preflight.md"
);
const scriptPath = join(repoRoot, "scripts/dev-loop/check-psql-readiness.mjs");
const readmePath = join(repoRoot, "README.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");

describe("Loop 077 psql availability setup preflight", () => {
  it("keeps the psql setup runbook and task doc in place", () => {
    expect(existsSync(runbookPath)).toBe(true);
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("links README and dev loop docs to the psql readiness flow", () => {
    const readme = readText(readmePath);
    const devLoop = readText(devLoopPath);

    expect(readme).toContain("psql_availability_setup.md");
    expect(readme).toContain("077_psql_availability_setup_apply_preflight.md");
    expect(devLoop).toContain("psql availability setup / apply preflight");
  });

  it("documents manual setup options without allowing Codex installs", () => {
    const runbook = readText(runbookPath);

    expect(runbook).toContain("Postgres.app");
    expect(runbook).toContain("Homebrew libpq");
    expect(runbook).toContain("Homebrew PostgreSQL");
    expect(runbook).toContain("Codexはインストールしない");
    expect(runbook).toContain("brew install libpq");
    expect(runbook).toContain("brew install postgresql");
    expect(runbook).toContain("psql --version");
  });

  it("keeps the preflight safety stops explicit", () => {
    const runbook = readText(runbookPath);
    const taskDoc = readText(taskDocPath);

    for (const text of [runbook, taskDoc]) {
      expect(text).toContain("Supabase接続しない");
      expect(text).toContain("migration applyしない");
      expect(text).toContain(".env.staging");
      expect(text).toContain("値を表示しない");
      expect(text).toContain("git push");
    }
  });

  it("keeps the readiness script free of env and Supabase apply commands", () => {
    const script = readText(scriptPath);

    expect(script).toContain("psql");
    expect(script).toContain("--version");
    expect(script).not.toContain("SUPABASE_DB_URL");
    expect(script).not.toContain(".env.staging");
    expect(script).not.toContain("supabase db push");
    expect(script).not.toContain("supabase link");
    expect(script).not.toContain("brew install");
  });

  it("runs the readiness script without depending on psql being installed", () => {
    const result = spawnSync("node", [scriptPath], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    const output = `${result.stdout}\n${result.stderr}`;

    expect([0, 1]).toContain(result.status);
    expect(output).toMatch(/\[(ok|no-go)] psql is (available|not available)/);
    expect(output).not.toContain("SUPABASE_DB_URL");
    expect(output).not.toContain(".env.staging");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
