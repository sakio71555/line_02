import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/173_line_real_push_internal_cli_one_message_controlled_smoke.md",
  runbook: "docs/15_runbooks/line_real_push_internal_cli_one_message_controlled_smoke.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  lineFailureRunbook: "docs/15_runbooks/line_send_failure_diagnosis_without_retry.md",
  humanApprovedRunbook: "docs/15_runbooks/line_real_reply_push_human_approved_single_message_smoke.md",
  controlledRunbook: "docs/15_runbooks/line_real_reply_push_single_message_controlled_smoke.md",
  controlledGate: "docs/15_runbooks/line_real_reply_push_controlled_gate.md",
  controlledPlanning: "docs/15_runbooks/line_real_reply_push_controlled_smoke_planning.md",
  singleMessagePlan: "docs/15_runbooks/line_real_reply_push_single_message_smoke_plan.md",
  cliScript: "scripts/smoke/line-real-push-single-message-smoke.ts",
  cliTest: "tests/integration/line-real-push-single-message-smoke-cli.test.ts"
};

describe("Loop 173 LINE internal CLI one-message controlled smoke docs", () => {
  it("adds the Loop 173 task doc, runbook, CLI, and CLI test", () => {
    for (const filePath of [paths.taskDoc, paths.runbook, paths.cliScript, paths.cliTest]) {
      expect(existsSync(resolve(filePath))).toBe(true);
    }
  });

  it("records the internal CLI execution path, one-send lock, and successful one-message result", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "internal_cli_script=scripts/smoke/line-real-push-single-message-smoke.ts",
      "internal_cli_default_mode=dry_run",
      "internal_cli_execute_mode_implemented=true",
      "execution_path=internal_cli_smoke_command",
      "target_user_selected=true",
      "LINE_REAL_PUSH_ENABLED_temporarily_enabled=true",
      "line_send_attempted_once=true",
      "line_send_result=success",
      "retry_performed=false",
      "bulk_multicast_broadcast_group_room=false",
      "send_attempt_lock_present=true",
      "send_attempt_count=1",
      "duplicate_send_detected=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records only sanitized target and message fields", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "target_user_id_recorded=false",
      "target_message_body_recorded=false",
      "outgoing_message_body=fixed non-personal smoke text; value not recorded",
      "outgoing_message_body_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records immediate rollback, health checks, and final No-Go state", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "rollback_to_LINE_REAL_PUSH_ENABLED_false=true",
      "final_LINE_REAL_PUSH_ENABLED=false",
      "api_direct_health_loop173_final=200",
      "https_api_health_loop173_final=200",
      "customers_no_header_loop173=401",
      "line_invalid_signature_loop173=401",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in absent",
      "line_reply_push_ready=true",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secrets, concrete webhook paths, identifiers, message bodies, or production promotion", () => {
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
