import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const requiredFiles = [
  "AGENTS.md",
  "skills/loop-engineering/SKILL.md",
  "skills/amami-crm-domain/SKILL.md",
  "skills/supabase-runtime-boundary/SKILL.md",
  "skills/obsidian-dev-log/SKILL.md",
  "hooks/README.md",
  "subagents/code-reviewer.md",
  "subagents/test-runner.md",
  "subagents/domain-architect.md",
  "plugins/README.md",
  "docs/15_runbooks/codex_development_kit.md",
  "docs/11_codex_tasks/069_codex_development_kit_scaffold.md"
] as const;

describe("Codex Development Kit scaffold docs", () => {
  it("keeps the expected Markdown scaffold files in place", () => {
    for (const file of requiredFiles) {
      expect(existsSync(join(repoRoot, file)), file).toBe(true);
    }
  });

  it("keeps AGENTS guardrails explicit", () => {
    const agents = readText("AGENTS.md");

    expect(agents).toContain("/Users/sakio/Desktop/PROJECT/amami-line-crm");
    expect(agents).toContain("`/tmp` は使わない");
    expect(agents).toContain("default runtimeはin-memory");
    expect(agents).toContain("Supabase接続");
    expect(agents).toContain("LINE API、OpenAI API、Supabase本番");
    expect(agents).toContain("git push は明示指示があるLoop以外では禁止");
  });

  it("documents skills as Markdown-only knowledge layers", () => {
    expect(readText("skills/loop-engineering/SKILL.md")).toContain("Plan");
    expect(readText("skills/loop-engineering/SKILL.md")).toContain("Do not push");
    expect(readText("skills/amami-crm-domain/SKILL.md")).toContain("Amami Home");
    expect(readText("skills/amami-crm-domain/SKILL.md")).toContain("multi-tenant");
    expect(readText("skills/supabase-runtime-boundary/SKILL.md")).toContain("default runtime");
    expect(readText("skills/supabase-runtime-boundary/SKILL.md")).toContain("fake client");
    expect(readText("skills/obsidian-dev-log/SKILL.md")).toContain("docs/14_dev_logs");
    expect(readText("skills/obsidian-dev-log/SKILL.md")).toContain("Do not create `.obsidian/`");
  });

  it("keeps hooks and plugins inactive", () => {
    const hooksReadme = readText("hooks/README.md");
    const pluginsReadme = readText("plugins/README.md");

    expect(hooksReadme).toContain("Not enabled");
    expect(hooksReadme).toContain("No executable shell scripts exist yet");
    expect(pluginsReadme).toContain("Not distributed");
    expect(pluginsReadme).toContain("No manifest");
    expect(pluginsReadme).toContain("No install script");
    expect(readdirSync(join(repoRoot, "hooks"))).toEqual(["README.md"]);
    expect(existsSync(join(repoRoot, ".codex"))).toBe(false);
  });

  it("documents subagent roles without execution wiring", () => {
    expect(readText("subagents/code-reviewer.md")).toContain("Diff safety");
    expect(readText("subagents/code-reviewer.md")).toContain("Do not push");
    expect(readText("subagents/test-runner.md")).toContain("git diff --check");
    expect(readText("subagents/test-runner.md")).toContain("Do not hide failures");
    expect(readText("subagents/domain-architect.md")).toContain("multi-tenant");
    expect(readText("subagents/domain-architect.md")).toContain("Do not connect real external services");
  });

  it("links the runbook from README and records runtime non-changes", () => {
    const readme = readText("README.md");
    const runbook = readText("docs/15_runbooks/codex_development_kit.md");
    const taskDoc = readText("docs/11_codex_tasks/069_codex_development_kit_scaffold.md");

    expect(readme).toContain("docs/15_runbooks/codex_development_kit.md");
    expect(runbook).toContain("Five Layer Mapping");
    expect(runbook).toContain("product runtimeを変更しない");
    expect(runbook).toContain("`.codex/` を作らない");
    expect(taskDoc).toContain("Loop 069: Codex Development Kit Scaffold");
    expect(taskDoc).toContain("runtime変更なし");
    expect(taskDoc).toContain("このLoopでは `git push` しない");
  });
});

function readText(file: string): string {
  return readFileSync(join(repoRoot, file), "utf8");
}
