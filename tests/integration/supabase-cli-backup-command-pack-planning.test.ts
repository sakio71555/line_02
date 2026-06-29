import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/198_supabase_cli_backup_command_pack_planning.md";
const runbookPath = "docs/15_runbooks/supabase_cli_backup_command_pack_planning.md";
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
  "docs/15_runbooks/supabase_cli_backup_dry_run_design.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md"
];

describe("Loop 198 Supabase CLI backup command pack planning", () => {
  it("adds the task doc and command pack planning runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records placeholder policy and all command groups", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

    for (const expected of [
      "command_pack_status=planned",
      "placeholder_only=true",
      "placeholder_policy_created=true",
      "preflight_command_group=planned",
      "export_command_group=planned",
      "verification_command_group=planned",
      "artifact_handling_group=planned",
      "restore_roadmap_group=planned"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records approval tokens and No-Go conditions", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

    for (const expected of [
      "approval_tokens_created=true",
      "ALLOW_SUPABASE_CLI_PREFLIGHT=false",
      "ALLOW_SUPABASE_CLI_OR_API_CALL=false",
      "ALLOW_PG_DUMP_EXECUTION=false",
      "ALLOW_DB_EXPORT=false",
      "ALLOW_BACKUP_ARTIFACT_CREATION=false",
      "ALLOW_BACKUP_ARTIFACT_CHECKSUM=false",
      "ALLOW_RESTORE=false",
      "ALLOW_PRODUCTION_RESTORE=false",
      "ALLOW_SECRET_OPERATOR_INJECTION=false",
      "no_go_conditions_created=true"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records not-executed status and blocked backup execution", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "preflight_execution_status=not_executed",
      "export_execution_status=not_executed",
      "restore_execution_status=not_executed",
      "Supabase CLI/API called=false",
      "pg_dump executed=false",
      "DB export performed=false",
      "backup artifact created=false",
      "restore performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records production state, read-only evidence, and next Loop", () => {
    const combined = readCombined(docsToCheck);

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
      "https_line_invalid_signature_status=401",
      "Loop 199: Supabase CLI backup dry-run preflight"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("updates Obsidian and development logs", () => {
    expect(readText(resolve("OBSIDIAN.md"))).toContain(
      "Loop 198 Supabase CLI backup command pack planning"
    );
    expect(readText(resolve("docs/16_obsidian/obsidian_link_map.md"))).toContain(
      "Loop 198 Supabase CLI Backup Command Pack Planning"
    );
    expect(readText(resolve("docs/16_obsidian/README.md"))).toContain(
      "Loop 198 Supabase CLI backup command pack planning"
    );
    expect(readText(resolve("docs/14_dev_logs/2026-06-28.md"))).toContain(
      "Loop 198: Supabase CLI backup command pack planning"
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
