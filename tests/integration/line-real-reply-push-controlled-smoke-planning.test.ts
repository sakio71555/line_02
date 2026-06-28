import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/169_line_real_reply_push_controlled_smoke_planning.md",
  runbook: "docs/15_runbooks/line_real_reply_push_controlled_smoke_planning.md",
  lineGate: "docs/15_runbooks/line_real_reply_push_controlled_gate.md",
  singleMessagePlan: "docs/15_runbooks/line_real_reply_push_single_message_smoke_plan.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md"
};

describe("Loop 169 LINE real reply/push controlled smoke planning", () => {
  it("adds the task doc and planning runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records planning-only status and keeps real sending disabled", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "outbound_implementation_classification=A_real_line_push_client_fully_wired_but_disabled_by_flag",
      "preferred_smoke_mode=push",
      "recommended_target_selection=operator_sends_fresh_test_message_before_smoke",
      "recommended_execution_path=existing_staff_reply_route",
      "LINE_REAL_PUSH_ENABLED=false",
      "line_real_reply_push_performed=false",
      "line_reply_push_ready=false",
      "line_reply_push_plan_ready=true",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in absent",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records one-message gate, retry prohibition, rollback, and helper status", () => {
    const combined = readCombined([
      paths.taskDoc,
      paths.runbook,
      paths.lineGate,
      paths.singleMessagePlan,
      paths.handoff
    ]);

    for (const expected of [
      "line_real_push_enable_helper=/root/bin/amami-line-set-line-real-push-flag.sh",
      "line_real_push_disable_helper=/root/bin/amami-line-disable-line-real-push.sh",
      "line_real_push_enable_helper_status=exists",
      "line_real_push_disable_helper_status=exists",
      "one_message_only=true",
      "retry_allowed=false",
      "bulk_send_allowed=false",
      "multicast_allowed=false",
      "broadcast_allowed=false",
      "group_send_allowed=false",
      "room_send_allowed=false",
      "target_user_id_recorded=false",
      "outgoing_message_body_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps the next step focused on the single-message smoke human gate", () => {
    const combined = readCombined([
      paths.taskDoc,
      paths.runbook,
      paths.singleMessagePlan,
      paths.handoff,
      paths.devLog
    ]);

    expect(combined).toContain("Loop 170: LINE real reply/push single-message controlled smoke");
    expect(combined).toContain("Webhook ON");
    expect(combined).toContain("Response message OFF");
    expect(combined).toContain("AI response message OFF");
    expect(combined).toContain("one fresh test LINE message");
    expect(combined).toContain("one real LINE reply/push smoke");
    expect(combined).toContain("no retry");
    expect(combined).toContain("no bulk");
    expect(combined).toContain("no broadcast");
  });

  it("does not record secrets, concrete webhook paths, user ids, reply tokens, message bodies, or production go", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
      new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET")),
      new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp('userId["\\\':]+\\s*[A-Za-z0-9._-]+'),
      new RegExp('replyToken["\\\':]+\\s*[A-Za-z0-9._-]+'),
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
      new RegExp("production" + "_go")
    ];

    for (const pattern of forbiddenPatterns) {
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

function envAssignment(name: string): string {
  return `${name}=.+`;
}
