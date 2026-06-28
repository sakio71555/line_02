#!/usr/bin/env tsx
import { access, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

type OutputMode = "text" | "json";
type InventoryStatus = "completed" | "degraded" | "failed";

type PathCheck = {
  label: string;
  exists: boolean;
};

type BackupDirectoryInventory = {
  label: string;
  exists: boolean;
  artifactCount: number;
  totalBytes: number;
  recentArtifactNames: string[];
};

type BackupInventoryResult = {
  backupInventoryDryRun: InventoryStatus;
  exitCode: 0 | 1 | 2;
  flags: {
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
  repoChecks: PathCheck[];
  runtimeConfigChecks: PathCheck[];
  helperChecks: PathCheck[];
  backupDirectories: BackupDirectoryInventory[];
};

type CliOptions = {
  outputMode: OutputMode;
  activeAppDir: string;
  backupDirs: string[];
  repoRoot: string;
};

const DEFAULT_ACTIVE_APP_DIR = "/var/www/amami-line-crm";
const DEFAULT_BACKUP_DIRS = [
  "/root/deploy-backups/amami-line-crm",
  "/var/backups/amami-line-crm",
  "/var/lib/amami-line-crm/backups"
];

const DEFAULT_RUNTIME_PATHS = [
  { label: "systemd_api_unit_path", path: "/etc/systemd/system/amami-line-crm-api.service" },
  { label: "systemd_admin_unit_path", path: "/etc/systemd/system/amami-line-crm-admin.service" },
  { label: "systemd_api_dropin_dir", path: "/etc/systemd/system/amami-line-crm-api.service.d" },
  { label: "openai_dropin", path: "/etc/systemd/system/amami-line-crm-api.service.d/40-openai-runtime.conf" },
  { label: "api_env_file_path", path: "/etc/amami-line-crm/api.env" },
  { label: "line_runtime_env_file_path", path: "/etc/amami-line-crm/line-runtime.env" },
  { label: "supabase_runtime_env_file_path", path: "/etc/amami-line-crm/supabase-runtime.env" },
  { label: "openai_runtime_env_file_path", path: "/etc/amami-line-crm/openai-runtime.env" }
];

const DEFAULT_HELPER_PATHS = [
  { label: "line_disable_helper", path: "/root/bin/amami-line-disable-line-real-push.sh" },
  { label: "line_enable_helper", path: "/root/bin/amami-line-set-line-real-push-flag.sh" },
  { label: "monitoring_dry_run_script", path: "scripts/monitoring/production-monitoring-dry-run.ts" }
];

const DEFAULT_REPO_PATHS = [
  { label: "readme", path: "README.md" },
  { label: "package_json", path: "package.json" },
  { label: "backup_plan_task_doc", path: "docs/11_codex_tasks/188_production_backup_automation_plan.md" },
  { label: "production_backup_runbook", path: "docs/15_runbooks/production_backup_automation_plan.md" },
  { label: "production_readiness_runbook", path: "docs/15_runbooks/production_readiness_final.md" }
];

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

export async function runBackupInventoryDryRun(
  options: Partial<CliOptions> = {}
): Promise<BackupInventoryResult> {
  const merged: CliOptions = {
    outputMode: options.outputMode ?? "text",
    activeAppDir: options.activeAppDir ?? DEFAULT_ACTIVE_APP_DIR,
    backupDirs: options.backupDirs ?? DEFAULT_BACKUP_DIRS,
    repoRoot: options.repoRoot ?? process.cwd()
  };

  const repoChecks = await Promise.all([
    pathCheck("active_app_dir", merged.activeAppDir),
    ...DEFAULT_REPO_PATHS.map((target) => pathCheck(target.label, path.join(merged.repoRoot, target.path)))
  ]);
  const runtimeConfigChecks = await Promise.all(DEFAULT_RUNTIME_PATHS.map((target) => pathCheck(target.label, target.path)));
  const helperChecks = await Promise.all(
    DEFAULT_HELPER_PATHS.map((target) =>
      pathCheck(target.label, path.isAbsolute(target.path) ? target.path : path.join(merged.repoRoot, target.path))
    )
  );
  const backupDirectories = await Promise.all(
    merged.backupDirs.map((backupDir, index) => backupDirectoryInventory(`backup_dir_${index + 1}`, backupDir))
  );

  const criticalChecks = [
    repoChecks.find((check) => check.label === "active_app_dir"),
    repoChecks.find((check) => check.label === "readme"),
    repoChecks.find((check) => check.label === "package_json"),
    repoChecks.find((check) => check.label === "production_backup_runbook")
  ].filter(Boolean) as PathCheck[];

  const hasCriticalFailure = criticalChecks.some((check) => !check.exists);
  const hasBackupDirectory = backupDirectories.some((backupDir) => backupDir.exists);
  const hasDegraded = !hasBackupDirectory || runtimeConfigChecks.some((check) => !check.exists);
  const backupInventoryDryRun = hasCriticalFailure ? "failed" : hasDegraded ? "degraded" : "completed";

  return {
    backupInventoryDryRun,
    exitCode: backupInventoryDryRun === "completed" ? 0 : backupInventoryDryRun === "degraded" ? 1 : 2,
    flags: {
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
    },
    repoChecks,
    runtimeConfigChecks,
    helperChecks,
    backupDirectories
  };
}

export function formatBackupInventoryResult(result: BackupInventoryResult, outputMode: OutputMode): string {
  if (outputMode === "json") {
    return `${JSON.stringify(
      {
        backup_inventory_dry_run: result.backupInventoryDryRun,
        exit_status: result.exitCode,
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
        repo_checks: result.repoChecks,
        runtime_config_checks: result.runtimeConfigChecks,
        helper_checks: result.helperChecks,
        backup_directories: result.backupDirectories
      },
      null,
      2
    )}\n`;
  }

  const lines = [
    `backup_inventory_dry_run=${result.backupInventoryDryRun}`,
    `exit_status=${result.exitCode}`,
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
    ...result.repoChecks.map((check) => `${check.label}_exists=${String(check.exists)}`),
    "runtime_config_paths_checked=true",
    ...result.runtimeConfigChecks.map((check) => `${check.label}_exists=${String(check.exists)}`),
    ...result.helperChecks.map((check) => `${check.label}_exists=${String(check.exists)}`),
    ...result.backupDirectories.flatMap((backupDir) => [
      `${backupDir.label}_exists=${String(backupDir.exists)}`,
      `${backupDir.label}_artifact_count=${backupDir.artifactCount}`,
      `${backupDir.label}_total_bytes=${backupDir.totalBytes}`,
      `${backupDir.label}_recent_artifact_names=${backupDir.recentArtifactNames.join(",") || "none"}`
    ])
  ];

  return `${lines.map(sanitizeForBackupInventory).join("\n")}\n`;
}

export function sanitizeForBackupInventory(input: string): string {
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
    activeAppDir: DEFAULT_ACTIVE_APP_DIR,
    backupDirs: [...DEFAULT_BACKUP_DIRS],
    repoRoot: process.cwd()
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

    if (token === "--active-app-dir") {
      options.activeAppDir = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token === "--backup-dir") {
      options.backupDirs.push(requireValue(argv, index, token));
      index += 1;
      continue;
    }

    if (token === "--repo-root") {
      options.repoRoot = requireValue(argv, index, token);
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

async function pathCheck(label: string, targetPath: string): Promise<PathCheck> {
  return {
    label,
    exists: await exists(targetPath)
  };
}

async function backupDirectoryInventory(label: string, targetPath: string): Promise<BackupDirectoryInventory> {
  if (!(await exists(targetPath))) {
    return {
      label,
      exists: false,
      artifactCount: 0,
      totalBytes: 0,
      recentArtifactNames: []
    };
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  const stats = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(targetPath, entry.name);
      const entryStat = await stat(fullPath);

      return {
        name: sanitizeArtifactName(entry.name),
        size: entryStat.isFile() ? entryStat.size : 0,
        mtimeMs: entryStat.mtimeMs
      };
    })
  );
  const sorted = stats.sort((left, right) => right.mtimeMs - left.mtimeMs);

  return {
    label,
    exists: true,
    artifactCount: entries.length,
    totalBytes: sorted.reduce((total, entry) => total + entry.size, 0),
    recentArtifactNames: sorted.slice(0, 5).map((entry) => entry.name)
  };
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

function printUsage(): void {
  process.stdout.write(`backup inventory dry-run

Usage:
  npx pnpm@10.12.1 exec tsx scripts/backup/backup-inventory-dry-run.ts --dry-run

Options:
  --json
  --active-app-dir <path>
  --backup-dir <path>
  --repo-root <path>

This script is read-only. It inventories path existence and backup counts only.
It does not create backups, export databases, copy secret files, install timers,
change runtime, send LINE messages, call OpenAI, or touch Nginx/DNS/certificate tooling.
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await runBackupInventoryDryRun(options);
    process.stdout.write(formatBackupInventoryResult(result, options.outputMode));
    process.exit(result.exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`backup_inventory_dry_run_error=${sanitizeForBackupInventory(message)}\n`);
    process.exit(2);
  }
}
