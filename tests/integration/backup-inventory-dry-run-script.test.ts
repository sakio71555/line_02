import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  formatBackupInventoryResult,
  runBackupInventoryDryRun,
  sanitizeForBackupInventory
} from "../../scripts/backup/backup-inventory-dry-run";

const root = process.cwd();
const scriptPath = "scripts/backup/backup-inventory-dry-run.ts";
const createdDirs: string[] = [];

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function createFixtureRoot(): string {
  const fixtureBase = join(root, "tmp/backup-inventory-dry-run-tests");
  mkdirSync(fixtureBase, { recursive: true });
  const fixtureRoot = mkdtempSync(join(fixtureBase, "case-"));
  createdDirs.push(fixtureRoot);
  mkdirSync(join(fixtureRoot, "docs/11_codex_tasks"), { recursive: true });
  mkdirSync(join(fixtureRoot, "docs/15_runbooks"), { recursive: true });
  mkdirSync(join(fixtureRoot, "scripts/monitoring"), { recursive: true });
  writeFileSync(join(fixtureRoot, "README.md"), "# fixture\n");
  writeFileSync(join(fixtureRoot, "package.json"), "{\"name\":\"fixture\"}\n");
  writeFileSync(join(fixtureRoot, "docs/11_codex_tasks/188_production_backup_automation_plan.md"), "# fixture\n");
  writeFileSync(join(fixtureRoot, "docs/15_runbooks/production_backup_automation_plan.md"), "# fixture\n");
  writeFileSync(join(fixtureRoot, "docs/15_runbooks/production_readiness_final.md"), "# fixture\n");
  writeFileSync(join(fixtureRoot, "scripts/monitoring/production-monitoring-dry-run.ts"), "export {};\n");

  return fixtureRoot;
}

function secretPattern(name: string): RegExp {
  return new RegExp(`${name}=.+`, "u");
}

