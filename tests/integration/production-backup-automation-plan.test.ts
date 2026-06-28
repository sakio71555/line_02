import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const taskDocPath = "docs/11_codex_tasks/188_production_backup_automation_plan.md";
const runbookPath = "docs/15_runbooks/production_backup_automation_plan.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "docs/08_dev_loop.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md",
  "docs/15_runbooks/post_production_backlog_triage.md",
  "docs/15_runbooks/production_monitoring_schedule.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/production_stabilization_closeout_with_openai_runtime.md"
];

function combinedDocs(): string {
  return updatedDocs.map(read).join("\n");
}

function envAssignment(name: string): RegExp {
  return new RegExp(`${name}=.+`, "u");
}

describe("Loop 188 production backup automation plan", () => {
  it("adds the Loop 188 task doc and runbook with required sections", () => {
    const taskDoc = read(taskDocPath);
    const runbook = read(runbookPath);
    const combined = `${taskDoc}\n${runbook}`;

    expect(taskDoc).toContain("# Loop 188: Production Backup Automation Plan");
    expect(runbook).toContain("# Production Backup Automation Plan");
    expect(combined).toContain("## Purpose");
    expect(combined).toContain("## Current Production State");
    expect(combined).toContain("## Backup Scope");
    expect(combined).toContain("## Excluded Data");
    expect(combined).toContain("## Secret Handling Policy");
    expect(combined).toContain("## Supabase Backup Strategy");
    expect(combined).toContain("## VPS Deploy Backup Strategy");
    expect(combined).toContain("## Repo / Docs Backup Strategy");
    expect(combined).toContain("## Retention Policy");
    expect(combined).toContain("## Restore Drill Plan");
    expect(combined).toContain("## Verification Policy");
    expect(combined).toContain("## Future Automation Plan");
    expect(combined).toContain("## No-Go Conditions");
    expect(combined).toContain("Loop 189: backup inventory dry-run script");
  });

  it("records backup scope, restore drill, retention, and no-execution boundaries", () => {
    const combined = `${read(taskDocPath)}\n${read(runbookPath)}`;

    expect(combined).toContain("Git / Source / Docs");
    expect(combined).toContain("VPS Deploy Artifacts");
    expect(combined).toContain("Runtime Configuration");
    expect(combined).toContain("Supabase");
    expect(combined).toContain("LINE / OpenAI External Services");
    expect(combined).toContain("Logs and Monitoring Artifacts");
    expect(combined).toContain("Git Restore Drill");
    expect(combined).toContain("VPS Deploy Rollback Drill");
    expect(combined).toContain("Supabase Restore Drill");
    expect(combined).toContain("Runtime Secret Re-Injection Drill");
    expect(combined).toContain("LINE / OpenAI Recovery Drill");
    expect(combined).toContain("vps_deploy_backups_keep_last=5");
    expect(combined).toContain("supabase_backup_frequency=operator_defined");
    expect(combined).toContain("backup_job_created=false");
    expect(combined).toContain("DB export performed=false");
    expect(combined).toContain("cron/systemd timer created=false");
    expect(combined).toContain("runtime_changes_performed=false");
    expect(combined).toContain("production_readiness=production_go");
  });

  it("updates the backlog, monitoring, handoff, README, dev loop, and dev log docs", () => {
    const combined = combinedDocs();

    expect(combined).toContain("Loop 188: production backup automation plan");
    expect(combined).toContain("production backup automation plan");
    expect(combined).toContain("backup automation current status=planned");
    expect(combined).toContain("implementation status=not implemented");
    expect(combined).toContain("backup_job_created=false");
    expect(combined).toContain("DB export performed=false");
    expect(combined).toContain("cron/systemd timer created=false");
    expect(combined).toContain("Supabase export performed=false");
    expect(combined).toContain("production readiness: Go");
    expect(combined).toContain("Loop 189: backup inventory dry-run script");
  });

  it("does not include obvious LINE, OpenAI, Supabase, bearer, private-key, or DB URL secret values", () => {
    const combined = combinedDocs();
    const slash = "/";
    const dash = "-";
    const http = "http";
    const authorization = "Authorization";
    const bearer = "Bearer";
    const postgres = "postgres";
    const token = "TOKEN";
    const secret = "SECRET";
    const openAi = "OPENAI";
    const supabase = "SUPABASE";
    const line = "LINE";
    const webhook = "WEBHOOK";

    const forbidden = [
      envAssignment(`${line}_CHANNEL_ACCESS_${token}`),
      envAssignment(`${line}_CHANNEL_${secret}`),
      envAssignment(`${line}_${webhook}_${secret}_PATH`),
      envAssignment(`${line}_${webhook}_${secret}`),
      new RegExp(`${slash}api${slash}line${slash}${webhook.toLowerCase()}${slash}[A-Za-z0-9._~-]{8,}`, "u"),
      new RegExp(`${slash}line${slash}${webhook.toLowerCase()}${slash}[A-Za-z0-9._~-]{8,}`, "u"),
      new RegExp(`userId["': ][A-Za-z0-9._-]+`, "u"),
      new RegExp(`reply${token}["': ][A-Za-z0-9._-]+`, "u"),
      envAssignment(`${openAi}_API_KEY`),
      envAssignment(`${openAi}_MODEL`),
      new RegExp(`s${"k"}${dash}[A-Za-z0-9]`, "u"),
      new RegExp(`${authorization}: ${bearer} [A-Za-z0-9._-]+`, "u"),
      new RegExp(`${supabase}_URL=${http}s?://[^<\\s]+`, "u"),
      envAssignment(`${supabase}_ANON_KEY`),
      envAssignment(`${supabase}_SERVICE_ROLE_KEY`),
      envAssignment(`${supabase}_DB_URL`),
      new RegExp(`${postgres}(?:ql)?://`, "iu"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY", "u"),
      new RegExp("privkey\\.pem", "u")
    ];

    for (const pattern of forbidden) {
      expect(combined).not.toMatch(pattern);
    }
  });
});
