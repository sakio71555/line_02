import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/193_supabase_manual_backup_operator_checklist.md";
const runbookPath = "docs/15_runbooks/supabase_manual_backup_operator_checklist.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "docs/08_dev_loop.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md",
  "docs/15_runbooks/post_production_backlog_triage.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/production_stabilization_closeout_with_openai_runtime.md",
  "docs/15_runbooks/supabase_backup_method_selection.md"
];

describe("Loop 193 Supabase manual backup operator checklist docs", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("documents operator prerequisites and pre-backup checklist", () => {
    const combined = checklistDocs();

    for (const expected of [
      "## Operator Prerequisites",
      "operator_prerequisites:",
      "Operator must have authorized Supabase dashboard access",
      "Operator must know which production project is in scope",
      "Operator must not paste secrets into chat/docs",
      "Supabase dashboard/manual/managed backup availability must be confirmed by operator in the current Supabase project and plan.",
      "## Pre-Backup Checklist",
      "pre_backup_checklist:",
      "Confirm production_readiness=production_go",
      "Confirm activation_mode=line_and_openai_runtime",
      "Confirm REPOSITORY_RUNTIME=supabase",
      "Confirm restore is not being performed"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents availability, execution, post-backup, and record templates", () => {
    const combined = checklistDocs();

    for (const expected of [
      "availability_check:",
      "backup_availability_checked=true/false",
      "manual_backup_available=true/false/operator_unknown",
      "managed_backup_available=true/false/operator_unknown",
      "operator_backup_execution_checklist:",
      "Do not upload artifact to repo/chat",
      "post_backup_verification:",
      "Confirm no production restore was performed",
      "backup_performed_by_operator=true/false",
      "backup_method=manual_dashboard/managed_backup/operator_unknown",
      "backup_artifact_committed_to_repo=false",
      "backup_failure_record:",
      "failure_stage=availability_check/start/wait/complete/download/operator_unknown",
      "next_action=operator_review_required"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents restore drill policy, non-production first, and No-Go conditions", () => {
    const combined = checklistDocs();

    for (const expected of [
      "restore_drill_policy:",
      "Restore drill must be non-production first",
      "Production restore is prohibited without explicit approval",
      "Validate tenant scoped data",
      "Validate RLS",
      "Validate migrations/schema consistency",
      "Validate admin API auth guard",
      "Validate LINE invalid-signature rejection",
      "no_go_conditions:",
      "Operator cannot confirm correct Supabase project",
      "Backup artifact storage location is not approved",
      "There is an active production incident",
      "Restore would affect production"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the Loop 193 not-performed flags and production readiness", () => {
    const combined = combinedDocs();

    for (const expected of [
      "manual_backup_operator_checklist=created",
      "backup_availability_template=created",
      "backup_execution_checklist=created",
      "backup_result_record_template=created",
      "failure_record_template=created",
      "restore_drill_policy=non_production_first",
      "no_go_conditions=created",
      "Supabase CLI/API called=false",
      "DB export performed=false",
      "restore performed=false",
      "backup artifact downloaded=false",
      "runtime_changes_performed=false",
      "additional_line_send_performed=false",
      "OpenAI API performed=false",
      "Nginx/DNS/certbot changes=false",
      "production_readiness=production_go"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records read-only safety evidence without changing runtime or external systems", () => {
    const combined = combinedDocs();

    for (const expected of [
      "api_direct_8788_health_status=200",
      "https_api_health_status=200",
      "https_admin_root_status=200",
      "https_admin_customers_status=200",
      "https_admin_api_no_header_customers_status=401",
      "https_line_invalid_signature_status=401",
      "No restart, runtime change, additional LINE send, OpenAI API call, Supabase export/write, Nginx/DNS/certbot change, backup creation, or restore was performed."
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents the future Loop split", () => {
    const combined = checklistDocs();

    for (const expected of [
      "Loop 194: Supabase manual backup result recording",
      "only after operator performs backup externally",
      "Loop 195: Supabase non-production restore drill plan",
      "Loop 196: Supabase backup dry-run command pack",
      "Loop 197: Supabase backup automation proposal"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not include obvious Supabase, LINE, OpenAI, bearer, private-key, or DB connection values", () => {
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

function checklistDocs(): string {
  return [taskDocPath, runbookPath].map(read).join("\n");
}

function combinedDocs(): string {
  return updatedDocs.map(read).join("\n");
}

function assignment(parts: string[]): RegExp {
  return new RegExp(`${parts.join("_")}=.+`, "u");
}

function forbiddenPatterns(): RegExp[] {
  const line = "LINE";
  const channel = "CHANNEL";
  const access = "ACCESS";
  const token = "TOKEN";
  const secret = "SECRET";
  const webhook = "WEBHOOK";
  const openai = "OPENAI";
  const model = "MODEL";
  const supabase = "SUPABASE";
  const anon = "ANON";
  const serviceRole = "SERVICE_ROLE";
  const key = "KEY";
  const db = "DB";
  const url = "URL";
  const postgres = "postgres";
  const ql = "ql";

  return [
    assignment([line, channel, access, token]),
    assignment([line, channel, secret]),
    assignment([line, webhook, secret, "PATH"]),
    assignment([line, webhook, secret]),
    /\/api\/line\/webhook\/[A-Za-z0-9._~-]{8,}/u,
    /\/line\/webhook\/[A-Za-z0-9._~-]{8,}/u,
    /userId["': ][A-Za-z0-9._-]+/u,
    /replyToken["': ][A-Za-z0-9._-]+/u,
    assignment([openai, "API", key]),
    assignment([openai, model]),
    /sk-[A-Za-z0-9]/u,
    /Authorization: Bearer [A-Za-z0-9._-]+/u,
    new RegExp(`${supabase}_${url}=https?://[^<\\s]+`, "u"),
    assignment([supabase, anon, key]),
    assignment([supabase, serviceRole, key]),
    assignment([supabase, db, url]),
    new RegExp(`${postgres}(?:${ql})?://`, "iu"),
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u
  ];
}
