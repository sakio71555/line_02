#!/usr/bin/env tsx
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";

const execFileAsync = promisify(execFile);

const DEFAULT_API_HEALTH_URL = "http://127.0.0.1:8788/health";
const DEFAULT_PUBLIC_BASE_URL = "https://admin.taiyolabel.site";
const DEFAULT_API_SERVICE = "amami-line-crm-api.service";
const DEFAULT_ADMIN_SERVICE = "amami-line-crm-admin.service";
const DEFAULT_SINCE = "60 minutes ago";
const REQUEST_TIMEOUT_MS = 8000;

type OutputMode = "text" | "json";
type CheckStatus = "ok" | "degraded" | "failed" | "skipped";

type CheckResult = {
  label: string;
  status: CheckStatus;
  value: string | number | boolean;
  expected?: string;
};

type RuntimeState = {
  repositoryRuntime: string;
  lineRealPushEnabled: string;
  aiProvider: string;
  openAiDropIn: "present" | "absent";
  webhookSecretPath: string | null;
};

type MonitoringResult = {
  productionMonitoringDryRun: "healthy" | "degraded" | "failed";
  exitCode: 0 | 1 | 2;
  checks: CheckResult[];
  criticalErrorsDetected: boolean;
  secretsRecorded: false;
};

type CliOptions = {
  outputMode: OutputMode;
  since: string;
  apiHealthUrl: string;
  publicBaseUrl: string;
  apiService: string;
  adminService: string;
};

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

export async function runProductionMonitoringDryRun(
  options: Partial<CliOptions> = {}
): Promise<MonitoringResult> {
  const merged: CliOptions = {
    outputMode: options.outputMode ?? "text",
    since: options.since ?? DEFAULT_SINCE,
    apiHealthUrl: options.apiHealthUrl ?? DEFAULT_API_HEALTH_URL,
    publicBaseUrl: trimTrailingSlash(options.publicBaseUrl ?? DEFAULT_PUBLIC_BASE_URL),
    apiService: options.apiService ?? DEFAULT_API_SERVICE,
    adminService: options.adminService ?? DEFAULT_ADMIN_SERVICE
  };

  const checks: CheckResult[] = [];
  const runtime = await readRuntimeState(merged.apiService);

  checks.push(await httpStatusCheck("api_health", merged.apiHealthUrl, [200]));
  checks.push(await httpStatusCheck("https_api_health", `${merged.publicBaseUrl}/api/health`, [200]));
  checks.push(await httpStatusCheck("admin_root", `${merged.publicBaseUrl}/`, [200]));
  checks.push(await httpStatusCheck("admin_customers", `${merged.publicBaseUrl}/customers`, [200]));
  checks.push(
    await httpStatusCheck("admin_api_no_header_customers", `${merged.publicBaseUrl}/api/admin/customers`, [
      401
    ])
  );
  checks.push(await lineInvalidSignatureCheck(merged.publicBaseUrl, runtime.webhookSecretPath));
  checks.push(runtimeCheck("runtime_repository", runtime.repositoryRuntime, "supabase"));
  checks.push(runtimeCheck("runtime_line_real_push_enabled", runtime.lineRealPushEnabled, "true"));
  checks.push(runtimeCheck("runtime_ai_provider", runtime.aiProvider, "openai"));
  checks.push(runtimeCheck("openai_dropin", runtime.openAiDropIn, "present"));

  const apiJournalSummary = await journalSummary("journal_api", merged.apiService, merged.since);
  const adminJournalSummary = await journalSummary("journal_admin", merged.adminService, merged.since);
  const nginxSummary = await nginxLogSummary(merged.since);
  const resourceSummary = await collectResourceSummary();

  checks.push(...apiJournalSummary, ...adminJournalSummary, ...nginxSummary, ...resourceSummary);

  const hasFailed = checks.some((check) => check.status === "failed");
  const hasDegraded = checks.some((check) => check.status === "degraded" || check.status === "skipped");
  const productionMonitoringDryRun = hasFailed ? "failed" : hasDegraded ? "degraded" : "healthy";

  return {
    productionMonitoringDryRun,
    exitCode: productionMonitoringDryRun === "healthy" ? 0 : productionMonitoringDryRun === "degraded" ? 1 : 2,
    checks,
    criticalErrorsDetected: hasFailed,
    secretsRecorded: false
  };
}

