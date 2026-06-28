#!/usr/bin/env tsx
import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";

type OutputMode = "text" | "json";
type RetentionStatus = "completed" | "degraded" | "failed";
type RetentionDecision = "keep" | "review" | "delete_candidate";

type RetentionArtifact = {
  safeName: string;
  sizeBytes: number;
  mtimeIso: string;
  rank: number;
  decision: RetentionDecision;
  reason: string;
};

type BackupRetentionResult = {
  backupRetentionDryRun: RetentionStatus;
  exitCode: 0 | 1 | 2;
  backupDir: string;
  backupDirExists: boolean;
  backupArtifactCount: number;
  keepLatestPolicy: number;
  keepCount: number;
  reviewCount: number;
  deleteCandidateCount: number;
  artifacts: RetentionArtifact[];
  flags: {
    deletePerformed: false;
    retentionEnforced: false;
    backupJobCreated: false;
    dbExportPerformed: false;
    secretFileCopied: false;
    envValuesDisplayed: false;
    supabaseExportPerformed: false;
    timerCreated: false;
    secretsRecorded: false;
    runtimeChangesPerformed: false;
    additionalLineSendPerformed: false;
    openAiApiPerformed: false;
  };
};

type CliOptions = {
  outputMode: OutputMode;
  backupDir: string;
  keepLatest: number;
};

const DEFAULT_BACKUP_DIR = "/root/deploy-backups/amami-line-crm";
const DEFAULT_KEEP_LATEST = 5;
const NEXT_SAFE_STEP = "Loop 191: Supabase backup method selection";

const secretNames = [
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_WEBHOOK_SECRET_PATH",
  "LINE_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
  "DATABASE_URL"
];

const milestoneKeywords = [
  "pre",
  "activation",
  "final",
  "closeout",
  "production-go",
  "prod-go",
  "go-live",
  "stable",
  "rollback-point",
  "milestone"
];

export async function runBackupRetentionDryRun(
  options: Partial<CliOptions> = {}
): Promise<BackupRetentionResult> {
  const backupDir = options.backupDir ?? DEFAULT_BACKUP_DIR;
  const keepLatest = options.keepLatest ?? DEFAULT_KEEP_LATEST;

  if (!Number.isInteger(keepLatest) || keepLatest < 1) {
    return emptyResult({
      backupRetentionDryRun: "failed",
      exitCode: 2,
      backupDir,
      backupDirExists: false,
      keepLatest
    });
  }

  if (!(await exists(backupDir))) {
    return emptyResult({
      backupRetentionDryRun: "degraded",
      exitCode: 1,
      backupDir,
      backupDirExists: false,
      keepLatest
    });
  }

  const entries = await readdir(backupDir, { withFileTypes: true });
  const artifactStats = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(backupDir, entry.name);
      const entryStat = await stat(entryPath);

      return {
        name: sanitizeArtifactName(entry.name),
        sizeBytes: entryStat.isFile() ? entryStat.size : 0,
        mtimeMs: entryStat.mtimeMs
      };
    })
  );
  const sorted = artifactStats.sort((left, right) => right.mtimeMs - left.mtimeMs);
  const artifacts = sorted.map((artifact, index): RetentionArtifact => {
    const rank = index + 1;
    const milestoneReason = milestoneReasonFor(artifact.name);

    if (rank <= keepLatest) {
      return {
        safeName: artifact.name,
        sizeBytes: artifact.sizeBytes,
        mtimeIso: new Date(artifact.mtimeMs).toISOString(),
        rank,
        decision: "keep",
        reason: "newest_keep_latest_policy"
      };
    }

    if (milestoneReason) {
      return {
        safeName: artifact.name,
        sizeBytes: artifact.sizeBytes,
        mtimeIso: new Date(artifact.mtimeMs).toISOString(),
        rank,
        decision: "keep",
        reason: milestoneReason
      };
    }

    return {
      safeName: artifact.name,
      sizeBytes: artifact.sizeBytes,
      mtimeIso: new Date(artifact.mtimeMs).toISOString(),
      rank,
      decision: "review",
      reason: "older_non_milestone_review_required"
    };
  });

  const keepCount = artifacts.filter((artifact) => artifact.decision === "keep").length;
  const reviewCount = artifacts.filter((artifact) => artifact.decision === "review").length;
  const deleteCandidateCount = artifacts.filter((artifact) => artifact.decision === "delete_candidate").length;

  return {
    backupRetentionDryRun: "completed",
    exitCode: 0,
    backupDir,
    backupDirExists: true,
    backupArtifactCount: entries.length,
    keepLatestPolicy: keepLatest,
    keepCount,
    reviewCount,
    deleteCandidateCount,
    artifacts,
    flags: falseFlags()
  };
}

