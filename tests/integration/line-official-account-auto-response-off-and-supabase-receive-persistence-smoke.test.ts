import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc:
    "docs/11_codex_tasks/156_line_official_account_auto_response_off_and_supabase_receive_persistence_smoke.md",
  runbook:
    "docs/15_runbooks/line_official_account_auto_response_off_and_supabase_receive_persistence_smoke.md",
  receiveSmoke: "docs/15_runbooks/line_real_receive_event_smoke.md",
  lineGate: "docs/15_runbooks/line_real_reply_push_controlled_gate.md",
  supabaseRunbook: "docs/15_runbooks/supabase_endpoint_value_verification.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 156 LINE auto-response OFF and Supabase receive persistence smoke docs", () => {
  it("adds the Loop 156 task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records Official Account response settings without secrets", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "webhook_usage=on",
      "official_account_response_message=off",
      "official_account_ai_response_message=not_available_in_manager_screen",
      "official_account_auto_response_ready=true",
      "line_test_sent_by_operator=true",
      "line_test_auto_reply_observed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records real receive and Supabase persistence through API restart", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "signature_verification_result=success_inferred_from_webhook_200_and_saved_message",
      "event_type_received=message",
      "message_type_received=text",
      "api_direct_health_after_event=200",
      "https_api_health_after_event=200",
      "customers_no_header_after_event=401",
      "customers_safe_header_after_event=200",
      "supabase_messages_after_event_status=200",
      "supabase_messages_after_event_tenant_scoped=true",
      "api_restart_performed=yes",
      "api_direct_health_after_restart=200",
      "https_api_health_after_restart=200",
      "customers_no_header_after_restart=401",
      "customers_safe_header_after_restart=200",
      "supabase_messages_after_restart_status=200",
      "supabase_messages_after_restart_tenant_scoped=true",
      "supabase_receive_persistence_ready=true"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps LINE reply/push and production go blocked", () => {
    const combined = readCombined(Object.values(paths));

    expect(combined).toContain("line_real_push_enabled=false");
    expect(combined).toContain("line_real_push_reply=not_performed");
    expect(combined).toContain("line_invalid_signature_loop156=401");
    expect(combined).toContain("openai_ready=false");
    expect(combined).toContain("line_reply_push_ready=false");
    expect(combined).toContain("production_readiness=production_no_go");
  });

  it("does not record secret values, concrete endpoints, webhook paths, LINE user ids, or message bodies", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
      new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET")),
      new RegExp(envAssignment("OPENAI_API_KEY")),
      new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
      new RegExp(envAssignment("SUPABASE_DB_URL")),
      new RegExp("SUPABASE_URL" + "=https?://[^<]"),
      new RegExp(envAssignment("SUPABASE_ANON_KEY")),
      new RegExp("https://" + "[a-z0-9-]+\\.supabase\\.co", "i"),
      new RegExp("postgres(?:ql)?" + "://", "i"),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("priv" + "key\\.pem"),
      new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("U[a-f0-9]{32}", "i"),
      new RegExp("受信" + "テスト"),
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
