import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/184_production_stabilization_closeout_with_openai_runtime.md",
  runbook: "docs/15_runbooks/production_stabilization_closeout_with_openai_runtime.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md",
  rollbackCard: "docs/15_runbooks/production_quick_rollback_card.md",
  monitoringSchedule: "docs/15_runbooks/production_monitoring_schedule.md",
  backlog: "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md"
};

describe("Loop 184 production stabilization closeout with OpenAI runtime", () => {
  it("adds the Loop 184 task doc and closeout runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records the final production Go state with OpenAI runtime enabled", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "closeout_status=complete",
      "production_readiness=production_go",
      "activation_mode=line_and_openai_runtime",
      "monitoring_status=healthy",
      "rollback_recommended=false",
      "handoff_complete=true",
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records closeout health and safety checks", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "api_direct_health_loop184_closeout=200",
      "https_api_health_loop184_closeout=200",
      "https_admin_root_loop184_closeout=200",
      "https_admin_customers_loop184_closeout=200",
      "https_admin_api_no_header_customers_loop184_closeout=401",
      "https_line_invalid_signature_loop184_closeout=401",
      "journal_sanitized_error_like_count=0",
      "nginx_error_recent_count=0",
      "resource_status=healthy"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents operations handoff, monitoring, incident response, rollback, and backlog", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "Daily Operations Checklist",
      "Weekly Operations Checklist",
      "Incident Response Checklist",
      "Disable LINE Only",
      "Disable OpenAI Only",
      "Safe Mode",
      "Future Backlog",
      "Loop 185: post-production backlog triage"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records that this closeout did not perform extra sends, smokes, or infra/database changes", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "runtime_changes_performed=false",
      "additional_line_send_performed=false",
      "OpenAI real API smoke=not performed",
      "nginx_dns_certbot_changes=none",
      "supabase_schema_rls_changes=none"
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
