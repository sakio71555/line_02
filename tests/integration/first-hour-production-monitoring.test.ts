import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/179_first_hour_production_monitoring.md",
  runbook: "docs/15_runbooks/first_hour_production_monitoring.md",
  devLog: "docs/14_dev_logs/2026-06-28.md"
};

describe("Loop 179 first-hour production monitoring docs", () => {
  it("adds the Loop 179 task doc and monitoring runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records the healthy first-hour monitoring result", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "monitoring_status=healthy",
      "rollback_recommended=false",
      "runtime_changes_performed=false",
      "line_send_performed=false",
      "openai_real_api_performed=false",
      "nginx_dns_certbot_changes=none",
      "supabase_schema_rls_changes=none",
      "production_readiness=production_go",
      "activation_mode=line_only"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the line-only runtime state", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in=absent"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records both monitoring health rounds and invalid-signature rejection", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    for (const expected of [
      "api_direct_health_loop179_r1=200",
      "https_api_health_loop179_r1=200",
      "https_admin_root_loop179_r1=200",
      "https_admin_customers_loop179_r1=200",
      "https_admin_api_no_header_customers_loop179_r1=401",
      "https_line_invalid_signature_loop179_r1=401",
      "api_direct_health_loop179_r2=200",
      "https_api_health_loop179_r2=200",
      "https_admin_root_loop179_r2=200",
      "https_admin_customers_loop179_r2=200",
      "https_admin_api_no_header_customers_loop179_r2=401",
      "https_line_invalid_signature_loop179_r2=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records sanitized log and resource summaries", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "critical_errors_detected=false",
      "line_send_errors_detected=false",
      "webhook_errors_detected=false",
      "supabase_errors_detected=false",
      "journal_raw_lines_printed=false",
      "secrets_recorded=false",
      "nginx_error_recent_count=0",
      "nginx_error_recent_nonempty=false",
      "resource_status=healthy"
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
