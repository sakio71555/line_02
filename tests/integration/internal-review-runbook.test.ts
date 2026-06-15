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
const triageGuidePath = join(
  repoRoot,
  "docs/15_runbooks/internal_review_feedback_triage.md"
);
const feedbackLogPath = join(
  repoRoot,
  "docs/15_runbooks/internal_review_feedback_log.md"
);
const triageTaskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/061_1_internal_review_feedback_triage.md"
);
const finalVerificationPath = join(
  repoRoot,
  "docs/15_runbooks/amami_home_internal_review_final_verification.md"
);
const finalReadinessTaskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/062_amami_home_internal_review_final_readiness_hardening.md"
);

describe("Amami Home internal review edition docs", () => {
  const runbook = readFileSync(runbookPath, "utf8");
  const taskDoc = readFileSync(taskDocPath, "utf8");
  const readme = readFileSync(readmePath, "utf8");
  const triageGuide = readFileSync(triageGuidePath, "utf8");
  const feedbackLog = readFileSync(feedbackLogPath, "utf8");
  const triageTaskDoc = readFileSync(triageTaskDocPath, "utf8");
  const finalVerification = readFileSync(finalVerificationPath, "utf8");
  const finalReadinessTaskDoc = readFileSync(finalReadinessTaskDocPath, "utf8");

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
    expect(runbook).toContain("Feedback Recording");
    expect(runbook).toContain("internal_review_feedback_log.md");
    expect(runbook).toContain("internal_review_feedback_triage.md");
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

  it("keeps feedback triage docs reachable and structured", () => {
    expect(readme).toContain("internal_review_feedback_triage.md");
    expect(readme).toContain("internal_review_feedback_log.md");
    expect(readme).toContain("061_1_internal_review_feedback_triage.md");
    expect(triageTaskDoc).toContain("Loop 061.1");
    expect(triageTaskDoc).toContain("Feedback To Codex Loop");
    expect(triageGuide).toContain("Categories");
    expect(triageGuide).toContain("Priority");
    expect(triageGuide).toContain("Severity");
    expect(triageGuide).toContain("Effort");
    expect(triageGuide).toContain("社内確認版で対応");
    expect(triageGuide).toContain("本番化で対応");
    expect(triageGuide).toContain("将来SaaSで対応");
  });

  it("keeps feedback logging safe and free of real-data prompts", () => {
    expect(feedbackLog).toContain("Feedback Items");
    expect(feedbackLog).toContain("受付日");
    expect(feedbackLog).toContain("画面/機能");
    expect(feedbackLog).toContain("次Loop候補");
    expect(feedbackLog).toContain("実顧客名を書かない");
    expect(feedbackLog).toContain("LINE userIdを書かない");
    expect(feedbackLog).toContain("APIキー");
    expect(feedbackLog).toContain("本番ログ");
    expect(triageGuide).toContain("以下は記入例です。実フィードバックではありません。");
  });

  it("keeps final verification reachable and clear about non-production scope", () => {
    expect(readme).toContain("amami_home_internal_review_final_verification.md");
    expect(readme).toContain("062_amami_home_internal_review_final_readiness_hardening.md");
    expect(runbook).toContain("amami_home_internal_review_final_verification.md");
    expect(finalReadinessTaskDoc).toContain("Loop 062");
    expect(finalReadinessTaskDoc).toContain("Internal Review 100% Criteria");
    expect(finalVerification).toContain("Browser Verification");
    expect(finalVerification).toContain("RAG Source Verification");
    expect(finalVerification).toContain("本物LINEには送信されない");
    expect(finalVerification).toContain("OpenAI APIには接続していない");
    expect(finalVerification).toContain("demo seed");
    expect(finalVerification).toContain("internal_review_feedback_log.md");
    expect(finalVerification).toContain("アマミホーム社内確認版として確認可能");
    expect(finalVerification).toContain("本番運用版ではない");
  });
});
