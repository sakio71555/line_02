import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/171_line_real_reply_push_human_approved_single_message_smoke.md",
  runbook: "docs/15_runbooks/line_real_reply_push_human_approved_single_message_smoke.md",
  singleMessageRunbook: "docs/15_runbooks/line_real_reply_push_single_message_controlled_smoke.md",
  lineGate: "docs/15_runbooks/line_real_reply_push_controlled_gate.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md"
};

describe("Loop 171 LINE real reply/push human-approved single-message smoke", () => {
  it("adds the Loop 171 task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records that the human approval gate was satisfied", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    for (const expected of [
      "LINE_OFFICIAL_ACCOUNT_WEBHOOK_ON_CONFIRMED=YES",
      "LINE_OFFICIAL_ACCOUNT_AUTO_RESPONSE_OFF_CONFIRMED=YES",
      "LINE_OFFICIAL_ACCOUNT_AI_RESPONSE_OFF_CONFIRMED=YES",
      "OPERATOR_FRESH_TEST_LINE_MESSAGE_SENT=YES",
      "LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED=YES",
      "NO_RETRY_NO_BULK_NO_BROADCAST_ACK=YES",
      "human_approval_gate_satisfied=true",
      "human_gate_not_satisfied=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records unique sanitized target selection without identifiers or message bodies", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    for (const expected of [
      "fresh_test_target_selected=true",
      "target_user_selected=true",
      "target_user_id_recorded=false",
      "target_message_body_recorded=false",
      "distinct_target_count=1",
      "outgoing_message_body=fixed non-personal smoke text; value not recorded",
      "outgoing_message_body_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records authenticated staff route failure and no send", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "preferred_smoke_mode=push",
      "execution_path=existing_staff_reply_route",
      "existing_staff_reply_route=POST /api/admin/customers/:customerId/reply",
      "authenticated_staff_route_status=401",
      "authenticated_staff_route_ready=false",
      "line_real_send_precondition_failed=true",
      "line_real_send_precondition_failure_reason=authenticated_staff_route_unavailable",
      "LINE_REAL_PUSH_ENABLED_temporarily_enabled=false",
      "line_real_reply_push_performed=false",
      "send_attempted_once=false",
      "line_send_result=not_performed",
      "reason=authenticated_staff_route_unavailable"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records one-message constraints and final rollback state", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
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
      "duplicate_send_detected=false",
      "send_attempt_lock_present=false",
      "rollback_to_LINE_REAL_PUSH_ENABLED_false=true",
      "final_LINE_REAL_PUSH_ENABLED=false",
      "line_reply_push_ready=false",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records sanitized safety evidence", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "api_direct_health_loop171=200",
      "https_api_health_loop171=200",
      "customers_no_header_loop171=401",
      "line_invalid_signature_loop171=401",
      "REPOSITORY_RUNTIME=supabase",
      "AI_PROVIDER=mock",
      "OPENAI_REAL_API_ENABLED=false",
      "OpenAI systemd drop-in absent",
      "LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded",
      "LINE_CHANNEL_SECRET configured; value not recorded",
      "LINE_WEBHOOK_SECRET_PATH configured; value not recorded",
      "LINE_REAL_PUSH_ENABLED=false",
      "openai_real_api_rerun=false",
      "nginx_dns_certbot_change_performed=false",
      "nginx_reload_restart_performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secrets, concrete webhook paths, identifiers, bodies, or production promotion", () => {
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
      new RegExp("priv" + "key\\.pem")
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
