import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/162_openai_runtime_env_input_and_controlled_smoke_retry.md",
  runbook: "docs/15_runbooks/openai_runtime_env_input_and_controlled_smoke_retry.md",
  smokeScript: "scripts/smoke/openai-provider-smoke.ts",
  smokeScriptTest: "tests/integration/openai-provider-smoke-script.test.ts",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  controlledSmoke: "docs/15_runbooks/openai_real_api_controlled_smoke.md",
  providerGate: "docs/15_runbooks/openai_provider_production_gate.md",
  runtimeSecret: "docs/15_runbooks/openai_runtime_secret_injection_and_controlled_smoke.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  finalHandoff: "docs/15_runbooks/final_operator_handoff_checklist.md"
};

describe("Loop 162 OpenAI runtime env input and controlled smoke retry docs", () => {
  it("adds the task doc, runbook, smoke script, and tests", () => {
    for (const path of [paths.taskDoc, paths.runbook, paths.smokeScript, paths.smokeScriptTest]) {
      expect(existsSync(resolve(path))).toBe(true);
    }
  });

  it("records one sanitized OpenAI smoke attempt and the final rollback state", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "openai_smoke_command_added=true",
      "openai_runtime_env_exists=true",
      "openai_real_api_smoke=performed_once",
      "openai_real_api_smoke_status=failed",
      "openai_smoke_error_class=OpenAiProviderError",
      "openai_response_body_recorded=no",
      "openai_api_key_recorded=no",
      "openai_prompt_recorded=no",
      "openai_model_value_recorded=no",
      "openai_systemd_dropin_present_final=false",
      "api_direct_health_after_openai_rollback=200",
      "https_api_health_after_openai_rollback=200",
      "openai_ready=false",
      "production_readiness=production_no_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records that final runtime returned to mock and real LINE push stayed disabled", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "ai_provider_final=mock",
      "line_real_push_enabled=false",
      "line_real_push_reply=not_performed",
      "admin_customers_no_header=401",
      "line_unknown_webhook=404"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secrets, concrete endpoints, webhook paths, LINE user ids, message bodies, prompts, or response bodies", () => {
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
      new RegExp("line-test-sent-no-auto-reply"),
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
