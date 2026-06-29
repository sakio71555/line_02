import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/194_supabase_manual_backup_result_recording.md";
const runbookPath = "docs/15_runbooks/supabase_manual_backup_result_recording.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "docs/08_dev_loop.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/supabase_manual_backup_operator_checklist.md",
  "docs/15_runbooks/supabase_backup_method_selection.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/production_stabilization_closeout_with_openai_runtime.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md"
];

describe("Loop 194 Supabase manual backup result recording docs", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records that operator result is required and pending", () => {
    const combined = checklistDocs();

    for (const expected of [
      "manual_backup_result_recording_status=pending",
      "operator_result_received=false",
      "operator_result_required=true",
      "operator_result_sanitized=operator_unknown",
      "backup_status=not_recorded",
      "backup_performed_by_operator=operator_unknown",
      "next_action=operator_to_perform_or_confirm_manual_backup"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents backup availability result fields", () => {
    const combined = checklistDocs();

    for (const expected of [
      "backup_availability_checked=operator_unknown",
      "manual_backup_available=operator_unknown",
      "managed_backup_available=operator_unknown",
      "retention_visibility=operator_unknown",
      "restore_option_visible=operator_unknown",
      "project_confirmed_by_operator=operator_unknown"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents backup execution, artifact, restore, and safety fields", () => {
    const combined = checklistDocs();

    for (const expected of [
      "backup_method=operator_unknown",
      "backup_artifact_downloaded=operator_unknown",
      "backup_artifact_committed_to_repo=false",
      "backup_artifact_uploaded_to_chat=false",
      "backup_artifact_contents_recorded=false",
      "restore_performed=false",
      "restore performed by Codex=false",
      "Supabase CLI/API called by Codex=false",
      "DB export performed by Codex=false",
      "secrets_recorded=false",
      "runtime_changes_performed=false"
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

  it("documents decision and next loop without advancing to restore drill yet", () => {
    const combined = checklistDocs();

    for (const expected of [
      "decision=operator_result_required",
      "next_loop=Operator performs Supabase manual backup using checklist",
      "Loop 194.1: Operator performs Supabase manual backup using checklist",
      "Loop 195: Supabase non-production restore drill plan",
      "do not proceed to non-production restore drill yet"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("links Loop 194 from existing docs and dev log", () => {
    for (const relativePath of updatedDocs) {
      const text = readText(resolve(relativePath));

      expect(text).toContain("Loop 194");
    }

    expect(readText(resolve("README.md"))).toContain("supabase_manual_backup_result_recording.md");
    expect(readText(resolve("docs/14_dev_logs/2026-06-28.md"))).toContain(
      "manual_backup_result_recording_status=pending"
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
