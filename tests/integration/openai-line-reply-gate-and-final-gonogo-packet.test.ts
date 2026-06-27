import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/157_160_openai_line_reply_gate_and_final_gonogo_packet.md",
  packetRunbook: "docs/15_runbooks/openai_line_reply_gate_and_final_gonogo_packet.md",
  openAiRuntimeRunbook: "docs/15_runbooks/openai_runtime_secret_injection_and_controlled_smoke.md",
  lineSmokeRunbook: "docs/15_runbooks/line_real_reply_push_single_message_smoke_plan.md",
  handoffChecklist: "docs/15_runbooks/final_operator_handoff_checklist.md",
  openAiGate: "docs/15_runbooks/openai_provider_production_gate.md",
  lineGate: "docs/15_runbooks/line_real_reply_push_controlled_gate.md",
  finalReview: "docs/15_runbooks/final_production_go_nogo_review.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 157-160 OpenAI and LINE reply gate packet docs", () => {
  it("adds the task doc and focused runbooks", () => {
    for (const path of [
      paths.taskDoc,
      paths.packetRunbook,
      paths.openAiRuntimeRunbook,
      paths.lineSmokeRunbook,
      paths.handoffChecklist
    ]) {
      expect(existsSync(resolve(path))).toBe(true);
    }
  });

  it("records OpenAI runtime readiness without running a real API smoke", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "openai_implementation_classification=A_real_provider_fully_wired_but_not_smoke_tested",
      "provider_boundary_exists=true",
      "real_http_transport_wired=true",
      "runtime_ai_provider_switch=implemented",
      "api_default_provider=mock",
      "openai_runtime_env=absent",
      "openai_runtime_helper=/root/bin/amami-line-set-openai-runtime-secrets.sh",
      "openai_real_api_smoke=not_performed",
      "openai_real_api_smoke_reason=pending_human_input_or_missing_approval",
      "openai_ready=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records LINE reply push readiness while keeping real push disabled", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "line_reply_push_classification=A_real_line_client_fully_wired_but_disabled_by_flag",
      "real_line_client_boundary_exists=true",
      "line_client_runtime_switch=implemented",
      "line_real_push_enabled=false",
      "line_real_push_enable_helper=/root/bin/amami-line-set-line-real-push-flag.sh",
      "line_real_push_disable_helper=/root/bin/amami-line-disable-line-real-push.sh",
      "line_real_push_reply=not_performed",
      "line_real_push_reply_reason=pending_human_input_or_missing_approval",
      "line_reply_push_ready=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records Supabase stability and safety smokes", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "repository_runtime_is_supabase=true",
      "api_direct_health_loop157_start=200",
      "https_api_health_loop157_start=200",
      "customers_no_header_loop157=401",
      "customers_with_tenant_loop157=200",
      "customers_with_tenant_loop157_count=5",
      "customers_with_tenant_loop157_tenant_scoped=true",
      "line_invalid_signature_loop157=401",
      "supabase_ready=true"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps final production readiness as no-go with handoff items", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "production_readiness=production_no_go",
      "go_promotion=no",
      "supabase_write_smoke=not_performed",
      "final_operator_go=not_performed",
      "openai_api_key=pending_human_input",
      "openai_model=pending_human_input",
      "line_real_reply_push_approval=pending_human_input",
      "Loop 161: OpenAI real API controlled smoke"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secret values, concrete endpoints, webhook paths, LINE user ids, message bodies, or promotion state", () => {
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
      new RegExp("line-test-sent-no-auto-reply"),
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
