import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/163_openai_smoke_failure_diagnosis_without_secrets.md",
  runbook: "docs/15_runbooks/openai_smoke_failure_diagnosis_without_secrets.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  controlledSmoke: "docs/15_runbooks/openai_real_api_controlled_smoke.md",
  providerGate: "docs/15_runbooks/openai_provider_production_gate.md",
  runtimeSecret: "docs/15_runbooks/openai_runtime_secret_injection_and_controlled_smoke.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  finalHandoff: "docs/15_runbooks/final_operator_handoff_checklist.md"
};

describe("Loop 163 OpenAI smoke failure diagnosis without secrets", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records sanitized diagnostics, the key replacement follow-up, and final rollback", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "openai_diagnostic_smoke=performed_once",
      "openai_diagnostic_smoke_status=failed",
      "openai_diagnostic_error_class=OpenAiProviderError",
      "openai_diagnostic_error_status=unavailable",
      "openai_diagnostic_error_code=unavailable",
      "openai_diagnostic_error_type=unavailable",
      "openai_diagnostic_error_classification=I_unknown_sanitized",
      "openai_key_replacement_smoke=performed_once",
      "openai_key_replacement_smoke_status=failed",
      "openai_key_replacement_error_classification=I_unknown_sanitized",
      "openai_response_body_recorded=no",
      "openai_prompt_body_recorded=no",
      "openai_api_key_recorded=no",
      "openai_model_value_recorded=no",
      "openai_systemd_dropin_present_final=false",
      "ai_provider_final=mock",
      "line_real_push_enabled=false",
      "openai_ready=false",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records final health and safety checks", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "api_direct_health_after_rollback=200",
      "https_api_health_after_rollback=200",
      "https_customers_page=200",
      "admin_customers_no_header=401",
      "line_invalid_signature=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secrets, concrete endpoints, webhook paths, LINE user ids, prompts, or response bodies", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp(envAssignment("OPENAI" + "_API_KEY")),
      new RegExp("OPENAI" + "_MODEL=([^<\\n]|<redacted>).+"),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("sk" + "-[A-Za-z0-9]"),
      new RegExp("response_body=.*[A-Za-z0-9]{16,}", "i"),
      new RegExp("prompt_body=.*[A-Za-z0-9]{16,}", "i"),
      new RegExp(envAssignment("LINE" + "_CHANNEL_ACCESS_TOKEN")),
      new RegExp(envAssignment("LINE" + "_CHANNEL_SECRET")),
      new RegExp(envAssignment("LINE" + "_WEBHOOK_SECRET_PATH")),
      new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("U[a-f0-9]{32}", "i"),
      new RegExp("line-test" + "-sent-no-auto-reply"),
      new RegExp(envAssignment("SUPABASE" + "_SERVICE_ROLE_KEY")),
      new RegExp(envAssignment("SUPABASE" + "_DB_URL")),
      new RegExp("SUPABASE" + "_URL=https?://[^<]"),
      new RegExp("https://" + "[a-z0-9-]+\\.supabase\\.co", "i"),
      new RegExp("postgres(?:ql)?" + "://", "i"),
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
