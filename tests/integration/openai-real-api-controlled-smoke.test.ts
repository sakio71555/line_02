import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/161_openai_real_api_controlled_smoke.md",
  runbook: "docs/15_runbooks/openai_real_api_controlled_smoke.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  openAiGate: "docs/15_runbooks/openai_provider_production_gate.md",
  openAiRuntime: "docs/15_runbooks/openai_runtime_secret_injection_and_controlled_smoke.md",
  finalHandoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  lineReplyGate: "docs/15_runbooks/openai_line_reply_gate_and_final_gonogo_packet.md"
};

describe("Loop 161 OpenAI real API controlled smoke docs", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records that OpenAI real API smoke was not performed", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "openai_provider_classification=B_real_provider_wired_but_no_safe_external_smoke_route",
      "provider_boundary_exists=true",
      "real_http_transport_wired=true",
      "runtime_ai_provider_switch=implemented",
      "api_default_provider=mock",
      "startup_openai_call=false",
      "openai_helper_status=exists",
      "openai_runtime_env=absent",
      "openai_format_check=skipped_absent",
      "openai_environment_file_connection=skipped_absent",
      "openai_real_api_smoke=not_performed",
      "openai_real_api_smoke_reason=openai_runtime_env_absent_pending_human_input",
      "openai_response_body_recorded=no",
      "openai_api_key_recorded=no",
      "openai_ready=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records final safety checks and keeps production no-go", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "api_direct_health_loop161_final=200",
      "https_api_health_loop161_final=200",
      "customers_no_header_loop161=401",
      "line_invalid_signature_loop161=401",
      "final_ai_provider_mock=true",
      "final_line_real_push_enabled_false=true",
      "final_repository_runtime_supabase=true",
      "line_real_push_reply=not_performed",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secrets, concrete endpoints, webhook paths, LINE user ids, or message bodies", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp(envAssignment("OPENAI" + "_API_KEY")),
      new RegExp(envAssignment("LINE" + "_CHANNEL_ACCESS_TOKEN")),
      new RegExp(envAssignment("LINE" + "_CHANNEL_SECRET")),
      new RegExp(envAssignment("LINE" + "_WEBHOOK_SECRET_PATH")),
      new RegExp(envAssignment("LINE" + "_WEBHOOK_SECRET")),
      new RegExp(envAssignment("SUPABASE" + "_SERVICE_ROLE_KEY")),
      new RegExp(envAssignment("SUPABASE" + "_DB_URL")),
      new RegExp("SUPABASE" + "_URL=https?://[^<]"),
      new RegExp(envAssignment("SUPABASE" + "_ANON_KEY")),
      new RegExp("https://" + "[a-z0-9-]+\\.supabase\\.co", "i"),
      new RegExp("postgres(?:ql)?" + "://", "i"),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("sk" + "-[A-Za-z0-9]"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("priv" + "key\\.pem"),
      new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("U[a-f0-9]{32}", "i"),
      new RegExp("line-test-sent-no-auto-reply"),
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
