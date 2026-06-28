import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/182_openai_runtime_activation_with_explicit_approval.md",
  runbook: "docs/15_runbooks/openai_runtime_activation_with_explicit_approval.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  closeout: "docs/15_runbooks/production_stabilization_and_operator_handoff_closeout.md"
};

describe("Loop 182 OpenAI runtime activation with explicit approval", () => {
  it("adds the Loop 182 task doc and activation runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records explicit approval tokens and activation result", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "OPENAI_RUNTIME_ACTIVATION_APPROVED=YES",
      "ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES",
      "ALLOW_OPENAI_REAL_API_SMOKE=NO",
      "ALLOW_LINE_RUNTIME_CHANGE=NO",
      "ALLOW_ADDITIONAL_LINE_SEND=NO",
      "ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO",
      "ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO",
      "OpenAI runtime activation performed",
      "activation_result=activated",
      "rollback_performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the final OpenAI runtime state without changing LINE or Supabase boundaries", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "production_readiness=production_go",
      "activation_mode=line_and_openai_runtime",
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present",
      "OpenAI real API smoke=not performed",
      "additional_line_send_performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records health and safety evidence", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "api_direct_health_loop182_openai_activated=200",
      "https_api_health_loop182_openai_activated=200",
      "api_direct_health_loop182_final=200",
      "https_api_health_loop182_final=200",
      "https_admin_root_loop182_final=200",
      "https_admin_customers_loop182_final=200",
      "https_admin_api_no_header_customers_loop182_final=401",
      "https_line_invalid_signature_loop182_final=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records rollback and monitoring checklists", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "Rollback Plan",
      "Rollback Procedure",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in=absent",
      "Monitoring Checklist",
      "OpenAI usage and cost",
      "Provider latency",
      "AI output is not automatically sent to LINE",
      "Loop 183: OpenAI runtime first-hour monitoring"
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