export function formatMonitoringResult(result: MonitoringResult, outputMode: OutputMode): string {
  if (outputMode === "json") {
    return `${JSON.stringify(
      {
        production_monitoring_dry_run: result.productionMonitoringDryRun,
        exit_status: result.exitCode,
        critical_errors_detected: result.criticalErrorsDetected,
        secrets_recorded: result.secretsRecorded,
        checks: result.checks
      },
      null,
      2
    )}\n`;
  }

  const lines = [
    `production_monitoring_dry_run=${result.productionMonitoringDryRun}`,
    `exit_status=${result.exitCode}`,
    ...result.checks.map((check) => `${check.label}=${String(check.value)}`),
    `critical_errors_detected=${String(result.criticalErrorsDetected)}`,
    "secrets_recorded=false"
  ];

  return `${lines.map(sanitizeForMonitoring).join("\n")}\n`;
}

export function sanitizeForMonitoring(input: string): string {
  let sanitized = input;

  sanitized = sanitized.replace(/\/api\/line\/webhook\/[A-Za-z0-9._~-]{8,}/g, "/api/line/webhook/<redacted>");
  sanitized = sanitized.replace(/\/line\/webhook\/[A-Za-z0-9._~-]{8,}/g, "/line/webhook/<redacted>");
  sanitized = sanitized.replace(/(userId["':\s=]+)[A-Za-z0-9._-]+/gi, "$1<redacted>");
  sanitized = sanitized.replace(/(replyToken["':\s=]+)[A-Za-z0-9._-]+/gi, "$1<redacted>");
  sanitized = sanitized.replace(/Authorization:\s*Bearer\s+[A-Za-z0-9._-]+/gi, "Authorization: Bearer <redacted>");
  sanitized = sanitized.replace(/sk-[A-Za-z0-9._-]+/g, "sk-<redacted>");
  sanitized = sanitized.replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, "https://<supabase-project>.supabase.co");
  sanitized = sanitized.replace(/postgres(?:ql)?:\/\/\S+/gi, "database_url=<redacted>");
  sanitized = sanitized.replace(/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY[\s\S]*?END (?:RSA |EC |OPENSSH )?PRIVATE KEY/g, "PRIVATE KEY <redacted>");

  for (const name of secretNames) {
    sanitized = sanitized.replace(new RegExp(`${name}=\\S+`, "g"), `${name}=<redacted>`);
  }

  return sanitized;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputMode: "text",
    since: DEFAULT_SINCE,
    apiHealthUrl: DEFAULT_API_HEALTH_URL,
    publicBaseUrl: DEFAULT_PUBLIC_BASE_URL,
    apiService: DEFAULT_API_SERVICE,
    adminService: DEFAULT_ADMIN_SERVICE
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

    if (token === "--since") {
      options.since = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token === "--api-health-url") {
      options.apiHealthUrl = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token === "--public-base-url") {
      options.publicBaseUrl = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token === "--api-service") {
      options.apiService = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token === "--admin-service") {
      options.adminService = requireValue(argv, index, token);
      index += 1;
      continue;
    }

    if (token === "--help" || token === "-h") {
      printUsage();
      process.exit(0);
    }

    throw new Error(`unknown argument: ${token}`);
  }

  options.publicBaseUrl = trimTrailingSlash(options.publicBaseUrl);
  return options;
}

function requireValue(argv: string[], index: number, token: string): string {
  const value = argv[index + 1];

  if (!value) {
    throw new Error(`${token} requires a value`);
  }

  return value;
}

async function httpStatusCheck(label: string, url: string, expectedStatuses: number[]): Promise<CheckResult> {
  try {
    const status = await fetchStatus(url, { method: "GET" });
    return {
      label,
      status: expectedStatuses.includes(status) ? "ok" : "failed",
      value: status,
      expected: expectedStatuses.join("/")
    };
  } catch {
    return {
      label,
      status: "failed",
      value: "request_failed",
      expected: expectedStatuses.join("/")
    };
  }
}

async function lineInvalidSignatureCheck(publicBaseUrl: string, webhookSecretPath: string | null): Promise<CheckResult> {
  if (!webhookSecretPath) {
    return {
      label: "line_invalid_signature",
      status: "degraded",
      value: "skipped_missing_runtime_env",
      expected: "401/400/403"
    };
  }

  try {
    const status = await fetchStatus(`${publicBaseUrl}/api/line/webhook/${encodeURIComponent(webhookSecretPath)}`, {
      body: "{}",
      headers: {
        "content-type": "application/json",
        "x-line-signature": "invalid-signature"
      },
      method: "POST"
    });

    return {
      label: "line_invalid_signature",
      status: [401, 400, 403].includes(status) ? "ok" : "failed",
      value: status,
      expected: "401/400/403"
    };
  } catch {
    return {
      label: "line_invalid_signature",
      status: "failed",
      value: "request_failed",
      expected: "401/400/403"
    };
  }
}

async function fetchStatus(url: string, init: RequestInit): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      redirect: "manual",
      signal: controller.signal
    });
    return response.status;
  } finally {
    clearTimeout(timeout);
  }
}

