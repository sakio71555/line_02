import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/168_openai_provider_schema_specific_prompt_tightening.md"
);
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/openai_provider_schema_specific_prompt_tightening.md"
);
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-28.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const handoffPath = join(repoRoot, "docs/15_runbooks/final_operator_handoff_checklist.md");
const jsonContractRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/openai_provider_json_output_contract_remediation.md"
);
const outputContractRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/openai_provider_output_contract_remediation.md"
);
const requestShapeRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/openai_request_shape_provider_transport_remediation.md"
);

describe("Loop 168 OpenAI schema-specific prompt tightening docs", () => {
  it("records the Loop 168 task doc and runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("records the exact draft reply schema fields and successful provider smoke", () => {
    const combined = readCombinedDocs();

    for (const field of [
      "draft_body",
      "next_questions",
      "risk_flags",
      "recommended_response_mode",
      "should_handoff"
    ]) {
      expect(combined).toContain(field);
    }

    expect(combined).toContain("raw_diagnostic_rerun=no");
    expect(combined).toContain("provider_boundary_smoke=performed_once");
    expect(combined).toContain("provider_boundary_smoke_status=success");
    expect(combined).toContain("provider_output_text_extracted=true");
    expect(combined).toContain("json_contract_parse_success=true");
    expect(combined).toContain("json_contract_schema_valid=true");
    expect(combined).toContain("parse_stage=none");
    expect(combined).toContain("schema_missing_fields=none");
    expect(combined).toContain("schema_invalid_fields=none");
    expect(combined).toContain("classification=success");
  });

  it("records rollback and production No-Go boundaries", () => {
    const combined = readCombinedDocs();

    expect(combined).toContain("response_body_recorded=false");
    expect(combined).toContain("prompt_body_recorded=false");
    expect(combined).toContain("api_key_recorded=false");
    expect(combined).toContain("model_value_recorded=false");
    expect(combined).toContain("openai_systemd_dropin_present_final=false");
    expect(combined).toContain("ai_provider_final=mock");
    expect(combined).toContain("line_real_push_enabled=false");
    expect(combined).toContain("api_direct_health_final=200");
    expect(combined).toContain("https_api_health_final=200");
    expect(combined).toContain("customers_no_header_final=401");
    expect(combined).toContain("line_invalid_signature_final=401");
    expect(combined).toContain("openai_ready=true");
    expect(combined).toContain("line_reply_push_ready=false");
    expect(combined).toContain("production_readiness=production_no_go");
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
    handoffPath,
    jsonContractRunbookPath,
    outputContractRunbookPath,
    requestShapeRunbookPath
  ]
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n");
}
