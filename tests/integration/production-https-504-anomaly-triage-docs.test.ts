import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/192_production_https_504_anomaly_read_only_triage.md";
const runbookPath = "docs/15_runbooks/production_https_504_anomaly_read_only_triage.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "docs/08_dev_loop.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md",
  "docs/15_runbooks/production_monitoring_schedule.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/production_stabilization_closeout_with_openai_runtime.md"
];

describe("Loop 192 production HTTPS 504 anomaly read-only triage docs", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records the read-only triage result and health matrix", () => {
    const combined = `${read(taskDocPath)}\n${read(runbookPath)}`;

    for (const expected of [
      "anomaly_status=resolved_or_transient",
      "restart_required=false",
      "next_loop_decision=Loop 193: Supabase manual backup operator checklist",
      "api_direct_8788_health_status=200",
      "https_api_health_status=200",
      "https_admin_root_status=200",
      "https_admin_customers_status=200",
      "https_admin_api_no_header_customers_status=401",
      "https_line_invalid_signature_status=401",
      "production_monitoring_dry_run=healthy"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records sanitized Nginx, journal, resource, and runtime summaries", () => {
    const combined = `${read(taskDocPath)}\n${read(runbookPath)}`;

    for (const expected of [
      "## Nginx Sanitized Summary",
      "nginx_access_status_counts=",
      "nginx_error_recent_count=0",
      "nginx_error_class_counts=none",
      "## Journal Sanitized Summary",
      "api_journal_interesting_count=0",
      "admin_journal_interesting_count=0",
      "## Resource Summary",
      "memory_ok=true",
      "disk_ok=true",
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "openai_dropin=present",
      "configured; value not recorded"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records that no runtime or external changes were performed", () => {
    const combined = combinedDocs();

    for (const expected of [
      "restart_performed=false",
      "runtime_changes_performed=false",
      "Nginx/DNS/certbot changes=false",
      "LINE send=false",
      "OpenAI API=false",
      "Supabase write/export=false",
      "backup_created=false",
      "backup_deleted=false",
      "timer_created=false",
      "secrets_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("updates README, dev loop, runbooks, readiness, and dev log docs", () => {
    const combined = combinedDocs();

    for (const expected of [
      "Loop 192",
      "production HTTPS Admin `504`",
      "read-only",
      "anomaly_status=resolved_or_transient",
      "restart_required=false",
      "Loop 193: Supabase manual backup operator checklist"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not include obvious secret values in Loop 192 docs", () => {
    const combined = combinedDocs();

    for (const pattern of forbiddenPatterns()) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(root, relativePath);
}

function read(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}

function combinedDocs(): string {
  return updatedDocs.map(read).join("\n");
}

function envAssignment(name: string): RegExp {
  return new RegExp(`${name}=.+`, "u");
}

function forbiddenPatterns(): RegExp[] {
  return [
    envAssignment("LINE_CHANNEL_ACCESS_TOKEN"),
    envAssignment("LINE_CHANNEL_SECRET"),
    envAssignment("LINE_WEBHOOK_SECRET_PATH"),
    envAssignment("LINE_WEBHOOK_SECRET"),
    /\/api\/line\/webhook\/[A-Za-z0-9._~-]{8,}/u,
    /\/line\/webhook\/[A-Za-z0-9._~-]{8,}/u,
    /userId["': ][A-Za-z0-9._-]+/u,
    /replyToken["': ][A-Za-z0-9._-]+/u,
    envAssignment("OPENAI_API_KEY"),
    envAssignment("OPENAI_MODEL"),
    /sk-[A-Za-z0-9]/u,
    /Authorization: Bearer [A-Za-z0-9._-]+/u,
    /SUPABASE_URL=https?:\/\/[^<\s]+/u,
    envAssignment("SUPABASE_ANON_KEY"),
    envAssignment("SUPABASE_SERVICE_ROLE_KEY"),
    envAssignment("SUPABASE_DB_URL"),
    /postgres(?:ql)?:\/\//iu,
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u
  ];
}
