import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/166_openai_provider_output_contract_remediation.md"
);
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/openai_provider_output_contract_remediation.md"
);
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-28.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");

describe("Loop 166 OpenAI provider output contract remediation docs", () => {
  it("records the Loop 166 task doc and runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("records parser fixture coverage and provider smoke result", () => {
    const combined = readCombinedDocs();

    expect(combined).toContain("parser_function=extractOpenAiResponseText");
    expect(combined).toContain("provider_output_text_extracted=true");
    expect(combined).toContain("provider_boundary_error_classification=G_response_parse_bug");
    expect(combined).toContain("raw_diagnostic_rerun=no");
    expect(combined).toContain("provider_boundary_retry_performed=no");
    expect(combined).toContain("response_body_recorded=no");
    expect(combined).toContain("prompt_body_recorded=no");
    expect(combined).toContain("api_key_recorded=no");
    expect(combined).toContain("model_value_recorded=no");
    expect(combined).toContain("openai_systemd_dropin_present_final=false");
    expect(combined).toContain("ai_provider_final=mock");
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
  return [taskDocPath, runbookPath, devLogPath, readinessPath]
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n");
}
