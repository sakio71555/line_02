import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/172_line_send_failure_diagnosis_without_retry.md",
  runbook: "docs/15_runbooks/line_send_failure_diagnosis_without_retry.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  humanApprovedRunbook: "docs/15_runbooks/line_real_reply_push_human_approved_single_message_smoke.md",
  controlledRunbook: "docs/15_runbooks/line_real_reply_push_single_message_controlled_smoke.md",
  gateRunbook: "docs/15_runbooks/line_real_reply_push_controlled_gate.md",
  planRunbook: "docs/15_runbooks/line_real_reply_push_controlled_smoke_planning.md",
  smokePlanRunbook: "docs/15_runbooks/line_real_reply_push_single_message_smoke_plan.md",
  preflightScript: "scripts/smoke/line-real-push-target-preflight.ts"
};

describe("Loop 172 LINE send failure diagnosis without retry", () => {
  it("adds the Loop 172 task doc, runbook, and internal dry-run preflight script", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
    expect(existsSync(resolve(paths.preflightScript))).toBe(true);
  });

  it("records the authenticated staff route diagnosis and no-send result", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "line_real_reply_push_performed=false",
      "line_send_attempted_once=false",
      "line_send_result=not_performed",
      "reason=authenticated_staff_route_unavailable",
      "authenticated_staff_route_available=false",
      "authenticated_staff_route_unavailable_reason=admin_auth_runtime_unavailable_for_authenticated_staff_route",
      "existing_staff_reply_route=POST /api/admin/customers/:customerId/reply",
      "route_auth_requirements_summary=Authorization + selected tenant + authenticated staff + send_staff_reply permission",
      "selected_tenant_header_required=x-selected-tenant-id",
      "send_staff_reply_permission_required=true"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records that route auth must not be relaxed and no public smoke route is added", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "do_not_relax_auth=true",
      "do_not_add_public_test_route=true",
      "do_not_allow_production_dev_header=true",
      "do_not_allow_fake_bearer_in_production=true",
      "dev_header_real_send_allowed=false",
      "fake_bearer_production_allowed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records internal CLI dry-run path, execution gates, and one-send lock requirement", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "recommended_next_execution_path=internal_cli_smoke_command",
      "internal_cli_smoke_path=scripts/smoke/line-real-push-target-preflight.ts",
      "internal_cli_default_mode=dry_run",
      "internal_cli_smoke_path_ready=true",
      "internal_cli_execute_mode_implemented=false",
      "LINE_REAL_PUSH_ENABLED_required=true",
      "explicit_one_message_approval_required=true",
      "no_retry_no_bulk_no_broadcast_ack_required=true",
      "one_send_lock_required=true"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records secret-safe dry-run output and final disabled readiness state", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "line_push_smoke_mode=dry_run",
      "target_user_id_recorded=false",
      "target_message_body_recorded=false",
      "outgoing_message_body_recorded=false",
      "would_send=false",
      "LINE_REAL_PUSH_ENABLED=false",
      "AI_PROVIDER=mock",
      "openai_real_api_rerun=false",
      "OpenAI systemd drop-in absent",
      "line_reply_push_ready=false",
      "line_reply_push_internal_smoke_ready=true",
      "production_readiness=production_no_go"
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
      new RegExp("production_readiness=production_go")
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
