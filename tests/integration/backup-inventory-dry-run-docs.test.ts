import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/189_backup_inventory_dry_run_script.md";
const runbookPath = "docs/15_runbooks/backup_inventory_dry_run_script.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "docs/08_dev_loop.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/post_production_backlog_triage.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/production_stabilization_closeout_with_openai_runtime.md"
];

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function combinedDocs(): string {
  return updatedDocs.map(read).join("\n");
}

function envAssignment(name: string): RegExp {
  return new RegExp(`${name}=.+`, "u");
}

describe("Loop 189 backup inventory dry-run docs", () => {
  it("adds the task doc and runbook with required safety sections", () => {
    const taskDoc = read(taskDocPath);
    const runbook = read(runbookPath);
    const combined = `${taskDoc}\n${runbook}`;

    expect(taskDoc).toContain("# Loop 189: Backup Inventory Dry-Run Script");
    expect(runbook).toContain("# Backup Inventory Dry-Run Script");
    expect(combined).toContain("script_path=scripts/backup/backup-inventory-dry-run.ts");
    expect(combined).toContain("default_mode=dry_run_read_only");
    expect(combined).toContain("## Inventory Targets");
    expect(combined).toContain("## 4. Excluded Actions");
    expect(combined).toContain("## P0 Operations Closeout");
    expect(combined).toContain("Loop 190: backup retention dry-run proposal");
  });

  it("records no backup, no export, no secret copy, no env display, and no timer", () => {
    const combined = `${read(taskDocPath)}\n${read(runbookPath)}`;

    expect(combined).toContain("backup_job_created=false");
    expect(combined).toContain("db_export_performed=false");
    expect(combined).toContain("secret_file_copied=false");
    expect(combined).toContain("env_values_displayed=false");
    expect(combined).toContain("supabase_export_performed=false");
    expect(combined).toContain("timer_created=false");
    expect(combined).toContain("secrets_recorded=false");
    expect(combined).toContain("runtime_changes_performed=false");
    expect(combined).toContain("additional_line_send_performed=false");
    expect(combined).toContain("openai_api_performed=false");
    expect(combined).toContain("production_readiness=production_go");
  });

  it("updates the P0 backlog, readiness, README, dev loop, and dev log docs", () => {
    const combined = combinedDocs();

    expect(combined).toContain("Loop 189: backup inventory dry-run script");
    expect(combined).toContain("backup inventory dry-run");
    expect(combined).toContain("script_path=scripts/backup/backup-inventory-dry-run.ts");
    expect(combined).toContain("backup inventory dry-run=pending");
    expect(combined).toContain("backup_job_created=false");
    expect(combined).toContain("db_export_performed=false");
    expect(combined).toContain("secret_file_copied=false");
    expect(combined).toContain("env_values_displayed=false");
    expect(combined).toContain("timer_created=false");
    expect(combined).toContain("runtime_changes_performed=false");
    expect(combined).toContain("production readiness: Go");
    expect(combined).toContain("Loop 190: backup retention dry-run proposal");
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
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY", "u")
    ];

    for (const pattern of forbidden) {
      expect(combined).not.toMatch(pattern);
    }
  });
});
