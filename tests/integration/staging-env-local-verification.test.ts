import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const scriptPath = join(repoRoot, "scripts/dev-loop/verify-staging-env.mjs");
const fixtureDir = join(repoRoot, "tests/fixtures/staging-env");

describe("Loop 075 staging env local verification", () => {
  it("keeps the verification script in place", () => {
    expect(existsSync(scriptPath)).toBe(true);
  });

  it("exits 0 for a valid fixture without leaking values", () => {
    const result = runVerifier("valid.env.fixture");
    const output = joinOutput(result);

    expect(result.status).toBe(0);
    expect(output).toContain("[ok] SUPABASE_URL is present");
    expect(output).toContain("[ok] LINE_REAL_PUSH_ENABLED=false");
    expect(output).toContain("[ok] AI_PROVIDER=mock");
    expect(output).toContain("[ok] REPOSITORY_RUNTIME=in_memory");
    expect(output).toContain("[ok] TENANT_ID=tenant_amamihome");
    expectNoFixtureValuesLeaked(output, "valid.env.fixture");
  });

  it("exits 1 when SUPABASE_URL is missing", () => {
    const result = runVerifier("missing.env.fixture");
    const output = joinOutput(result);

    expect(result.status).toBe(1);
    expect(output).toContain("[ng] SUPABASE_URL is missing or unsafe");
    expect(output).toContain("- SUPABASE_URL");
    expectNoFixtureValuesLeaked(output, "missing.env.fixture");
  });

  it("exits 1 when placeholders or unsafe flags remain", () => {
    const result = runVerifier("unsafe.env.fixture");
    const output = joinOutput(result);

    expect(result.status).toBe(1);
    expect(output).toContain("[ng] SUPABASE_DB_URL is missing or unsafe");
    expect(output).toContain("[ng] LINE_REAL_PUSH_ENABLED is missing or unsafe");
    expect(output).toContain("[ng] AI_PROVIDER is missing or unsafe");
    expect(output).toContain("[ng] REPOSITORY_RUNTIME is missing or unsafe");
    expect(output).toContain("- SUPABASE_DB_URL");
    expect(output).toContain("- LINE_REAL_PUSH_ENABLED");
    expect(output).toContain("- AI_PROVIDER");
    expect(output).toContain("- REPOSITORY_RUNTIME");
    expectNoFixtureValuesLeaked(output, "unsafe.env.fixture");
  });

  it("links README and runbook to the safe local verification flow", () => {
    const readme = readText("README.md");
    const runbook = readText("docs/15_runbooks/staging_env_local_fill_verification.md");

    expect(readme).toContain("docs/15_runbooks/staging_env_local_fill_verification.md");
    expect(runbook).toContain("secretを表示しない");
    expect(runbook).toContain("node scripts/dev-loop/verify-staging-env.mjs --file .env.staging");
  });
});

function runVerifier(fixtureName: string): ReturnType<typeof spawnSync> {
  return spawnSync("node", [scriptPath, "--file", join(fixtureDir, fixtureName)], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

function joinOutput(result: ReturnType<typeof spawnSync>): string {
  return `${result.stdout}\n${result.stderr}`;
}

function readText(filePath: string): string {
  return readFileSync(join(repoRoot, filePath), "utf8");
}

function expectNoFixtureValuesLeaked(output: string, fixtureName: string): void {
  const values = readEnvValues(join(fixtureDir, fixtureName)).filter(
    (value) =>
      value.length > 0 &&
      !["false", "true", "mock", "openai", "in_memory", "supabase", "staging", "tenant_amamihome", "amamihome"].includes(
        value
      ) &&
      value !== "[YOUR-PASSWORD]"
  );

  for (const value of values) {
    expect(output).not.toContain(value);
  }
}

function readEnvValues(filePath: string): string[] {
  return readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => line.split("=").slice(1).join("=").trim())
    .filter((value) => value.length > 0);
}
