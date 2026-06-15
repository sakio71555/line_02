import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/amami_home_internal_review_checklist.md"
);
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/061_amami_home_internal_review_edition_readiness.md"
);
const readmePath = join(repoRoot, "README.md");

describe("Amami Home internal review edition docs", () => {
  const runbook = readFileSync(runbookPath, "utf8");
  const taskDoc = readFileSync(taskDocPath, "utf8");
  const readme = readFileSync(readmePath, "utf8");

  it("keeps the internal review runbook reachable from README", () => {
    expect(readme).toContain("Amami Home internal review edition readiness");
    expect(readme).toContain(
      "docs/15_runbooks/amami_home_internal_review_checklist.md"
    );
    expect(readme).toContain(
      "docs/11_codex_tasks/061_amami_home_internal_review_edition_readiness.md"
    );
  });

  it("documents the review order and demo seed prerequisites", () => {
    expect(runbook).toContain("Review Order");
    expect(runbook).toContain("Adminトップ");
    expect(runbook).toContain("相談内容をまとめる");
    expect(runbook).toContain("返信文の下書きを作る");
    expect(runbook).toContain("ホームページ情報から回答案を作る");
    expect(runbook).toContain("未返信チェック");
    expect(runbook).toContain("デモ通知");
    expect(runbook).toContain("POST http://localhost:4000/api/dev/seed-demo-data");
    expect(runbook).toContain("x-tenant-id: tenant_amamihome");
  });

  it("clearly separates what works from what is not connected yet", () => {
    expect(runbook).toContain("What Works / What Does Not Work Yet");
    expect(runbook).toContain("MockAiProvider");
    expect(runbook).toContain("MockLineClient");
    expect(runbook).toContain("MockStaffNotifier");
    expect(runbook).toContain("本物LINE送信");
    expect(runbook).toContain("本物OpenAI API");
    expect(runbook).toContain("Supabase本番DB保存");
    expect(runbook).toContain("本番ログイン");
    expect(runbook).toContain("一時保存");
  });

  it("includes feedback fields and production readiness items", () => {
    expect(runbook).toContain("Feedback Questions");
    expect(runbook).toContain("AI要約は役に立ちそうか");
    expect(runbook).toContain("未返信アラートは必要そうか");
    expect(runbook).toContain("Review Result Notes");
    expect(runbook).toContain("Bug / Issue Log");
    expect(runbook).toContain("Production Readiness Items");
  });

  it("records the loop scope and avoids claiming production connectivity", () => {
    expect(taskDoc).toContain("Internal Review Edition Definition");
    expect(taskDoc).toContain("What Works Now");
    expect(taskDoc).toContain("What Does Not Work Yet");
    expect(taskDoc).toContain("本番運用版ではない");
    expect(taskDoc).toContain("本物LINE送信");
    expect(taskDoc).toContain("OpenAI API実接続");
    expect(taskDoc).toContain("Supabase本番接続");
  });
});
