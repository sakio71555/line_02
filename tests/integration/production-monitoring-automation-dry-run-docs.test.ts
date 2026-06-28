import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDoc = "docs/11_codex_tasks/186_production_monitoring_automation_dry_run.md";
const runbook = "docs/15_runbooks/production_monitoring_automation_dry_run.md";
const devLog = "docs/14_dev_logs/2026-06-28.md";

describe("Loop 186 production monitoring automation dry-run docs", () => {
  it("adds the Loop task doc and runbook", () => {
    expect(existsSync(resolve(taskDoc))).toBe(true);
    expect(existsSync(resolve(runbook))).toBe(true);
  });

  it("records script path, dry-run status, safety boundary, and production readiness", () => {
    const combined = [read(taskDoc), read(runbook), read(devLog)].join("\n");

    for (const expected of [
      "scripts/monitoring/production-monitoring-dry-run.ts",
      "production_monitoring_dry_run=healthy",
      "exit_status=0",
      "dry-run",
      "No cron installed",
      "No systemd timer installed",
      "No monitoring notification sent",
      "runtime_changes_performed=false",
      "production_readiness=production_go",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present",
      "secrets_recorded=false",
      "Loop 187: OpenAI usage and cost monitoring plan"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record obvious secret patterns in Loop 186 docs", () => {
    const combined = [read(taskDoc), read(runbook), read(devLog)].join("\n");

    for (const pattern of [
      /\/api\/line\/webhook\/[A-Za-z0-9._~-]{8,}/,
      /userId["': ][A-Za-z0-9._-]+/,
      /replyToken["': ][A-Za-z0-9._-]+/,
      /OPENAI_API_KEY=.+/,
      /OPENAI_MODEL=.+/,
      /Authorization: Bearer [A-Za-z0-9._-]+/,
      /SUPABASE_URL=https?:\/\/[^<\s]+/,
      /SUPABASE_(?:ANON|SERVICE_ROLE)_KEY=.+/,
      /SUPABASE_DB_URL=.+/,
      /postgres(?:ql)?:\/\//i,
      /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/
    ]) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(repoRoot, relativePath);
}

function read(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}
