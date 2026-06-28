import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/178_production_activation_line_only.md",
  runbook: "docs/15_runbooks/production_activation_line_only.md",
  devLog: "docs/14_dev_logs/2026-06-28.md"
};

describe("Loop 178 production activation line only docs", () => {
  it("adds the Loop 178 task doc and runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records approved line-only activation and production Go in the dedicated docs", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "FINAL_OPERATOR_PRODUCTION_GO_APPROVED=YES",
      "ALLOW_RUNTIME_ACTIVATION_CHANGES=YES",
      "ACTIVATION_MODE=line_only",
      "ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=YES",
      "ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO",
      "runtime_activation_changes=performed",
      "line_real_push_final_enable=performed",
      "activation_result=success",
      "rollback_performed=false",
      "production_readiness=production_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records final runtime state while keeping OpenAI and infra changes out of scope", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in=absent",
      "Nginx/DNS/certbot changes=none",
      "Supabase schema/RLS changes=none",
      "additional_line_send_performed=false",
      "openai_real_api_performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records health and safety checks", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "api_direct_health_loop178_pre=200",
      "https_api_health_loop178_pre=200",
      "https_admin_root_loop178_pre=200",
      "https_admin_customers_loop178_pre=200",
      "https_admin_api_no_header_customers_loop178_pre=401",
      "https_line_invalid_signature_loop178_pre=401",
      "api_direct_health_loop178_line_activated=200",
      "https_api_health_loop178_line_activated=200",
      "api_direct_health_loop178_final=200",
      "https_api_health_loop178_final=200",
      "https_admin_root_loop178_final=200",
      "https_admin_customers_loop178_final=200",
      "https_admin_api_no_header_customers_loop178_final=401",
      "https_line_invalid_signature_loop178_final=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secrets, webhook paths, identifiers, bodies, or external provider values", () => {
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
