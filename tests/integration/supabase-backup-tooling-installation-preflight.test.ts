import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/200_supabase_backup_tooling_installation_preflight.md";
const runbookPath = "docs/15_runbooks/supabase_backup_tooling_installation_preflight.md";
const docsToCheck = [
  taskDocPath,
  runbookPath,
  "README.md",
  "OBSIDIAN.md",
  "docs/08_dev_loop.md",
  "docs/14_dev_logs/2026-06-28.md",
  "docs/16_obsidian/README.md",
  "docs/16_obsidian/obsidian_link_map.md",
  "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md",
  "docs/15_runbooks/supabase_backup_export_and_restore_readiness_accelerated_closeout.md",
  "docs/15_runbooks/supabase_cli_backup_command_pack_planning.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md"
];

describe("Loop 200 Supabase backup tooling installation preflight", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records tooling preflight and PostgreSQL client status", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

    for (const expected of [
      "tooling_preflight_status=complete",
      "postgresql_client_installed=true",
      "pg_dump_available_before=false",
      "pg_dump_available_after=true",
      "psql_available_after=true",
      "supabase_cli_available_before=false",
      "supabase_cli_installed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records no export, no artifact, no restore, and no DB connection", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "Supabase CLI/API called=false",
      "pg_dump connection attempted=false",
      "DB export performed=false",
      "backup artifact created=false",
      "restore performed=false",
      "production_restore_performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records backup directory policy and production readiness", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "backup_dir_ready=true",
      "backup_dir_outside_repo=true",
      "artifact_path_policy=outside_repo_required",
      "backup_readiness_status=pg_dump_available",
      "export_readiness=ready_pending_operator_approval",
      "production_readiness=production_go",
      "activation_mode=line_and_openai_runtime",
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("updates Obsidian and development logs", () => {
    expect(readText(resolve("OBSIDIAN.md"))).toContain(
      "Loop 200 Supabase backup tooling installation preflight"
    );
    expect(readText(resolve("docs/16_obsidian/obsidian_link_map.md"))).toContain(
      "Loop 200 Supabase Backup Tooling Installation Preflight"
    );
    expect(readText(resolve("docs/16_obsidian/README.md"))).toContain(
      "Loop 200 Supabase backup tooling installation preflight"
    );
    expect(readText(resolve("docs/14_dev_logs/2026-06-28.md"))).toContain(
      "Loop 200: Supabase backup tooling installation preflight"
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
