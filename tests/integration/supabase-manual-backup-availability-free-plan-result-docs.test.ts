import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath =
  "docs/11_codex_tasks/194_1_supabase_manual_backup_availability_result_after_free_plan_limitation.md";
const runbookPath = "docs/15_runbooks/supabase_manual_backup_availability_result_after_free_plan_limitation.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "docs/08_dev_loop.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/supabase_manual_backup_result_recording.md",
  "docs/15_runbooks/supabase_manual_backup_operator_checklist.md",
  "docs/15_runbooks/supabase_backup_method_selection.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/production_stabilization_closeout_with_openai_runtime.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md"
];

describe("Loop 194.1 Supabase backup availability Free Plan result docs", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records the sanitized operator result", () => {
    const combined = checklistDocs();

    for (const expected of [
      "manual_backup_availability_recording_status=complete",
      "operator_result_received=true",
      "operator_result_sanitized=true",
      "backup_availability_checked=true",
      "project_confirmed_by_operator=true"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records Free Plan backup limitation and unavailable backup status", () => {
    const combined = combinedDocs();

    for (const expected of [
      "Free Plan limitation observed by operator",
      "manual_backup_available=false",
      "managed_backup_available=false",
      "scheduled_or_managed_backup_available=false",
      "upgrade_required_for_scheduled_backups=true",
      "backup_success_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records backup execution as not performed", () => {
    const combined = checklistDocs();

    for (const expected of [
      "backup_performed_by_operator=false",
      "backup_method=not_performed",
      "backup_status=not_performed",
      "backup_artifact_downloaded=false",
      "backup_artifact_committed_to_repo=false",
      "backup_artifact_uploaded_to_chat=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records restore, Codex export, Supabase CLI/API, and runtime safety flags", () => {
    const combined = combinedDocs();

    for (const expected of [
      "restore_performed=false",
      "restore performed by Codex=false",
      "DB export performed by Codex=false",
      "Supabase CLI/API called by Codex=false",
      "secrets_recorded=false",
      "runtime_changes_performed=false",
      "additional_line_send_performed=false",
      "OpenAI API performed=false",
      "Nginx/DNS/certbot changes=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records production readiness and read-only production health", () => {
    const combined = combinedDocs();

    for (const expected of [
      "production_readiness=production_go",
      "activation_mode=line_and_openai_runtime",
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present",
      "api_direct_8788_health_status=200",
      "https_api_health_status=200",
      "https_admin_root_status=200",
      "https_admin_customers_status=200",
      "https_admin_api_no_header_customers_status=401",
      "https_line_invalid_signature_status=401"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the decision and next safe step", () => {
    const combined = checklistDocs();

    for (const expected of [
      "decision=supabase_backup_path_decision_required_after_free_plan_limitation",
      "next_safe_step=Supabase backup path decision after Free Plan limitation",
      "Loop 195: Supabase backup path decision after Free Plan limitation"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("links Loop 194.1 from existing docs and dev log", () => {
    for (const relativePath of updatedDocs) {
      const text = readText(resolve(relativePath));

      expect(text).toContain("Loop 194.1");
    }

    expect(readText(resolve("README.md"))).toContain(
      "supabase_manual_backup_availability_result_after_free_plan_limitation.md"
    );
    expect(readText(resolve("docs/14_dev_logs/2026-06-28.md"))).toContain(
      "manual_backup_availability_recording_status=complete"
    );
  });

  it("does not record obvious secret values or forbidden provider values", () => {
    const combined = combinedDocs();
    const forbiddenPatterns = [
      new RegExp("LINE_CHANNEL_ACCESS" + "_TOKEN=.+"),
      new RegExp("LINE_CHANNEL" + "_SECRET=.+"),
      new RegExp("LINE_WEBHOOK_SECRET" + "_PATH=.+"),
      new RegExp("/api/line/webhook/[A-Za-z0-9._~-]{8,}"),
      new RegExp("userId[\"': ][A-Za-z0-9._-]+"),
      new RegExp("replyToken[\"': ][A-Za-z0-9._-]+"),
      new RegExp("OPENAI" + "_API_KEY=.+"),
      new RegExp("OPENAI" + "_MODEL=.+"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("SUPABASE" + "_URL=https?://[^<]"),
      new RegExp("SUPABASE" + "_ANON_KEY=.+"),
      new RegExp("SUPABASE_SERVICE" + "_ROLE_KEY=.+"),
      new RegExp("SUPABASE" + "_DB_URL=.+"),
      new RegExp("postgresql" + "://", "i"),
      new RegExp("postgres" + "://", "i"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("privkey" + "\\.pem")
    ];

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function checklistDocs(): string {
  return readCombined([taskDocPath, runbookPath]);
}

function combinedDocs(): string {
  return readCombined(updatedDocs);
}

function resolve(relativePath: string): string {
  return join(root, relativePath);
}

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readText(resolve(relativePath))).join("\n");
}