export function formatBackupRetentionResult(result: BackupRetentionResult, outputMode: OutputMode): string {
  if (outputMode === "json") {
    return `${JSON.stringify(
      {
        backup_retention_dry_run: result.backupRetentionDryRun,
        exit_status: result.exitCode,
        backup_dir_exists: result.backupDirExists,
        backup_artifact_count: result.backupArtifactCount,
        keep_latest_policy: result.keepLatestPolicy,
        keep_count: result.keepCount,
        review_count: result.reviewCount,
        delete_candidate_count: result.deleteCandidateCount,
        delete_performed: result.flags.deletePerformed,
        retention_enforced: result.flags.retentionEnforced,
        backup_job_created: result.flags.backupJobCreated,
        db_export_performed: result.flags.dbExportPerformed,
        secret_file_copied: result.flags.secretFileCopied,
        env_values_displayed: result.flags.envValuesDisplayed,
        supabase_export_performed: result.flags.supabaseExportPerformed,
        timer_created: result.flags.timerCreated,
        secrets_recorded: result.flags.secretsRecorded,
        runtime_changes_performed: result.flags.runtimeChangesPerformed,
        additional_line_send_performed: result.flags.additionalLineSendPerformed,
        openai_api_performed: result.flags.openAiApiPerformed,
        next_safe_step: NEXT_SAFE_STEP,
        artifacts: result.artifacts
      },
      null,
      2
    )}\n`;
  }

  const artifactLines = result.artifacts.flatMap((artifact) => [
    `artifact_${artifact.rank}_name=${artifact.safeName}`,
    `artifact_${artifact.rank}_decision=${artifact.decision}`,
    `artifact_${artifact.rank}_reason=${artifact.reason}`,
    `artifact_${artifact.rank}_size_bytes=${artifact.sizeBytes}`,
    `artifact_${artifact.rank}_mtime=${artifact.mtimeIso}`
  ]);

  const lines = [
    `backup_retention_dry_run=${result.backupRetentionDryRun}`,
    `exit_status=${result.exitCode}`,
    `backup_dir_exists=${String(result.backupDirExists)}`,
    `backup_artifact_count=${result.backupArtifactCount}`,
    `keep_latest_policy=${result.keepLatestPolicy}`,
    `keep_count=${result.keepCount}`,
    `review_count=${result.reviewCount}`,
    `delete_candidate_count=${result.deleteCandidateCount}`,
    `delete_performed=${String(result.flags.deletePerformed)}`,
    `retention_enforced=${String(result.flags.retentionEnforced)}`,
    `backup_job_created=${String(result.flags.backupJobCreated)}`,
    `db_export_performed=${String(result.flags.dbExportPerformed)}`,
    `secret_file_copied=${String(result.flags.secretFileCopied)}`,
    `env_values_displayed=${String(result.flags.envValuesDisplayed)}`,
    `supabase_export_performed=${String(result.flags.supabaseExportPerformed)}`,
    `timer_created=${String(result.flags.timerCreated)}`,
    `secrets_recorded=${String(result.flags.secretsRecorded)}`,
    `runtime_changes_performed=${String(result.flags.runtimeChangesPerformed)}`,
    `additional_line_send_performed=${String(result.flags.additionalLineSendPerformed)}`,
    `openai_api_performed=${String(result.flags.openAiApiPerformed)}`,
    `next_safe_step=${NEXT_SAFE_STEP}`,
    ...artifactLines
  ];

  return `${lines.map(sanitizeForBackupRetention).join("\n")}\n`;
}

