import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const taskDocPath =
  "docs/11_codex_tasks/202_pg_dump_17_client_boundary_and_backup_mismatch_runbook.md";
const runbookPath = "docs/15_runbooks/pg_dump_17_client_boundary_and_backup_mismatch.md";
const docsToCheck = [
  taskDocPath,
  runbookPath,
  "README.md",
  "docs/00_index.md",
  "docs/08_dev_loop.md",
  "docs/14_dev_logs/2026-06-29.md",
  "docs/16_obsidian/README.md",
  "docs/16_obsidian/obsidian_link_map.md",
  "docs/15_runbooks/production_backup_automation_plan.md",
  "docs/15_runbooks/supabase_backup_export_controlled_execution.md"
];

describe("Loop 202 pg_dump 17 client boundary and backup mismatch runbook", () => {
  it("adds the task doc and runbook", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records the pg_dump server version mismatch category", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "pg_dump_failure_categories=pg_dump_server_version_mismatch",
      "detected_server_major_or_version=17.6",
      "detected_pg_dump_major_or_version=16.14",
      "raw_log_not_displayed=true",
      "secrets_recorded=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("blocks retry until PostgreSQL 17 client is available", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "pg_dump_17_client_required=true",
      "pg_dump_16_retry_allowed=false",
      "backup_export_retry_before_pg_dump_17=false",
      "postgresql_client_17_installation_performed=false",
      "Loop 203: PostgreSQL 17 client installation preflight"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records no export, artifact, restore, runtime, or external API work", () => {
    const combined = readCombined(docsToCheck);

    for (const expected of [
      "pg_dump reexecuted=false",
      "DB export performed=false",
      "backup artifact created=false",
      "backup_artifact_contents_displayed=false",
      "restore performed=false",
      "production_restore_performed=false",
      "runtime_changes_performed=false",
      "additional_line_send_performed=false",
      "openai_api_performed=false",
      "nginx_dns_certbot_changes=false",
      "supabase_write_migration_rls_changes=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("updates index, README, Obsidian, and dev loop docs", () => {
    expect(readText(resolve("README.md"))).toContain(
      "Loop 202 pg_dump 17 client boundary and backup mismatch runbook"
    );
    expect(readText(resolve("docs/00_index.md"))).toContain(
      "Loop 202 pg_dump 17 client boundary"
    );
    expect(readText(resolve("docs/08_dev_loop.md"))).toContain(
      "Loop 202 pg_dump 17 client boundary"
    );
    expect(readText(resolve("docs/16_obsidian/README.md"))).toContain(
      "Loop 202 pg_dump 17 client boundary"
    );
    expect(readText(resolve("docs/16_obsidian/obsidian_link_map.md"))).toContain(
      "Loop 202 pg_dump 17 Client Boundary"
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
