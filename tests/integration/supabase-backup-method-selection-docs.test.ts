import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/191_supabase_backup_method_selection.md";
const runbookPath = "docs/15_runbooks/supabase_backup_method_selection.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "docs/08_dev_loop.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/backup_inventory_dry_run_script.md",
  "docs/15_runbooks/backup_retention_dry_run_proposal.md",
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

describe("Loop 191 Supabase backup method selection docs", () => {
  it("adds the task doc and runbook with method candidates and selection criteria", () => {
    const taskDoc = read(taskDocPath);
    const runbook = read(runbookPath);
    const combined = `${taskDoc}\n${runbook}`;

    expect(taskDoc).toContain("# Loop 191: Supabase Backup Method Selection");
    expect(runbook).toContain("# Supabase Backup Method Selection");
    expect(combined).toContain("A. Dashboard/manual backup");
    expect(combined).toContain("B. CLI / database dump style export");
    expect(combined).toContain("C. Scheduled secure export");
    expect(combined).toContain("D. Managed/provider backup feature");
    expect(combined).toContain("## Selection Criteria");
    expect(combined).toContain("Secret exposure risk");
    expect(combined).toContain("Restore confidence");
    expect(combined).toContain("Non-production restore drill");
    expect(combined).toContain("Operator Approval Requirements");
  });

  it("records the selected safe boundary and required not-performed flags", () => {
    const combined = `${read(taskDocPath)}\n${read(runbookPath)}`;

    expect(combined).toContain("selection_status=completed");
    expect(combined).toContain("backup method selected=operator_review_required");
    expect(combined).toContain("recommended_path=operator_confirmed_manual_or_managed_backup_first");
    expect(combined).toContain("future_automation_path=CLI_or_scheduled_export_after_explicit_approval");
    expect(combined).toContain("production_export_status=not_performed");
    expect(combined).toContain("DB export performed=false");
    expect(combined).toContain("Supabase CLI/API called=false");
    expect(combined).toContain("restore drill target=non_production_first");
    expect(combined).toContain("future_automation_requires_explicit_approval=true");
    expect(combined).toContain("runtime_changes_performed=false");
    expect(combined).toContain("additional_line_send_performed=false");
    expect(combined).toContain("openai_api_performed=false");
    expect(combined).toContain("supabase_write_migration_rls_performed=false");
    expect(combined).toContain("nginx_dns_certbot_changes=none");
    expect(combined).toContain("production_readiness=production_go");
    expect(combined).toContain("Supabase configured; values not recorded");
  });

  it("documents restore drill and secret handling before future automation", () => {
    const combined = `${read(taskDocPath)}\n${read(runbookPath)}`;

    expect(combined).toContain("## Restore Drill Policy");
    expect(combined).toContain("Use non-production first");
    expect(combined).toContain("Do not overwrite production without explicit approval");
    expect(combined).toContain("Validate tenant-scoped data");
    expect(combined).toContain("Validate RLS");
    expect(combined).toContain("Validate migration/schema consistency");
    expect(combined).toContain("Validate application boot");
    expect(combined).toContain("Validate Admin API auth guard");
    expect(combined).toContain("Validate LINE invalid-signature rejection");
    expect(combined).toContain("## Secret Handling Policy");
    expect(combined).toContain("Raw dump contents must not be copied into docs");
    expect(combined).toContain("Operator-injected values stay outside Git and outside docs");
  });

  it("updates README, dev loop, backlog, runbooks, readiness, and dev log docs", () => {
    const combined = combinedDocs();

    expect(combined).toContain("Loop 191: Supabase backup method selection");
    expect(combined).toContain("Supabase backup method selection=done");
    expect(combined).toContain("selection_status=completed");
    expect(combined).toContain("backup method selected=operator_review_required");
    expect(combined).toContain("recommended_path=operator_confirmed_manual_or_managed_backup_first");
    expect(combined).toContain("production_export_status=not_performed");
    expect(combined).toContain("DB export performed=false");
    expect(combined).toContain("Supabase CLI/API called=false");
    expect(combined).toContain("restore drill target=non_production_first");
    expect(combined).toContain("future_automation_requires_explicit_approval=true");
    expect(combined).toContain("production readiness: Go");
    expect(combined).toContain("Loop 192: Supabase manual backup operator checklist");
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
