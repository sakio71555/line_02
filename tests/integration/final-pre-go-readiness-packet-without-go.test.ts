import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/174_final_pre_go_readiness_packet_without_go.md",
  runbook: "docs/15_runbooks/final_pre_go_readiness_packet_without_go.md",
  readme: "README.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md"
};

describe("Loop 174 final pre-Go readiness packet without Go", () => {
  it("adds the Loop 174 task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records final readiness signals while keeping operator Go false", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "https_ready_for_review=true",
      "line_receive_ready=true",
      "official_account_auto_response_ready=true",
      "supabase_ready=true",
      "supabase_receive_persistence_ready=true",
      "openai_provider_controlled_smoke_ready=true",
      "line_reply_push_ready=true",
      "final_operator_go=false",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the remaining No-Go reason and rollback posture", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "remaining_no_go_reason=final_operator_production_go_not_recorded",
      "line_send_result=success",
      "retry_performed=false",
      "rollback_to_LINE_REAL_PUSH_ENABLED_false=true",
      "final_LINE_REAL_PUSH_ENABLED=false",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in absent"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record production promotion or secret-shaped values", () => {
    const combined = readCombined(Object.values(paths));

    for (const pattern of forbiddenPatterns()) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(repoRoot, relativePath);
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readFileSync(resolve(relativePath), "utf8")).join("\n");
}

function forbiddenPatterns(): RegExp[] {
  return [
    new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
    new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
    new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
    new RegExp(envAssignment("LINE_WEBHOOK_SECRET")),
    new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
    new RegExp("/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
    new RegExp('userId["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp('replyToken["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp(envAssignment("OPENAI_API_KEY")),
    new RegExp(envAssignment("OPENAI_MODEL")),
    new RegExp("sk-" + "[A-Za-z0-9]"),
    new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
    new RegExp("SUPABASE_URL=https?" + "://[^<\\s]+"),
    new RegExp(envAssignment("SUPABASE_ANON_KEY")),
    new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
    new RegExp(envAssignment("SUPABASE_DB_URL")),
    new RegExp("postgresql" + "://", "i"),
    new RegExp("postgres" + "://", "i"),
    new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
    new RegExp("priv" + "key\\.pem"),
    new RegExp("final_operator_go=true"),
  ];
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
