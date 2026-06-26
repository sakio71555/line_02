import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const collectScript = "scripts/dev-loop/collect-context.mjs";
const handoffScript = "scripts/dev-loop/generate-codex-handoff.mjs";
const runbookPath = "docs/15_runbooks/gpt_codex_handoff_automation.md";
const taskDocPath =
  "docs/11_codex_tasks/072_gpt_codex_handoff_automation_scaffold.md";

describe("GPT-Codex handoff automation scaffold", () => {
  it("keeps the expected scripts and docs in place", () => {
    for (const file of [collectScript, handoffScript, runbookPath, taskDocPath]) {
      expect(existsSync(join(repoRoot, file)), file).toBe(true);
    }
  });

  it("links the runbook from README and documents safe handoff scope", () => {
    const readme = readText("README.md");
    const runbook = readText(runbookPath);
    const devLoop = readText("docs/08_dev_loop.md");

    expect(readme).toContain("docs/15_runbooks/gpt_codex_handoff_automation.md");
    expect(runbook).toContain("Codexを自動実行しない");
    expect(runbook).toContain("OpenAI APIを呼ばない");
    expect(runbook).toContain("Supabase/LINE/OpenAIへ接続しない");
    expect(runbook).toContain("commit/pushを自動実行しない");
    expect(runbook).toContain("人間がpromptを確認してからCodexへ貼る");
    expect(devLoop).toContain("repo context収集");
    expect(devLoop).toContain("人間ゲート");
  });

  it("collects repo context to project tmp by default", () => {
    const output = execFileSync("node", [collectScript], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    const contextPath = join(repoRoot, "tmp/dev-loop/context.md");
    const context = readFileSync(contextPath, "utf8");

    expect(output).toContain(contextPath);
    expect(context).toContain("# GPT-Codex Handoff Context");
    expect(context).toContain(repoRoot);
    expect(context).toContain("Latest loop number detected");
    expect(context).toContain("Push warning");
  });

  it("generates a safe handoff draft with required push and docs-only constraints", () => {
    const outFile = "tmp/dev-loop/test-next-codex-prompt.md";
    const output = execFileSync(
      "node",
      [
        handoffScript,
        "--loop",
        "073",
        "--title",
        "Sample safe handoff",
        "--mode",
        "docs-only",
        "--push",
        "forbidden",
        "--out",
        outFile
      ],
      { cwd: repoRoot, encoding: "utf8" }
    );
    const promptPath = join(repoRoot, outFile);
    const prompt = readFileSync(promptPath, "utf8");

    expect(output).toContain(promptPath);
    expect(prompt).toContain(repoRoot);
    expect(prompt).toContain("Loop 073: Sample safe handoff");
    expect(prompt).toContain("git push は絶対に実行しない");
    expect(prompt).toContain("runtime/API/UI/DB変更禁止");
    expect(prompt).toContain("Scope");
    expect(prompt).toContain("Out of Scope");
    expect(prompt).toContain("完了報告項目");
  });

  it("prints usage instead of generating a prompt when required args are missing", () => {
    const result = spawnSync("node", [handoffScript], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("generate-codex-handoff.mjs");
  });

  it("does not read env or contain direct dangerous automation command strings", () => {
    const source = [
      readText(collectScript),
      readText(handoffScript),
      readText("scripts/dev-loop/lib/repo-context.mjs"),
      readText("scripts/dev-loop/lib/safe-write.mjs")
    ].join("\n");

    expect(source).not.toContain("process.env");
    expect(source).not.toContain("codex exec");
    expect(source.toLowerCase()).not.toContain("openai");
    expect(source).not.toContain("supabase link");
    expect(source).not.toContain("git push");
    expect(source).not.toContain("git reset");
    expect(source).not.toContain("git stash");
    expect(source).not.toContain("pnpm install");
    expect(source).not.toContain("pnpm add");
  });

  it("keeps generated output under project tmp and ignores it from git", () => {
    const gitignore = readText(".gitignore");
    const collectSource = readText(collectScript);
    const handoffSource = readText(handoffScript);

    expect(gitignore).toContain("tmp/");
    expect(collectSource).toContain("tmp/dev-loop/context.md");
    expect(handoffSource).toContain("tmp/dev-loop/next-codex-prompt.md");
    expect(readText("scripts/dev-loop/lib/safe-write.mjs")).toContain(
      "refusing to write outside project"
    );
  });
});

function readText(file: string): string {
  return readFileSync(join(repoRoot, file), "utf8");
}
