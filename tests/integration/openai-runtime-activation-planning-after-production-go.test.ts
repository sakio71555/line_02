import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/181_openai_runtime_activation_planning_after_production_go.md",
  runbook: "docs/15_runbooks/openai_runtime_activation_planning_after_production_go.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  closeout: "docs/15_runbooks/production_stabilization_and_operator_handoff_closeout.md"
};

describe("Loop 181 OpenAI runtime activation planning after production Go", () => {
  it("adds the Loop 181 task doc and planning runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records planning-only status and current line-only production state", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "production_readiness=production_go",
      "activation_mode=line_only",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in=absent",
      "OpenAI runtime activation not performed",
      "openai_real_api_performed=false",
      "line_send_performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records approval tokens as NO", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    for (const expected of [
      "OPENAI_RUNTIME_ACTIVATION_APPROVED=NO",
      "ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO",
      "ALLOW_OPENAI_REAL_API_SMOKE=NO",
      "ALLOW_LINE_RUNTIME_CHANGE=NO",
      "ALLOW_ADDITIONAL_LINE_SEND=NO",
      "ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO",
      "ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records read-only VPS checks and redacted OpenAI runtime env status", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    for (const expected of [
      "api_direct_health_loop181_planning=200",
      "https_api_health_loop181_planning=200",
      "https_admin_root_loop181_planning=200",
      "https_admin_customers_loop181_planning=200",
      "https_admin_api_no_header_customers_loop181_planning=401",
      "https_line_invalid_signature_loop181_planning=401",
      "openai-runtime.env=exists",
      "OPENAI_API_KEY configured; value not recorded",
      "OPENAI_MODEL configured; value not recorded"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records future activation, rollback, monitoring, and Loop 182 candidate", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "Future Activation Steps",
      "Rollback Plan",
      "Monitoring Checklist",
      "Risk Matrix",
      "Loop 182: OpenAI runtime activation with explicit approval",
      "ACTIVATION_MODE=openai_runtime_only"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secrets, webhook paths, identifiers, bodies, or provider values", () => {
    const combined = readCombined(Object.values(paths));

    for (const pattern of forbiddenPatterns()) {
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

function forbiddenPatterns(): RegExp[] {
  return [
    new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
    new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
    new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
    new RegExp(envAssignment("LINE_WEBHOOK_SECRET")),
    new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
    new RegExp("/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
    new RegExp('userId["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp('replyToken["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp(envAssignment("OPENAI_API_KEY")),
    new RegExp(envAssignment("OPENAI_MODEL")),
    new RegExp("sk-" + "[A-Za-z0-9]"),
    new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
    new RegExp("SUPABASE_URL=https?" + "://[^<\\s]+"),
    new RegExp(envAssignment("SUPABASE_ANON_KEY")),
    new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
    new RegExp(envAssignment("SUPABASE_DB_URL")),
    new RegExp("https://" + "[a-z0-9-]+\\.supabase\\.co", "i"),
    new RegExp("postgresql" + "://", "i"),
    new RegExp("postgres" + "://", "i"),
    new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
    new RegExp("priv" + "key\\.pem"),
    new RegExp("line-test" + "-sent-no-auto-reply")
  ];
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
