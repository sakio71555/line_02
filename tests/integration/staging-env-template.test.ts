import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const envTemplatePath = join(repoRoot, ".env.staging.example");
const archiveSafeEnvContractPath = "deploy/vps/taiyolabel/env/staging-env-contract.example";

describe("Loop 074 staging env template", () => {
  it("keeps a staging env contract in place", () => {
    expect(hasStagingEnvContract()).toBe(true);
  });

  it("contains Supabase staging env names", () => {
    const template = readStagingEnvContract();

    expect(template).toContain("SUPABASE_URL=");
    expect(template).toContain("SUPABASE_ANON_KEY=");
    expect(template).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(template).toContain("SUPABASE_DB_URL=");
    expect(template).toContain("server-side only");
    expect(template).toContain("Never expose it to browser, LIFF, or Next.js client components.");
  });

  it("contains LINE staging placeholders with real push disabled", () => {
    const template = readStagingEnvContract();

    expect(template).toContain("LINE_CHANNEL_SECRET=");
    expect(template).toContain("LINE_CHANNEL_ACCESS_TOKEN=");
    expect(template).toContain("LINE_MESSAGING_ENABLED=false");
    expect(template).toContain("LINE_REAL_PUSH_ENABLED=false");
    expect(template).toContain("Use a staging/test channel only.");
  });

  it("contains OpenAI placeholders with mock provider default", () => {
    const template = readStagingEnvContract();

    expect(template).toContain("OPENAI_API_KEY=");
    expect(template).toContain("OPENAI_MODEL=");
    expect(template).toContain("AI_PROVIDER=mock");
    expect(template).toContain("Do not call OpenAI until a later Loop explicitly enables it.");
  });

  it("contains runtime safety defaults", () => {
    const template = readStagingEnvContract();

    expect(template).toContain("APP_ENV=staging");
    expect(template).toContain("REPOSITORY_RUNTIME=in_memory");
  });

  it("does not include real-key-like values", () => {
    const values = readEnvValues(stagingEnvContractPath());
    const suspiciousPatterns = [
      /sk-[A-Za-z0-9_-]{10,}/,
      /eyJ[A-Za-z0-9_-]{20,}/,
      /postgresql:\/\//i,
      /supabase\.co/i,
      /https?:\/\//i,
      /[A-Za-z0-9_-]{48,}/
    ];

    for (const value of values) {
      for (const pattern of suspiciousPatterns) {
        expect(value).not.toMatch(pattern);
      }
    }
  });

  it("ignores real staging env files while allowing the template", () => {
    const gitignore = readText(".gitignore");

    expect(gitignore).toContain(".env.staging");
    expect(gitignore).toContain("!.env.staging.example");
  });

  it("keeps an archive-safe env contract outside dot-env filenames", () => {
    expect(existsSync(join(repoRoot, archiveSafeEnvContractPath))).toBe(true);
    expect(archiveSafeEnvContractPath).not.toMatch(/(^|\/)\.env/);
  });

  it("links README to the staging env setup runbook", () => {
    const readme = readText("README.md");

    expect(readme).toContain("docs/15_runbooks/staging_env_template_setup.md");
  });

  it("warns operators not to write real keys to docs or Codex", () => {
    const runbook = readText("docs/15_runbooks/staging_env_template_setup.md");

    expect(runbook).toContain("実keyをdocs/README/dev log/Codexに書かない");
  });
});

function readText(filePath: string): string {
  return readFileSync(join(repoRoot, filePath), "utf8");
}

function hasStagingEnvContract(): boolean {
  return existsSync(envTemplatePath) || existsSync(join(repoRoot, archiveSafeEnvContractPath));
}

function stagingEnvContractPath(): string {
  return existsSync(envTemplatePath) ? ".env.staging.example" : archiveSafeEnvContractPath;
}

function readStagingEnvContract(): string {
  return readText(stagingEnvContractPath());
}

function readEnvValues(filePath: string): string[] {
  return readText(filePath)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => line.split("=").slice(1).join("=").trim())
    .filter((value) => value.length > 0);
}
