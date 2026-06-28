import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/167_openai_provider_json_output_contract_remediation.md"
);
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/openai_provider_json_output_contract_remediation.md"
);
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-28.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const gatePath = join(repoRoot, "docs/15_runbooks/openai_provider_production_gate.md");
const smokeDiagnosisPath = join(
  repoRoot,
  "docs/15_runbooks/openai_smoke_failure_diagnosis_without_secrets.md"
);
const runtimeEnvPath = join(
  repoRoot,
  "docs/15_runbooks/openai_runtime_env_input_and_controlled_smoke_retry.md"
);
const realApiSmokePath = join(repoRoot, "docs/15_runbooks/openai_real_api_controlled_smoke.md");

describe("Loop 167 OpenAI JSON output contract remediation docs", () => {
  it("records the Loop 167 task doc and runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("records the JSON parse success and schema validation failure without production promotion", () => {
    const combined = readCombinedDocs();

    expect(combined).toContain("provider_boundary_smoke=performed_once");
    expect(combined).toContain("raw_diagnostic_rerun=no");
    expect(combined).toContain("provider_output_text_extracted=true");
    expect(combined).toContain("json_contract_parse_success=true");
    expect(combined).toContain("json_contract_schema_valid=false");
    expect(combined).toContain("parse_stage=schema_validation");
    expect(combined).toContain("classification=G_response_parse_bug");
    expect(combined).toContain("response_body_recorded=no");
    expect(combined).toContain("prompt_body_recorded=no");
    expect(combined).toContain("api_key_recorded=no");
    expect(combined).toContain("model_value_recorded=no");
    expect(combined).toContain("ai_provider_final=mock");
    expect(combined).toContain("line_real_push_enabled=false");
    expect(combined).toContain("openai_ready=false");
    expect(combined).toContain("production_readiness=production_no_go");
  });

  it("keeps the remaining blocker focused on schema validation", () => {
    const combined = readCombinedDocs();

    expect(combined).toContain("method-specific schema validation");
    expect(combined).toContain("schema validation still fails");
    expect(combined).toContain("OpenAI provider production gate remains closed");
  });

  it("does not record secret-shaped values or webhook paths", () => {
    const combined = readCombinedDocs();
    const forbiddenPatterns = [
      new RegExp("OPENAI" + "_API_KEY=.+"),
      new RegExp("OPENAI" + "_MODEL=.+"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("SUPABASE_(URL|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=.+"),
      new RegExp("postgresql" + "://", "i"),
      new RegExp("postgres" + "://", "i"),
      new RegExp("LINE_(CHANNEL_SECRET|CHANNEL_ACCESS_TOKEN|WEBHOOK_SECRET_PATH)=.+"),
      new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
      new RegExp("userId[\"': ]+" + "[A-Za-z0-9._-]+"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY")
    ];

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function readCombinedDocs(): string {
  return [
    taskDocPath,
    runbookPath,
    devLogPath,
    readinessPath,
    gatePath,
    smokeDiagnosisPath,
    runtimeEnvPath,
    realApiSmokePath
  ]
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n");
}
