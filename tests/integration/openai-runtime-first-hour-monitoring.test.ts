import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/183_openai_runtime_first_hour_monitoring.md",
  runbook: "docs/15_runbooks/openai_runtime_first_hour_monitoring.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  monitoringSchedule: "docs/15_runbooks/production_monitoring_schedule.md",
  activationRunbook: "docs/15_runbooks/openai_runtime_activation_with_explicit_approval.md",
  activationPlan: "docs/15_runbooks/openai_runtime_activation_planning_after_production_go.md"
};

describe("Loop 183 OpenAI runtime first-hour monitoring docs", () => {
  it("adds the Loop 183 task doc and monitoring runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records the healthy monitoring result without runtime changes", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "monitoring_status=healthy",
      "rollback_recommended=false",
      "critical_errors_detected=false",
      "openai_runtime_errors_detected=false",
      "line_send_errors_detected=false",
      "webhook_errors_detected=false",
      "supabase_errors_detected=false",
      "runtime_changes_performed=false",
      "OpenAI real API smoke=not performed",
      "additional_line_send_performed=false",
      "nginx_dns_certbot_changes=none",
      "supabase_schema_rls_changes=none",
      "production_readiness=production_go",
      "activation_mode=line_and_openai_runtime"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the OpenAI runtime state as still enabled", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present",
      "OPENAI_API_KEY configured; value not recorded",
      "OPENAI_MODEL configured; value not recorded"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records both monitoring health rounds and invalid-signature rejection", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook, paths.devLog]);

    for (const expected of [
      "api_direct_health_loop183_r1=200",
      "https_api_health_loop183_r1=200",
      "https_admin_root_loop183_r1=200",
      "https_admin_customers_loop183_r1=200",
      "https_admin_api_no_header_customers_loop183_r1=401",
      "https_line_invalid_signature_loop183_r1=401",
      "api_direct_health_loop183_r2=200",
      "https_api_health_loop183_r2=200",
      "https_admin_root_loop183_r2=200",
      "https_admin_customers_loop183_r2=200",
      "https_admin_api_no_header_customers_loop183_r2=401",
      "https_line_invalid_signature_loop183_r2=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records sanitized journal, Nginx, and resource summaries", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "journal_sanitized_interesting_count=9",
      "journal_sanitized_openai_related_count=0",
      "journal_sanitized_openai_error_like_count=0",
      "journal_sanitized_line_error_like_count=0",
      "journal_sanitized_supabase_error_like_count=0",
      "journal_raw_lines_recorded=false",
      "secrets_recorded=false",
      "nginx_access_status_counts=200:726,301:46,302:3,304:5,400:13,404:137,405:7",
      "nginx_error_recent_count=0",
      "nginx_raw_lines_recorded=false",
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
