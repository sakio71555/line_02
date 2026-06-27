import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/146_line_real_receive_event_smoke.md",
  runbook: "docs/15_runbooks/line_real_receive_event_smoke.md",
  remediationRunbook: "docs/15_runbooks/line_webhook_secret_path_single_segment_remediation.md",
  runtimeRunbook: "docs/15_runbooks/line_runtime_secret_injection_and_webhook_verification.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 146 LINE real receive event smoke docs", () => {
  it("adds the Loop 146 task doc and receive smoke runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records real receive success without recording message body or LINE user id", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    for (const expected of [
      "line_real_receive_event_smoke=success",
      "linebot_webhook_post_status=200",
      "signature_verification_result=success",
      "event_type_received=message",
      "message_type_received=text",
      "customer_saved=true",
      "message_saved=true",
      "message_body_recorded=no",
      "line_user_id_recorded=no"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records tenant-scoped in-memory persistence and health checks", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.readiness, paths.devLog]);

    for (const expected of [
      "current_runtime_storage_mode=in_memory",
      "expected_message_persistence=in_memory_api_process",
      "admin_customers_status=200",
      "admin_customers_count=1",
      "admin_customers_tenant_scoped=true",
      "admin_timeline_status=200",
      "admin_timeline_message_count=1",
      "admin_timeline_tenant_scoped=true",
      "api_direct_health_after_event=200",
      "https_api_health_after_event=200"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps app-side LINE push/reply and production go blocked", () => {
    const combined = readCombined(Object.values(paths));

    expect(combined).toContain("LINE_REAL_PUSH_ENABLED=false configured; value not displayed");
    expect(combined).toContain("line_real_push_reply=not_performed");
    expect(combined).toContain("line_messaging_api_send=not_performed");
    expect(combined).toContain("official_account_auto_response_observed=true");
    expect(combined).toContain("official_account_auto_response_action=turn_off_later");
    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).toContain("Loop 149: LINE real reply/push controlled gate");
  });

  it("does not record obvious secret assignments, concrete webhook URLs, LINE user ids, message bodies, or production go state", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
      new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET")),
      new RegExp(envAssignment("OPENAI_API_KEY")),
      new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
      new RegExp(envAssignment("SUPABASE_DB_URL")),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("postgresql" + "://", "i"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("priv" + "key\\.pem"),
      new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("U[a-f0-9]{32}", "i"),
      new RegExp("受信" + "テスト"),
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