export function sanitizeForBackupRetention(input: string): string {
  let sanitized = input;

  sanitized = sanitized.replace(/\/api\/line\/webhook\/[A-Za-z0-9._~-]{8,}/g, "/api/line/webhook/<redacted>");
  sanitized = sanitized.replace(/\/line\/webhook\/[A-Za-z0-9._~-]{8,}/g, "/line/webhook/<redacted>");
  sanitized = sanitized.replace(/(userId["':\s=]+)[A-Za-z0-9._-]+/gi, "$1<redacted>");
  sanitized = sanitized.replace(/(replyToken["':\s=]+)[A-Za-z0-9._-]+/gi, "$1<redacted>");
  sanitized = sanitized.replace(/Authorization:\s*Bearer\s+[A-Za-z0-9._-]+/gi, "Authorization: Bearer <redacted>");
  sanitized = sanitized.replace(/sk-[A-Za-z0-9._-]+/g, "sk-<redacted>");
  sanitized = sanitized.replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, "https://<supabase-project>.supabase.co");
  sanitized = sanitized.replace(/postgres(?:ql)?:\/\/\S+/gi, "database_url=<redacted>");
  sanitized = sanitized.replace(
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY[\s\S]*?END (?:RSA |EC |OPENSSH )?PRIVATE KEY/g,
    "PRIVATE KEY <redacted>"
  );

  for (const name of secretNames) {
    sanitized = sanitized.replace(new RegExp(`${name}=\\S+`, "g"), `${name}=<redacted>`);
  }

  return sanitized;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputMode: "text",
    backupDir: DEFAULT_BACKUP_DIR,
    keepLatest: DEFAULT_KEEP_LATEST
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--dry-run") {
      continue;
    }

    if (token === "--json") {
      options.outputMode = "json";
      continue;
    }

    if (token === "--backup-dir") {
      options.backupDir = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token === "--keep-latest") {
      const rawValue = requireValue(argv, index, token);
      const parsedValue = Number.parseInt(rawValue, 10);

      if (!Number.isInteger(parsedValue) || parsedValue < 1) {
        throw new Error(`${token} requires a positive integer`);
      }

      options.keepLatest = parsedValue;
      index += 1;
      continue;
    }

    if (token === "--help" || token === "-h") {
      printUsage();
      process.exit(0);
    }

    throw new Error(`unknown argument: ${token}`);
  }

  return options;
}

function requireValue(argv: string[], index: number, token: string): string {
  const value = argv[index + 1];

  if (!value) {
    throw new Error(`${token} requires a value`);
  }

  return value;
}

function milestoneReasonFor(name: string): string | null {
  const lower = name.toLowerCase();
  const matchedKeyword = milestoneKeywords.find((keyword) => lower.includes(keyword));

  return matchedKeyword ? `milestone_keyword_${matchedKeyword.replace(/[^a-z0-9]+/g, "_")}` : null;
}

function sanitizeArtifactName(name: string): string {
  const basename = path.basename(name);
  const lower = basename.toLowerCase();

  if (lower.includes("secret") || lower.includes("token") || lower.includes("key") || lower.endsWith(".env")) {
    return "<redacted-name>";
  }

  return basename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function emptyResult(input: {
  backupRetentionDryRun: RetentionStatus;
  exitCode: 0 | 1 | 2;
  backupDir: string;
  backupDirExists: boolean;
  keepLatest: number;
}): BackupRetentionResult {
  return {
    backupRetentionDryRun: input.backupRetentionDryRun,
    exitCode: input.exitCode,
    backupDir: input.backupDir,
    backupDirExists: input.backupDirExists,
    backupArtifactCount: 0,
    keepLatestPolicy: input.keepLatest,
    keepCount: 0,
    reviewCount: 0,
    deleteCandidateCount: 0,
    artifacts: [],
    flags: falseFlags()
  };
}

function falseFlags(): BackupRetentionResult["flags"] {
  return {
    deletePerformed: false,
    retentionEnforced: false,
    backupJobCreated: false,
    dbExportPerformed: false,
    secretFileCopied: false,
    envValuesDisplayed: false,
    supabaseExportPerformed: false,
    timerCreated: false,
    secretsRecorded: false,
    runtimeChangesPerformed: false,
    additionalLineSendPerformed: false,
    openAiApiPerformed: false
  };
}

function printUsage(): void {
  process.stdout.write(`backup retention dry-run

Usage:
  npx pnpm@10.12.1 exec tsx scripts/backup/backup-retention-dry-run.ts --dry-run --keep-latest 5

Options:
  --json
  --backup-dir <path>
  --keep-latest <count>

This script is read-only. It proposes keep/review buckets for deploy backup
artifacts and does not create backups, export databases, copy secret files,
install timers, change runtime, send LINE messages, call OpenAI, or touch
Nginx/DNS/certificate tooling.
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await runBackupRetentionDryRun(options);
    process.stdout.write(formatBackupRetentionResult(result, options.outputMode));
    process.exit(result.exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`backup_retention_dry_run_error=${sanitizeForBackupRetention(message)}\n`);
    process.exit(2);
  }
}
