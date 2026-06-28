import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  formatMonitoringResult,
  parseProcessEnv,
  sanitizeForMonitoring
} from "../../scripts/monitoring/production-monitoring-dry-run";

const repoRoot = process.cwd();

const scriptPath = "scripts/monitoring/production-monitoring-dry-run.ts";

describe("Loop 186 production monitoring dry-run script", () => {
  it("adds the monitoring dry-run script", () => {
    expect(existsSync(resolve(scriptPath))).toBe(true);
  });

  it("is dry-run and read-only by default", () => {
    const script = read(scriptPath);

    for (const expected of [
      "production-monitoring-dry-run",
      "--dry-run",
      "read-only and dry-run by default",
      "runProductionMonitoringDryRun",
      "secretsRecorded: false"
    ]) {
      expect(script).toContain(expected);
    }
  });

  it("does not include runtime-changing commands, LINE send commands, OpenAI calls, or Nginx reload/restart commands", () => {
    const script = read(scriptPath);

    for (const forbidden of [
      "systemctl restart",
      "systemctl reload nginx",
      "systemctl restart nginx",
      "nginx -s reload",
      "certbot",
      "broadcast",
      "multicast",
      "api.openai.com",
      "OPENAI_API_KEY" + "=",
      "LINE_CHANNEL_ACCESS_TOKEN" + "=",
      "SUPABASE_SERVICE_ROLE_KEY" + "="
    ]) {
      expect(script).not.toContain(forbidden);
    }
  });

  it("has expected health, runtime, log, and resource labels", () => {
    const script = read(scriptPath);

    for (const expected of [
      "api_health",
      "https_api_health",
      "admin_root",
      "admin_customers",
      "admin_api_no_header_customers",
      "line_invalid_signature",
      "runtime_repository",
      "runtime_line_real_push_enabled",
      "runtime_ai_provider",
      "openai_dropin",
      "journal_api",
      "nginx",
      "_error_like_count",
      "resource_memory_used_percent",
      "resource_disk_used_percent"
    ]) {
      expect(script).toContain(expected);
    }
  });

  it("redacts webhook suffixes, identifiers, OpenAI values, Supabase values, DB URLs, and bearer tokens", () => {
    const sample = [
      "POST /api/line/webhook/" + "abc1234567890",
      'userId":"U1234567890abcdef"',
      'replyToken":"reply123456"',
      "Authorization: " + "Bearer token123456",
      "OPENAI_API_KEY" + "=" + "sk" + "-secret123456",
      "OPENAI_MODEL" + "=some-model-value",
      "SUPABASE_URL" + "=" + "https://example.supabase.co",
      "SUPABASE_DB_URL" + "=" + "postgresql" + "://user:pass@example/db"
    ].join("\n");
    const sanitized = sanitizeForMonitoring(sample);

    expect(sanitized).toContain("/api/line/webhook/" + "<redacted>");
    expect(sanitized).toContain('userId":"<redacted>"');
    expect(sanitized).toContain('replyToken":"<redacted>"');
    expect(sanitized).toContain("Authorization: " + "Bearer <redacted>");
    expect(sanitized).toContain("OPENAI_API_KEY" + "=<redacted>");
    expect(sanitized).toContain("OPENAI_MODEL" + "=<redacted>");
    expect(sanitized).toContain("SUPABASE_URL" + "=<redacted>");
    expect(sanitized).toContain("SUPABASE_DB_URL" + "=<redacted>");
    expect(sanitized).not.toContain("abc1234567890");
    expect(sanitized).not.toContain("U1234567890abcdef");
    expect(sanitized).not.toContain("reply123456");
    expect(sanitized).not.toContain("sk" + "-secret123456");
    expect(sanitized).not.toContain("some-model-value");
    expect(sanitized).not.toContain("postgresql" + "://");
  });

  it("parses process env without requiring module import side effects", () => {
    const env = parseProcessEnv(
      [
        "REPOSITORY_RUNTIME=supabase",
        "LINE_REAL_PUSH_ENABLED=true",
        "AI_PROVIDER=openai",
        "LINE_WEBHOOK_SECRET_PATH" + "=secret-path-value"
      ].join("\0")
    );

    expect(env.get("REPOSITORY_RUNTIME")).toBe("supabase");
    expect(env.get("LINE_REAL_PUSH_ENABLED")).toBe("true");
    expect(env.get("AI_PROVIDER")).toBe("openai");
    expect(env.get("LINE_WEBHOOK_SECRET_PATH")).toBe("secret-path-value");
  });

  it("formats summarized status without raw secret values", () => {
    const output = formatMonitoringResult(
      {
        checks: [
          { label: "api_health", status: "ok", value: 200 },
          { label: "runtime_repository", status: "ok", value: "supabase" },
          { label: "runtime_line_real_push_enabled", status: "ok", value: "true" },
          { label: "runtime_ai_provider", status: "ok", value: "openai" },
          { label: "openai_dropin", status: "ok", value: "present" }
        ],
        criticalErrorsDetected: false,
        exitCode: 0,
        productionMonitoringDryRun: "healthy",
        secretsRecorded: false
      },
      "text"
    );

    expect(output).toContain("production_monitoring_dry_run=healthy");
    expect(output).toContain("api_health=200");
    expect(output).toContain("runtime_repository=supabase");
    expect(output).toContain("runtime_line_real_push_enabled=true");
    expect(output).toContain("runtime_ai_provider=openai");
    expect(output).toContain("openai_dropin=present");
    expect(output).toContain("secrets_recorded=false");

    for (const pattern of forbiddenPatterns()) {
      expect(output).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(repoRoot, relativePath);
}

function read(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}

function forbiddenPatterns(): RegExp[] {
  return [
    new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
    new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
    new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
    new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
    new RegExp('userId["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp('replyToken["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp(envAssignment("OPENAI_API_KEY")),
    new RegExp(envAssignment("OPENAI_MODEL")),
    new RegExp("sk-" + "[A-Za-z0-9]"),
    new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
    new RegExp("SUPABASE_URL=https?" + "://[^<\\s]+"),
    new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
    new RegExp(envAssignment("SUPABASE_DB_URL")),
    new RegExp("postgresql" + "://", "i")
  ];
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
