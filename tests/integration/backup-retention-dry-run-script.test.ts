import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  formatBackupRetentionResult,
  runBackupRetentionDryRun,
  sanitizeForBackupRetention
} from "../../scripts/backup/backup-retention-dry-run";

const root = process.cwd();
const scriptPath = "scripts/backup/backup-retention-dry-run.ts";
const createdDirs: string[] = [];

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function createFixtureBackupDir(): string {
  const fixtureBase = join(root, "tmp/backup-retention-dry-run-tests");
  mkdirSync(fixtureBase, { recursive: true });
  const fixtureRoot = mkdtempSync(join(fixtureBase, "case-"));
  const backupDir = join(fixtureRoot, "backups");
  createdDirs.push(fixtureRoot);
  mkdirSync(backupDir, { recursive: true });

  return backupDir;
}

function createArtifact(backupDir: string, name: string, ageMinutes: number): void {
  const artifactPath = join(backupDir, name);
  writeFileSync(artifactPath, `fixture ${name}\n`);
  const mtime = new Date(Date.UTC(2026, 5, 28, 10, 0 - ageMinutes, 0));
  utimesSync(artifactPath, mtime, mtime);
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

describe("Loop 190 backup retention dry-run script", () => {
  it("exists and is dry-run/read-only by default", () => {
    const source = read(scriptPath);

    expect(source).toContain("runBackupRetentionDryRun");
    expect(source).toContain("deletePerformed: false");
    expect(source).toContain("retentionEnforced: false");
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

  it("does not contain destructive, backup creation, export, secret-copy, restart, Nginx, or certificate command strings", () => {
    const source = read(scriptPath);
    const forbidden = [
      new RegExp(`\\b${"rm"}\\s`, "u"),
      new RegExp(`find -${"delete"}`, "u"),
      new RegExp(`${"unlink"}`, "u"),
      new RegExp(`${"truncate"}`, "u"),
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

  it("keeps newest artifacts and routes older non-milestones to review without delete candidates", async () => {
    const backupDir = createFixtureBackupDir();
    createArtifact(backupDir, "release-001.tar", 7);
    createArtifact(backupDir, "release-002.tar", 6);
    createArtifact(backupDir, "release-003.tar", 5);
    createArtifact(backupDir, "release-004.tar", 4);
    createArtifact(backupDir, "release-005.tar", 3);
    createArtifact(backupDir, "release-006.tar", 2);
    createArtifact(backupDir, "release-007.tar", 1);

    const result = await runBackupRetentionDryRun({
      backupDir,
      keepLatest: 5
    });
    const output = formatBackupRetentionResult(result, "text");

    expect(result.backupRetentionDryRun).toBe("completed");
    expect(result.backupDirExists).toBe(true);
    expect(result.backupArtifactCount).toBe(7);
    expect(result.keepLatestPolicy).toBe(5);
    expect(result.keepCount).toBe(5);
    expect(result.reviewCount).toBe(2);
    expect(result.deleteCandidateCount).toBe(0);
    expect(result.flags.deletePerformed).toBe(false);
    expect(result.flags.retentionEnforced).toBe(false);
    expect(output).toContain("backup_retention_dry_run=completed");
    expect(output).toContain("backup_dir_exists=true");
    expect(output).toContain("backup_artifact_count=7");
    expect(output).toContain("keep_count=5");
    expect(output).toContain("review_count=2");
    expect(output).toContain("delete_candidate_count=0");
    expect(output).toContain("delete_performed=false");
    expect(output).toContain("retention_enforced=false");
  });

  it("keeps milestone-like artifacts beyond the newest policy", async () => {
    const backupDir = createFixtureBackupDir();
    createArtifact(backupDir, "release-001.tar", 5);
    createArtifact(backupDir, "release-002.tar", 4);
    createArtifact(backupDir, "release-003.tar", 3);
    createArtifact(backupDir, "release-004.tar", 2);
    createArtifact(backupDir, "release-005.tar", 1);
    createArtifact(backupDir, "pre-activation-snapshot.tar", 6);

    const result = await runBackupRetentionDryRun({
      backupDir,
      keepLatest: 3
    });
    const milestone = result.artifacts.find((artifact) => artifact.safeName === "pre-activation-snapshot.tar");

    expect(result.keepCount).toBe(4);
    expect(result.reviewCount).toBe(2);
    expect(result.deleteCandidateCount).toBe(0);
    expect(milestone?.decision).toBe("keep");
    expect(milestone?.reason).toMatch(/milestone_keyword/u);
  });

  it("redacts secret-shaped artifact names and formatted lines", async () => {
    const backupDir = createFixtureBackupDir();
    createArtifact(backupDir, "safe-release.tar", 2);
    createArtifact(backupDir, "secret-token.env", 1);

    const result = await runBackupRetentionDryRun({ backupDir, keepLatest: 1 });
    const output = formatBackupRetentionResult(result, "text");

    expect(output).toContain("safe-release.tar");
    expect(output).toContain("<redacted-name>");
    expect(output).not.toContain("secret-token.env");
  });

  it("runs through the CLI entrypoint and exits 0 when the proposal is generated", () => {
    const backupDir = createFixtureBackupDir();
    createArtifact(backupDir, "release-a.tar", 3);
    createArtifact(backupDir, "release-b.tar", 2);
    createArtifact(backupDir, "release-c.tar", 1);

    const result = spawnSync(
      join(root, "node_modules/.bin/tsx"),
      [scriptPath, "--dry-run", "--backup-dir", backupDir, "--keep-latest", "2"],
      {
        cwd: root,
        encoding: "utf8"
      }
    );
    const output = result.stdout;

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("Top-level await");
    expect(output).toContain("backup_retention_dry_run=completed");
    expect(output).toContain("backup_dir_exists=true");
    expect(output).toContain("backup_artifact_count=3");
    expect(output).toContain("keep_count=2");
    expect(output).toContain("review_count=1");
    expect(output).toContain("delete_candidate_count=0");
    expect(output).toContain("delete_performed=false");
    expect(output).toContain("retention_enforced=false");
    expect(output).toContain("next_safe_step=Loop 191: Supabase backup method selection");
  }, 10000);

  it("redacts secret-shaped strings from arbitrary output", () => {
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
    const redacted = sanitizeForBackupRetention(sample);

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
