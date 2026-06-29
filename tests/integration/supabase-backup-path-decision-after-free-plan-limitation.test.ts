import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/195_supabase_backup_path_decision_after_free_plan_limitation.md";
const runbookPath = "docs/15_runbooks/supabase_backup_path_decision_after_free_plan_limitation.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "OBSIDIAN.md",
  "docs/08_dev_loop.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/supabase_backup_method_selection.md",
  "docs/15_runbooks/supabase_manual_backup_availability_result_after_free_plan_limitation.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md",
  "docs/16_obsidian/README.md",
  "docs/16_obsidian/obsidian_link_map.md"
];

describe("Loop 195 Supabase backup path decision after Free Plan limitation", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records Free Plan limitation and backup not achieved", () => {
    const combined = checklistDocs();

    for (const expected of [
      "Free Plan limitation observed",
      "backup_availability_checked=true",
      "manual_backup_available=false",
      "managed_backup_available=false",
      "backup_status=not_performed",
      "backup_success_status=not_achieved"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the decision and recommended next operator choice", () => {
    const combined = checklistDocs();

    for (const expected of [
      "decision_status=recorded",
      "backup path decision recorded",
      "recommended_path=operator_decision_required_between_pro_upgrade_or_cli_dry_run",
      "recommended_immediate_next=operator chooses backup path",
      "operator_decision_required=true",
      "next_operator_choice=choose_pro_managed_backup_or_cli_dry_run_or_accept_defer_risk"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records all three option statuses", () => {
    const combined = checklistDocs();

    for (const expected of [
      "Option A: Supabase Pro / Managed Backup",
      "option_a_status=operator_plan_decision_required",
      "Option B: CLI / Backup Dry-Run",
      "option_b_status=explicit_approval_required",
      "Option C: Defer DB Backup / Risk Acceptance",
      "option_c_status=not_recommended_without_explicit_risk_acceptance"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("includes decision and risk matrices", () => {
    const combined = checklistDocs();

    for (const expected of [
      "## Decision Matrix",
      "Secret exposure risk",
      "Restore confidence",
      "Implementation complexity",
      "Operator burden",
      "Cost/billing impact",
      "Time to first safe backup",
      "Automation readiness",
      "Production risk",
      "Auditability",
      "## Risk Matrix"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records production state and read-only safety evidence", () => {
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

  it("records safety flags for work not performed", () => {
    const combined = combinedDocs();

    for (const expected of [
      "Supabase CLI/API called=false",
      "DB export performed=false",
      "restore performed=false",
      "runtime_changes_performed=false",
      "additional_line_send_performed=false",
      "OpenAI API performed=false",
      "Nginx/DNS/certbot changes=false",
      "secrets_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("updates Obsidian-facing navigation and dev log", () => {
    expect(readText(resolve("OBSIDIAN.md"))).toContain("Loop 195");
    expect(readText(resolve("docs/16_obsidian/README.md"))).toContain("Loop 195");
    expect(readText(resolve("docs/16_obsidian/obsidian_link_map.md"))).toContain(
      "Loop 195 Backup Path Decision"
    );
    expect(readText(resolve("docs/14_dev_logs/2026-06-28.md"))).toContain(
      "Loop 195: Supabase backup path decision after Free Plan limitation"
    );
  });

  it("keeps the next Loop explicit and small", () => {
    const combined = checklistDocs();

    for (const expected of [
      "Loop 196: Operator selects Supabase backup path",
      "Loop 196A: Supabase Pro/managed backup availability confirmation",
      "Loop 196B: Supabase CLI backup dry-run planning with explicit approval",
      "Loop 196C: Supabase backup deferred risk acceptance record"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record obvious secret values or forbidden provider values", () => {
    const combined = combinedDocs();
    const forbiddenPatterns = [
      new RegExp("LINE_CHANNEL_ACCESS" + "_TOKEN=.+"),
      new RegExp("LINE_CHANNEL" + "_SECRET=.+"),
      new RegExp("LINE_WEBHOOK_SECRET" + "_PATH=.+"),
      new RegExp("LINE_WEBHOOK" + "_SECRET=.+"),
      new RegExp("/api/line/webhook/[A-Za-z0-9._~-]{8,}"),
      new RegExp("/line/webhook/[A-Za-z0-9._~-]{8,}"),
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
