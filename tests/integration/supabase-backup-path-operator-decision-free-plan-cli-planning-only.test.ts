import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/196_supabase_backup_path_operator_decision_free_plan_cli_planning_only.md";
const runbookPath = "docs/15_runbooks/supabase_backup_path_operator_decision_free_plan_cli_planning_only.md";
const updatedDocs = [
  taskDocPath,
  runbookPath,
  "README.md",
  "OBSIDIAN.md",
  "docs/08_dev_loop.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/supabase_backup_method_selection.md",
  "docs/15_runbooks/supabase_backup_path_decision_after_free_plan_limitation.md",
  "docs/15_runbooks/supabase_manual_backup_availability_result_after_free_plan_limitation.md",
  "docs/16_obsidian/README.md",
  "docs/16_obsidian/obsidian_link_map.md"
];

describe("Loop 196 Supabase backup path operator decision", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records the operator decision", () => {
    const combined = checklistDocs();

    for (const expected of [
      "operator_decision_status=recorded",
      "selected_path=B_planning_only",
      "decision=Free PlanのままCLI/pg_dump系backup dry-runの設計だけ進める",
      "Supabase Pro upgrade=false",
      "Supabase CLI/API approval=false",
      "DB export approval=false",
      "restore approval=false",
      "backup_success_status=not_achieved",
      "secret_handling_design_only=true"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records what is approved and not approved", () => {
    const combined = checklistDocs();

    for (const expected of [
      "CLI/pg_dump-style backup design",
      "Secret handling design",
      "Dry-run boundary design",
      "Command pack planning without execution",
      "Non-production restore drill planning",
      "Supabase CLI execution",
      "Supabase API execution",
      "pg_dump execution",
      "DB export",
      "DB restore",
      "Production restore",
      "Secret display",
      "Backup artifact download or upload",
      "Cron or systemd timer",
      "Supabase plan upgrade"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records risk rationale and next design boundary", () => {
    const combined = checklistDocs();

    for (const expected of [
      "Pro/managed backup has cost impact, so not selected now",
      "CLI/pg_dump path may support Free Plan but has secret handling risk",
      "design-only boundary before any command execution",
      "Any future execution requires explicit approval and secret-safe operator injection",
      "Loop 197: Supabase CLI backup dry-run design",
      "docs/design only",
      "command pack draft only",
      "no execution",
      "no DB URL display",
      "no secrets",
      "no export",
      "no restore"
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
    expect(readText(resolve("OBSIDIAN.md"))).toContain("Loop 196");
    expect(readText(resolve("docs/16_obsidian/README.md"))).toContain("Loop 196");
    expect(readText(resolve("docs/16_obsidian/obsidian_link_map.md"))).toContain(
      "Loop 196 Operator Decision"
    );
    expect(readText(resolve("docs/14_dev_logs/2026-06-28.md"))).toContain(
      "Loop 196: Supabase backup path operator decision"
    );
  });

  it("keeps the next Loop explicit and design-only", () => {
    const combined = combinedDocs();

    expect(combined).toContain("Loop 197: Supabase CLI backup dry-run design");
    expect(combined).toContain("scope:");
    expect(combined).toContain("docs/design only");
    expect(combined).toContain("no execution");
    expect(combined).toContain("no DB URL display");
    expect(combined).toContain("no export");
    expect(combined).toContain("no restore");
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
