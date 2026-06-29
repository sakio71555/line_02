import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/164_openai_model_fallback_controlled_smoke.md",
  runbook: "docs/15_runbooks/openai_model_fallback_controlled_smoke.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  failureRunbook: "docs/15_runbooks/openai_smoke_failure_diagnosis_without_secrets.md",
  retryRunbook: "docs/15_runbooks/openai_runtime_env_input_and_controlled_smoke_retry.md",
  controlledSmoke: "docs/15_runbooks/openai_real_api_controlled_smoke.md",
  runtimeSecret: "docs/15_runbooks/openai_runtime_secret_injection_and_controlled_smoke.md",
  providerGate: "docs/15_runbooks/openai_provider_production_gate.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  finalHandoff: "docs/15_runbooks/final_operator_handoff_checklist.md"
};

describe("Loop 164 OpenAI model fallback controlled smoke docs", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records exactly one sanitized model fallback smoke and final mock rollback", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "openai_model_fallback_smoke=performed_once",
      "openai_model_fallback_smoke_status=failed",
      "openai_model_fallback_error_class=OpenAiProviderError",
      "openai_model_fallback_error_status=unavailable",
      "openai_model_fallback_error_code=unavailable",
      "openai_model_fallback_error_type=unavailable",
      "openai_model_fallback_error_classification=I_unknown_sanitized",
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

  it("records health and safety checks after rollback", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "api_direct_health_after_rollback=200",
      "https_api_health_after_rollback=200",
      "api_direct_health_loop164_final=200",
      "https_api_health_loop164_final=200",
      "admin_customers_no_header_loop164=401",
      "line_invalid_signature_loop164=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records only the allowed configured wording for OpenAI env values", () => {
    const combined = readCombined(Object.values(paths));

    expect(combined).toContain("OPENAI_API_KEY configured; value not recorded");
    expect(combined).toContain("OPENAI_MODEL configured; value not recorded");
    expect(combined).not.toContain("OPENAI" + "_MODEL=");
    expect(combined).not.toContain("OPENAI" + "_API_KEY=");
  });

  it("does not record secrets, model values, prompts, response bodies, webhook paths, or production promotion", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp(envAssignment("OPENAI" + "_API_KEY")),
      new RegExp(envAssignment("OPENAI" + "_MODEL")),
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
