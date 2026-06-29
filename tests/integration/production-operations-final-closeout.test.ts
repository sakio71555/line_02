import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath =
  "docs/11_codex_tasks/197_production_operations_final_closeout_with_supabase_backup_deferred_risk_acceptance.md";
const runbookPath =
  "docs/15_runbooks/production_operations_final_closeout_with_supabase_backup_deferred_risk_acceptance.md";
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
  "docs/15_runbooks/production_stabilization_closeout_with_openai_runtime.md",
  "docs/15_runbooks/supabase_backup_path_operator_decision_free_plan_cli_planning_only.md",
  "docs/16_obsidian/obsidian_link_map.md"
];

describe("Loop 197 production operations final closeout", () => {
  it("adds the task doc and final closeout runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records final closeout state", () => {
    const combined = checklistDocs();

    for (const expected of [
      "project_closeout_status=complete",
      "no_further_required_loop=true",
      "production_readiness=production_go",
      "activation_mode=line_and_openai_runtime",
      "handoff_complete=true",
      "obsidian_alignment_status=complete"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records runtime state", () => {
    const combined = combinedDocs();

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records Supabase backup deferred risk acceptance", () => {
    const combined = combinedDocs();

    for (const expected of [
      "supabase_backup_success_status=not_achieved",
      "supabase_backup_risk_accepted=true",
      "supabase_backup_review_required_later=true",
      "supabase_pro_upgrade=false",
      "supabase_cli_api_called=false",
      "db_export_performed=false",
      "restore_performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records production safety boundaries", () => {
    const combined = combinedDocs();

    for (const expected of [
      "runtime_changes_performed=false",
      "additional_line_send_performed=false",
      "openai_api_performed=false",
      "nginx_dns_certbot_changes=false",
      "secrets_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records read-only health evidence", () => {
    const combined = combinedDocs();

    for (const expected of [
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

  it("updates Obsidian and development log pointers", () => {
    expect(readText(resolve("OBSIDIAN.md"))).toContain("Loop 197");
    expect(readText(resolve("docs/16_obsidian/obsidian_link_map.md"))).toContain(
      "Loop 197 Final Closeout"
    );
    expect(readText(resolve("docs/14_dev_logs/2026-06-28.md"))).toContain(
      "Loop 197: production operations final closeout"
    );
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
