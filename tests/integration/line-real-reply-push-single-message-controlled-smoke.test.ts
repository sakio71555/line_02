import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/170_line_real_reply_push_single_message_controlled_smoke.md",
  runbook: "docs/15_runbooks/line_real_reply_push_single_message_controlled_smoke.md",
  planningRunbook: "docs/15_runbooks/line_real_reply_push_controlled_smoke_planning.md",
  lineGate: "docs/15_runbooks/line_real_reply_push_controlled_gate.md",
  singleMessagePlan: "docs/15_runbooks/line_real_reply_push_single_message_smoke_plan.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md"
};

describe("Loop 170 LINE real reply/push single-message controlled smoke", () => {
  it("adds the task doc and controlled smoke runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records that the human approval gate was not satisfied and no send happened", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "LINE_OFFICIAL_ACCOUNT_WEBHOOK_ON_CONFIRMED=NO",
      "LINE_OFFICIAL_ACCOUNT_AUTO_RESPONSE_OFF_CONFIRMED=NO",
      "LINE_OFFICIAL_ACCOUNT_AI_RESPONSE_OFF_CONFIRMED=NO",
      "OPERATOR_FRESH_TEST_LINE_MESSAGE_SENT=NO",
      "LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED=NO",
      "NO_RETRY_NO_BULK_NO_BROADCAST_ACK=NO",
      "human_approval_gate_satisfied=false",
      "human_gate_not_satisfied=true",
      "line_real_reply_push_performed=false",
      "send_attempted_once=false",
      "line_send_result=not_performed",
      "reason=human_gate_not_satisfied"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the existing route, one-message-only constraints, and rollback state", () => {
    const combined = readCombined([
      paths.taskDoc,
      paths.runbook,
      paths.lineGate,
      paths.singleMessagePlan,
      paths.handoff
    ]);

    for (const expected of [
      "preferred_smoke_mode=push",
      "execution_path=existing_staff_reply_route",
      "existing_staff_reply_route=POST /api/admin/customers/:customerId/reply",
      "one_message_only=true",
      "retry_allowed=false",
      "bulk_send_allowed=false",
      "multicast_allowed=false",
      "broadcast_allowed=false",
      "group_send_allowed=false",
      "room_send_allowed=false",
      "retry_performed=false",
      "bulk_send_performed=false",
      "multicast_performed=false",
      "broadcast_performed=false",
      "group_send_performed=false",
      "room_send_performed=false",
      "LINE_REAL_PUSH_ENABLED_temporarily_enabled=false",
      "rollback_to_LINE_REAL_PUSH_ENABLED_false=true",
      "final_LINE_REAL_PUSH_ENABLED=false",
      "duplicate_send_detected=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records sanitized safety evidence and keeps readiness No-Go", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "api_direct_health_loop170=200",
      "https_api_health_loop170=200",
      "customers_no_header_loop170=401",
      "line_invalid_signature_loop170=401",
      "REPOSITORY_RUNTIME=supabase",
      "supabase_ready=true",
      "supabase_receive_persistence_ready=true",
      "AI_PROVIDER=mock",
      "OPENAI_REAL_API_ENABLED=false",
      "OpenAI systemd drop-in absent",
      "LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded",
      "LINE_CHANNEL_SECRET configured; value not recorded",
      "LINE_WEBHOOK_SECRET_PATH configured; value not recorded",
      "LINE_REAL_PUSH_ENABLED=false",
      "openai_real_api_rerun=false",
      "nginx_dns_certbot_change_performed=false",
      "nginx_reload_restart_performed=false",
      "line_reply_push_ready=false",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records that target, message body, and outgoing body were not captured", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "target_user_selected=false",
      "target_user_id_recorded=false",
      "target_message_body_recorded=false",
      "outgoing_message_body=fixed non-personal smoke text; value not recorded",
      "outgoing_message_body_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
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
