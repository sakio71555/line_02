import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath = "docs/11_codex_tasks/201_supabase_backup_export_controlled_execution.md";
const runbookPath = "docs/15_runbooks/supabase_backup_export_controlled_execution.md";
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
  "docs/15_runbooks/supabase_backup_tooling_installation_preflight.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md"
];

describe("Loop 201 Supabase backup export controlled execution", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records approval state and production state", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

    for (const expected of [
      "ALLOW_PG_DUMP_EXECUTION=true",
      "ALLOW_DB_EXPORT=true",
      "ALLOW_BACKUP_ARTIFACT_CREATION=true",
      "ALLOW_BACKUP_ARTIFACT_CHECKSUM=true",
      "ALLOW_SECRET_OPERATOR_INJECTION=true",
      "ALLOW_RESTORE=false",
      "ALLOW_PRODUCTION_RESTORE=false",
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

  it("records blocked operator secret injection result", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "operator_supplied_db_url_present=false",
      "operator_supplied_db_url_used=false",
      "DB URL value not recorded",
      "backup_export_status=blocked_operator_secret_not_injected",
      "backup_export_execution_status=blocked_operator_secret_not_injected"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records no pg_dump database execution, export, artifact, or restore", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "pg_dump_available=true",
      "pg_dump_version_check=ok",
      "backup_dir_ready=true",
      "backup_dir_outside_repo=true",
      "pg_dump executed=false",
      "pg_dump connection attempted=false",
      "DB export performed=false",
      "backup artifact created=false",
      "backup_artifact_path_recorded=false",
      "backup_artifact_size_bytes=not_recorded",
      "backup_artifact_sha256_recorded=false",
      "backup_artifact_contents_displayed=false",
      "backup_artifact_committed_to_repo=false",
      "backup_artifact_uploaded_to_chat=false",
      "restore performed=false",
      "production_restore_performed=false",
      "non_production_restore_performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records safety evidence and no runtime changes", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "api_direct_8788_health_status=200",
      "https_api_health_status=200",
      "https_admin_root_status=200",
      "https_admin_customers_status=200",
      "https_admin_api_no_header_customers_status=401",
      "https_line_invalid_signature_status=401",
      "runtime_changes_performed=false",
      "additional_line_send_performed=false",
      "openai_api_performed=false",
      "nginx_dns_certbot_changes=false",
      "supabase_write_migration_rls_changes=false",
      "Supabase CLI/API called=false",
      "secrets_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("updates Obsidian and development logs", () => {
    expect(readText(resolve("OBSIDIAN.md"))).toContain(
      "Loop 201 Supabase backup export controlled execution"
    );
    expect(readText(resolve("docs/16_obsidian/obsidian_link_map.md"))).toContain(
      "Loop 201 Supabase Backup Export Controlled Execution"
    );
    expect(readText(resolve("docs/16_obsidian/README.md"))).toContain(
      "Loop 201 Supabase backup export controlled execution"
    );
    expect(readText(resolve("docs/14_dev_logs/2026-06-28.md"))).toContain(
      "Loop 201: Supabase backup export controlled execution"
    );
  });

  it("sets the next loop to operator secret injection retry", () => {
    const combined = readCombined(docsToCheck);
    expect(combined).toContain("Loop 201.1: Supabase backup export operator secret injection retry");
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