async function readRuntimeState(apiService: string): Promise<RuntimeState> {
  const env = await readServiceEnvironment(apiService);

  return {
    repositoryRuntime: env.get("REPOSITORY_RUNTIME") ?? "unknown",
    lineRealPushEnabled: env.get("LINE_REAL_PUSH_ENABLED") ?? "unknown",
    aiProvider: env.get("AI_PROVIDER") ?? "unknown",
    openAiDropIn: (await fileExists("/etc/systemd/system/amami-line-crm-api.service.d/30-openai-runtime.conf"))
      ? "present"
      : "absent",
    webhookSecretPath: env.get("LINE_WEBHOOK_SECRET_PATH") ?? null
  };
}

async function readServiceEnvironment(serviceName: string): Promise<Map<string, string>> {
  const mainPidResult = await runCommand("systemctl", ["show", serviceName, "--property=MainPID", "--value"]);
  const mainPid = mainPidResult.stdout.trim();

  if (!/^[1-9][0-9]*$/.test(mainPid)) {
    return new Map();
  }

  try {
    const raw = await readFile(`/proc/${mainPid}/environ`);
    return parseProcessEnv(raw.toString("utf8"));
  } catch {
    return new Map();
  }
}

export function parseProcessEnv(raw: string): Map<string, string> {
  const env = new Map<string, string>();

  for (const entry of raw.split("\0")) {
    const equalsIndex = entry.indexOf("=");

    if (equalsIndex <= 0) {
      continue;
    }

    const key = entry.slice(0, equalsIndex);
    const value = entry.slice(equalsIndex + 1);

    if (/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      env.set(key, value);
    }
  }

  return env;
}

function runtimeCheck(label: string, value: string, expected: string): CheckResult {
  return {
    label,
    status: value === expected ? "ok" : "degraded",
    value: value === expected ? expected : "unexpected",
    expected
  };
}

async function journalSummary(labelPrefix: string, serviceName: string, since: string): Promise<CheckResult[]> {
  const result = await runCommand("journalctl", [
    "-u",
    serviceName,
    "--since",
    since,
    "--no-pager",
    "--output=cat",
    "-n",
    "200"
  ]);

  if (result.exitCode !== 0) {
    return [
      {
        label: `${labelPrefix}_summary`,
        status: "degraded",
        value: "unavailable"
      }
    ];
  }

  return summarizeLog(labelPrefix, result.stdout);
}

async function nginxLogSummary(since: string): Promise<CheckResult[]> {
  const journalResult = await runCommand("journalctl", [
    "-u",
    "nginx",
    "--since",
    since,
    "--no-pager",
    "--output=cat",
    "-n",
    "200"
  ]);
  const errorLog = await readTextIfAccessible("/var/log/nginx/error.log");
  const accessLog = await readTextIfAccessible("/var/log/nginx/access.log");
  const combined = [journalResult.stdout, tailLines(errorLog, 200), tailLines(accessLog, 200)].join("\n");

  return summarizeLog("nginx", combined);
}

