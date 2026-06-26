import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const fixtureRoot = join(repoRoot, "tmp/tests/copy-based-source");
const envContractPath = "deploy/vps/taiyolabel/env/staging-env-contract.example";

type FixtureContext = {
  sourceIdentity: { type: string; commit: string | null };
  gitStatusBranch: string;
  gitLogOneline: string;
};

describe("copy-based VPS staging compatibility", () => {
  afterEach(() => {
    rmSync(fixtureRoot, { force: true, recursive: true });
  });

  it("collects repo context without requiring a .git directory", () => {
    const releaseCommit = "abcdef1234567890abcdef1234567890abcdef12";
    createCopyBasedFixture(releaseCommit);

    const context = collectFixtureContext(fixtureRoot);

    expect(context.sourceIdentity.type).toBe("copy_based");
    expect(context.sourceIdentity.commit).toBe(releaseCommit);
    expect(context.gitStatusBranch).toContain("copy-based-source");
    expect(context.gitLogOneline).toContain(releaseCommit.slice(0, 12));
  });

  it("keeps a non-dotenv env contract for archives that exclude .env files", () => {
    const contract = readText(envContractPath);

    expect(existsSync(join(repoRoot, envContractPath))).toBe(true);
    expect(envContractPath).not.toMatch(/(^|\/)\.env/);
    expect(contract).toContain("APP_ENV=staging");
    expect(contract).toContain("REPOSITORY_RUNTIME=in_memory");
    expect(contract).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(contract).toContain("LINE_REAL_PUSH_ENABLED=false");
    expect(contract).toContain("AI_PROVIDER=mock");
    expect(contract).toContain("Do not paste real values");
  });
});

function createCopyBasedFixture(releaseCommit: string): void {
  mkdirSync(join(fixtureRoot, "docs/11_codex_tasks"), { recursive: true });
  mkdirSync(join(fixtureRoot, "docs/14_dev_logs"), { recursive: true });
  writeFileSync(join(fixtureRoot, "AGENTS.md"), "# Fixture AGENTS\n", "utf8");
  writeFileSync(join(fixtureRoot, "package.json"), "{\"name\":\"copy-based-fixture\"}\n", "utf8");
  writeFileSync(join(fixtureRoot, "README.md"), "# Fixture README\n", "utf8");
  writeFileSync(
    join(fixtureRoot, "docs/11_codex_tasks/121_copy_based_fixture.md"),
    "# Loop 121 fixture\n",
    "utf8"
  );
  writeFileSync(join(fixtureRoot, "docs/14_dev_logs/2026-06-26.md"), "# Fixture log\n", "utf8");
  writeFileSync(
    join(fixtureRoot, "release-manifest.txt"),
    `release_candidate_commit=${releaseCommit}\narchive_env_policy=.env* excluded\n`,
    "utf8"
  );
}

function collectFixtureContext(root: string): FixtureContext {
  const helperUrl = pathToFileURL(join(repoRoot, "scripts/dev-loop/lib/repo-context.mjs")).href;
  const script = `
    import { collectRepoContext } from ${JSON.stringify(helperUrl)};
    const context = collectRepoContext({ repoRoot: ${JSON.stringify(root)} });
    console.log(JSON.stringify({
      sourceIdentity: context.sourceIdentity,
      gitStatusBranch: context.gitStatusBranch,
      gitLogOneline: context.gitLogOneline
    }));
  `;

  return JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
      cwd: repoRoot,
      encoding: "utf8"
    })
  ) as FixtureContext;
}

function readText(filePath: string): string {
  return readFileSync(join(repoRoot, filePath), "utf8");
}
