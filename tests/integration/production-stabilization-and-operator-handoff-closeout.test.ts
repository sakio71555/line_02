import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  taskDoc: "docs/11_codex_tasks/180_production_stabilization_and_operator_handoff_closeout.md",
  runbook: "docs/15_runbooks/production_stabilization_and_operator_handoff_closeout.md",
  devLog: "docs/14_dev_logs/2026-06-28.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  handoff: "docs/15_runbooks/final_operator_handoff_checklist.md"
};

describe("Loop 180 production stabilization and operator handoff closeout docs", () => {
  it("adds the Loop 180 task doc and closeout runbook", () => {
    expect(existsSync(resolve(paths.taskDoc))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records production Go line-only closeout in dedicated docs", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "closeout_status=complete",
      "production_readiness=production_go",
      "activation_mode=line_only",
      "monitoring_status=healthy",
      "rollback_recommended=false",
      "handoff_complete=true",
      "runtime_changes_performed=false",
      "line_send_performed=false",
      "openai_real_api_performed=false",
      "nginx_dns_certbot_changes=none",
      "supabase_schema_rls_changes=none"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the final line-only runtime state", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in=absent"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records closeout health and safety checks", () => {
    const combined = readCombined(Object.values(paths));

    for (const expected of [
      "api_direct_health_loop180_closeout=200",
      "https_api_health_loop180_closeout=200",
      "https_admin_root_loop180_closeout=200",
      "https_admin_customers_loop180_closeout=200",
      "https_admin_api_no_header_customers_loop180_closeout=401",
      "https_line_invalid_signature_loop180_closeout=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents daily, weekly, incident, rollback, and future backlog guidance", () => {
    const combined = readCombined([paths.taskDoc, paths.runbook]);

    for (const expected of [
      "Daily Operations Checklist",
      "Weekly Operations Checklist",
      "Incident Response Checklist",
      "Immediate Rollback Card",
      "OpenAI runtime activation remains a separate explicit Loop",
      "Future Backlog"
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
