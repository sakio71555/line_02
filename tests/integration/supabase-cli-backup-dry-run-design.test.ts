import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/197_supabase_cli_backup_dry_run_design.md";
const runbookPath = "docs/15_runbooks/supabase_cli_backup_dry_run_design.md";
const docsToCheck = [
  taskDocPath,
  runbookPath,
  "OBSIDIAN.md",
  "docs/16_obsidian/README.md",
  "docs/16_obsidian/obsidian_link_map.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md",
  "docs/15_runbooks/supabase_backup_path_operator_decision_free_plan_cli_planning_only.md",
  "docs/15_runbooks/supabase_backup_path_decision_after_free_plan_limitation.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md"
];

describe("Loop 197 Supabase CLI backup dry-run design", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records design models, approval tokens, No-Go conditions, and future split", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

    for (const expected of [
      "secret_handling_model_created=true",
      "artifact_handling_model_created=true",
      "approval_tokens_created=true",
      "command_pack_principles_created=true",
      "no_go_conditions_created=true",
      "future_loop_split_created=true",
      "restore_verification_roadmap_created=true",
      "ALLOW_SUPABASE_CLI_CHECK=false by default",
      "ALLOW_SUPABASE_DB_EXPORT=false by default",
      "ALLOW_PG_DUMP_EXECUTION=false by default",
      "ALLOW_BACKUP_ARTIFACT_CREATION=false by default",
      "ALLOW_RESTORE=false always false until non-production restore Loop",
      "ALLOW_SECRET_OPERATOR_INJECTION=false by default",
      "Loop 198: Supabase CLI backup command pack planning",
      "Loop 199: Supabase CLI backup dry-run preflight",
      "Loop 200: Supabase backup export controlled execution",
      "Loop 201: Supabase non-production restore drill plan",
      "Loop 202: Supabase non-production restore controlled execution"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records blocked execution and production safety state", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "production_readiness=production_go",
      "activation_mode=line_and_openai_runtime",
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present",
      "Supabase CLI/API called=false",
      "pg_dump executed=false",
      "DB export performed=false",
      "restore performed=false",
      "backup artifact created=false",
      "runtime_changes_performed=false",
      "additional_line_send_performed=false",
      "openai_api_performed=false",
      "nginx_dns_certbot_changes=false",
      "secrets_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records read-only health and invalid-signature evidence", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

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

  it("updates Obsidian and development logs", () => {
    expect(readText(resolve("OBSIDIAN.md"))).toContain(
      "Loop 197 Supabase CLI backup dry-run design"
    );
    expect(readText(resolve("docs/16_obsidian/obsidian_link_map.md"))).toContain(
      "Loop 197 Supabase CLI Backup Dry-Run Design"
    );
    expect(readText(resolve("docs/16_obsidian/README.md"))).toContain(
      "Loop 197 Supabase CLI backup dry-run design"
    );
    expect(readText(resolve("docs/14_dev_logs/2026-06-28.md"))).toContain(
      "Loop 197: Supabase CLI backup dry-run design"
    );
  });

  it("does not record secret-shaped values or forbidden provider identifiers", () => {
    const combined = readCombined(docsToCheck);
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
      new RegExp("https://" + "[a-z0-9-]+\\.supabase\\.co", "i"),
      new RegExp("postgresql" + "://", "i"),
      new RegExp("postgres" + "://", "i"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("privkey" + "\\.pem"),
      new RegExp("line-test-sent-no-auto-reply")
    ];

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(root, relativePath);
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readText(resolve(relativePath))).join("\n");
}
