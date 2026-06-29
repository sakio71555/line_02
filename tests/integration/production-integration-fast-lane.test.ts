import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/147_150_production_integration_fast_lane.md",
  runbook: "docs/15_runbooks/production_integration_fast_lane.md",
  supabaseChecklist: "docs/15_runbooks/supabase_staging_secret_injection_checklist.md",
  openaiGate: "docs/15_runbooks/openai_provider_production_gate.md",
  lineGate: "docs/15_runbooks/line_real_reply_push_controlled_gate.md",
  finalReview: "docs/15_runbooks/final_production_go_nogo_review.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  receiveSmoke: "docs/15_runbooks/line_real_receive_event_smoke.md",
  devLog: "docs/14_dev_logs/2026-06-27.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md"
};

describe("Loop 147-150 production integration fast lane docs", () => {
  it("adds the fast lane task doc and focused runbooks", () => {
    for (const path of [
      paths.taskDoc,
      paths.runbook,
      paths.supabaseChecklist,
      paths.openaiGate,
      paths.lineGate,
      paths.finalReview
    ]) {
      expect(existsSync(resolve(path))).toBe(true);
    }
  });

  it("records implementation classifications without performing external smokes", () => {
    const combined = readCombined([
      paths.taskDoc,
      paths.runbook,
      paths.supabaseChecklist,
      paths.openaiGate,
      paths.lineGate,
      paths.finalReview,
      paths.devLog
    ]);

    for (const expected of [
      "supabase_implementation_classification=B_repositories_exist_runtime_startup_wiring_incomplete",
      "openai_implementation_classification=B_provider_gate_exists_real_runtime_transport_incomplete",
      "line_real_client_runtime_wiring_incomplete=true",
      "supabase_connected=no",
      "openai_real_api_smoke=not_performed",
      "line_real_push_reply=not_performed",
      "storage_mode=in_memory",
      "ai_provider=mock",
      "line_real_push_enabled=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps production readiness as no-go and points to a remediation loop", () => {
    const combined = readCombined(Object.values(paths));

    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).toContain("Loop 151: production runtime wiring remediation plan");
    expect(combined).toContain("supabase_ready=false");
    expect(combined).toContain("openai_ready=false");
    expect(combined).toContain("line_reply_push_ready=false");
  });

  it("records the LINE Official Account auto-response checklist", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.lineGate, paths.receiveSmoke]);

    expect(combined).toContain("official_account_auto_response_observed=true");
    expect(combined).toContain("official_account_auto_response_off_confirmed=false");
    expect(combined).toContain("Webhook: ON");
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
      new RegExp(envAssignment("SUPABASE_URL")),
      new RegExp(envAssignment("SUPABASE_ANON_KEY")),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("postgresql" + "://", "i"),
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