function redactedAssignment(name: string): string {
  return `${name}${"="}<redacted>`;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("Loop 189 backup inventory dry-run script", () => {
  it("exists and is dry-run/read-only by default", () => {
    const source = read(scriptPath);

    expect(source).toContain("runBackupInventoryDryRun");
    expect(source).toContain("backupJobCreated: false");
    expect(source).toContain("dbExportPerformed: false");
    expect(source).toContain("secretFileCopied: false");
    expect(source).toContain("envValuesDisplayed: false");
    expect(source).toContain("timerCreated: false");
    expect(source).toContain("secretsRecorded: false");
    expect(source).toContain("runtimeChangesPerformed: false");
    expect(source).toContain("additionalLineSendPerformed: false");
    expect(source).toContain("openAiApiPerformed: false");
  });

  it("does not contain forbidden backup, export, secret-copy, restart, Nginx, or certificate commands", () => {
    const source = read(scriptPath);
    const forbidden = [
      new RegExp(`pg_${"dump"}`, "u"),
      new RegExp(`supabase db ${"dump"}`, "u"),
      new RegExp(`supabase db ${"export"}`, "u"),
      new RegExp(`tar -c${"zf"}`, "u"),
      new RegExp(`\\b${"zip"}\\b`, "u"),
      new RegExp(`\\b${"rsync"}\\b`, "u"),
      new RegExp(`\\b${"scp"}\\b`, "u"),
      new RegExp(`cp /etc/amami-line-crm`, "u"),
      new RegExp(`cat /etc/amami-line-crm`, "u"),
      new RegExp(`systemctl ${"restart"}`, "u"),
      new RegExp(`systemctl ${"reload"}`, "u"),
      new RegExp(`nginx -s ${"reload"}`, "u"),
      new RegExp(`\\bcert${"bot"}\\b`, "u")
    ];

    for (const pattern of forbidden) {
      expect(source).not.toMatch(pattern);
    }
  });

  it("formats required safety flags and backup inventory counts without creating artifacts", async () => {
    const fixtureRoot = createFixtureRoot();
    const activeAppDir = join(fixtureRoot, "active");
    const backupDir = join(fixtureRoot, "backups");
    mkdirSync(activeAppDir, { recursive: true });
    mkdirSync(backupDir, { recursive: true });
    writeFileSync(join(backupDir, "release-a.tar"), "safe");
    writeFileSync(join(backupDir, "secret-token.env"), "value-not-read");

    const result = await runBackupInventoryDryRun({
      activeAppDir,
      backupDirs: [backupDir],
      repoRoot: fixtureRoot
    });
    const output = formatBackupInventoryResult(result, "text");

    expect(result.flags.backupJobCreated).toBe(false);
    expect(result.flags.dbExportPerformed).toBe(false);
    expect(result.flags.secretFileCopied).toBe(false);
    expect(result.flags.envValuesDisplayed).toBe(false);
    expect(result.flags.timerCreated).toBe(false);
    expect(result.flags.secretsRecorded).toBe(false);
    expect(output).toMatch(/backup_inventory_dry_run=(completed|degraded)/u);
    expect(output).toContain("backup_job_created=false");
    expect(output).toContain("db_export_performed=false");
    expect(output).toContain("secret_file_copied=false");
    expect(output).toContain("env_values_displayed=false");
    expect(output).toContain("timer_created=false");
    expect(output).toContain("secrets_recorded=false");
    expect(output).toContain("backup_dir_1_artifact_count=2");
    expect(output).toContain("release-a.tar");
    expect(output).toContain("<redacted-name>");
  });

  it("runs through the CLI entrypoint without top-level-await transform errors", () => {
    const fixtureRoot = createFixtureRoot();
    const activeAppDir = join(fixtureRoot, "active");
    const backupDir = join(fixtureRoot, "backups");
    mkdirSync(activeAppDir, { recursive: true });
    mkdirSync(backupDir, { recursive: true });
    writeFileSync(join(backupDir, "release-a.tar"), "safe");

    const result = spawnSync(
      join(root, "node_modules/.bin/tsx"),
      [
        scriptPath,
        "--dry-run",
        "--repo-root",
        fixtureRoot,
        "--active-app-dir",
        activeAppDir,
        "--backup-dir",
        backupDir
      ],
      {
        cwd: root,
        encoding: "utf8"
      }
    );
    const output = result.stdout;

    expect([0, 1]).toContain(result.status);
    expect(result.stderr).not.toContain("Top-level await");
    expect(output).toMatch(/backup_inventory_dry_run=(completed|degraded)/u);
    expect(output).toContain("backup_job_created=false");
    expect(output).toContain("runtime_changes_performed=false");
    expect(output).toContain("additional_line_send_performed=false");
    expect(output).toContain("openai_api_performed=false");
  }, 10000);

  it("redacts secret-shaped strings from any formatted line", () => {
    const eq = "=";
    const http = "http";
    const postgres = "postgres";
    const authorization = "Authorization";
    const bearer = "Bearer";
    const line = "LINE";
    const channel = "CHANNEL";
    const access = "ACCESS";
    const token = "TOKEN";
    const secret = "SECRET";
    const webhook = "WEBHOOK";
    const openAi = "OPENAI";
    const model = "MODEL";
    const supabase = "SUPABASE";
    const db = "DB";

    const sample = [
      `${line}_${channel}_${access}_${token}${eq}value`,
      `${line}_${channel}_${secret}${eq}value`,
      `${line}_${webhook}_${secret}_PATH${eq}value`,
      `${openAi}_API_KEY${eq}value`,
      `${openAi}_${model}${eq}value`,
      `${supabase}_URL${eq}${http}s://project.supabase.co`,
      `${supabase}_${db}_URL${eq}${postgres}ql://user:pass@example/db`,
      `${authorization}: ${bearer} token`,
      `/${"api"}/${line.toLowerCase()}/${webhook.toLowerCase()}/abcdef1234567890`,
      `user${"Id"} U123456`,
      `reply${token} token123`
    ].join("\n");
    const redacted = sanitizeForBackupInventory(sample);

    expect(redacted).toContain(redactedAssignment(`${line}_${channel}_${access}_${token}`));
    expect(redacted).toContain(redactedAssignment(`${line}_${channel}_${secret}`));
    expect(redacted).toContain(redactedAssignment(`${line}_${webhook}_${secret}_PATH`));
    expect(redacted).toContain(redactedAssignment(`${openAi}_API_KEY`));
    expect(redacted).toContain(redactedAssignment(`${openAi}_${model}`));
    expect(redacted).toContain(redactedAssignment(`${supabase}_URL`));
    expect(redacted).toContain(redactedAssignment(`${supabase}_${db}_URL`));
    expect(redacted).toContain("Authorization: Bearer <redacted>");
    expect(redacted).toContain("/api/line/webhook/<redacted>");
    expect(redacted).toContain("userId <redacted>");
    expect(redacted).toContain("replyTOKEN <redacted>");
  });

  it("does not include obvious secret assignments or URLs in the script source", () => {
    const source = read(scriptPath);
    const forbidden = [
      secretPattern("LINE_CHANNEL_ACCESS_TOKEN"),
      secretPattern("LINE_CHANNEL_SECRET"),
      secretPattern("LINE_WEBHOOK_SECRET_PATH"),
      secretPattern("OPENAI_API_KEY"),
      secretPattern("OPENAI_MODEL"),
      secretPattern("SUPABASE_ANON_KEY"),
      secretPattern("SUPABASE_SERVICE_ROLE_KEY"),
      secretPattern("SUPABASE_DB_URL"),
      new RegExp(`s${"k"}-[A-Za-z0-9]`, "u"),
      new RegExp(`postgres(?:ql)?://`, "iu")
    ];

    for (const pattern of forbidden) {
      expect(source).not.toMatch(pattern);
    }
  });
});