function summarizeLog(labelPrefix: string, rawText: string): CheckResult[] {
  const sanitized = sanitizeForMonitoring(rawText);
  const lines = sanitized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const errorLikeCount = lines.filter((line) => /\b(error|exception|failed|failure|fatal|panic)\b/i.test(line)).length;
  const openAiRelatedCount = lines.filter((line) => /\b(openai|ai_provider|provider)\b/i.test(line)).length;
  const lineRelatedCount = lines.filter((line) => /\b(line|webhook|signature)\b/i.test(line)).length;
  const supabaseRelatedCount = lines.filter((line) => /\b(supabase|postgrest|postgres)\b/i.test(line)).length;

  return [
    {
      label: `${labelPrefix}_line_count`,
      status: "ok",
      value: lines.length
    },
    {
      label: `${labelPrefix}_error_like_count`,
      status: errorLikeCount === 0 ? "ok" : "degraded",
      value: errorLikeCount
    },
    {
      label: `${labelPrefix}_openai_related_count`,
      status: "ok",
      value: openAiRelatedCount
    },
    {
      label: `${labelPrefix}_line_related_count`,
      status: "ok",
      value: lineRelatedCount
    },
    {
      label: `${labelPrefix}_supabase_related_count`,
      status: "ok",
      value: supabaseRelatedCount
    }
  ];
}

async function collectResourceSummary(): Promise<CheckResult[]> {
  const load = os.loadavg()[0] ?? 0;
  const memoryUsedPercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  const diskUsedPercent = await diskUsagePercent("/");

  return [
    {
      label: "resource_load_1m",
      status: load < Math.max(2, os.cpus().length * 2) ? "ok" : "degraded",
      value: Number(load.toFixed(2))
    },
    {
      label: "resource_memory_used_percent",
      status: memoryUsedPercent < 90 ? "ok" : "degraded",
      value: memoryUsedPercent
    },
    {
      label: "resource_disk_used_percent",
      status: diskUsedPercent !== null && diskUsedPercent < 90 ? "ok" : "degraded",
      value: diskUsedPercent ?? "unknown"
    }
  ];
}

async function diskUsagePercent(path: string): Promise<number | null> {
  const result = await runCommand("df", ["-P", path]);

  if (result.exitCode !== 0) {
    return null;
  }

  const line = result.stdout.split(/\r?\n/)[1];
  const percent = line?.match(/\s([0-9]{1,3})%\s/);

  if (!percent?.[1]) {
    return null;
  }

  return Number(percent[1]);
}

async function runCommand(command: string, args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync(command, args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: REQUEST_TIMEOUT_MS
    });
    return {
      exitCode: 0,
      stdout: sanitizeForMonitoring(result.stdout),
      stderr: sanitizeForMonitoring(result.stderr)
    };
  } catch (error) {
    if (isExecError(error)) {
      return {
        exitCode: typeof error.code === "number" ? error.code : 1,
        stdout: sanitizeForMonitoring(error.stdout ?? ""),
        stderr: sanitizeForMonitoring(error.stderr ?? "")
      };
    }

    return {
      exitCode: 1,
      stdout: "",
      stderr: "command_failed"
    };
  }
}

function isExecError(error: unknown): error is { code?: number | string; stdout?: string; stderr?: string } {
  return typeof error === "object" && error !== null;
}

async function readTextIfAccessible(path: string): Promise<string> {
  try {
    await access(path, constants.R_OK);
    return sanitizeForMonitoring(await readFile(path, "utf8"));
  } catch {
    return "";
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function tailLines(text: string, maxLines: number): string {
  const lines = text.split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - maxLines)).join("\n");
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function printUsage(): void {
  console.log(`Usage:
  npx pnpm@10.12.1 exec tsx scripts/monitoring/production-monitoring-dry-run.ts [--dry-run] [--json] [--since "60 minutes ago"]

This script is read-only and dry-run by default. It checks API/Admin health,
invalid-signature rejection, sanitized runtime classifications, sanitized log
summaries, and resource summary. It does not change runtime, send LINE messages,
call OpenAI, reload Nginx, create timers, or print secret values.`);
}

function isMainModule(): boolean {
  return import.meta.url === `file://${process.argv[1]}`;
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await runProductionMonitoringDryRun(options);
    process.stdout.write(formatMonitoringResult(result, options.outputMode));
    process.exit(result.exitCode);
  } catch (error) {
    const message = error instanceof Error ? sanitizeForMonitoring(error.message) : "unknown_error";
    console.error(`production_monitoring_dry_run=failed\nerror=${message}\nsecrets_recorded=false`);
    process.exit(2);
  }
}

if (isMainModule()) {
  void main();
}
