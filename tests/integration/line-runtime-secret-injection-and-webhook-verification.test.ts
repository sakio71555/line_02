import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  loopTask: "docs/11_codex_tasks/143_line_runtime_secret_injection_and_webhook_verification.md",
  runbook: "docs/15_runbooks/line_runtime_secret_injection_and_webhook_verification.md",
  manualGate: "docs/15_runbooks/line_webhook_registration_manual_gate.md",
  dryRun: "docs/15_runbooks/line_webhook_production_dry_run.md",
  lineChecklist: "docs/15_runbooks/line_webhook_production_url_dry_run_checklist.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-27.md"
};

describe("Loop 143 LINE runtime secret injection and webhook verification docs", () => {
  it("adds the Loop 143 task doc and runtime injection runbook", () => {
    expect(existsSync(resolve(paths.loopTask))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records the correct LINE runtime env names without using the old webhook env name", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.devLog]);

    expect(combined).toContain("LINE_CHANNEL_SECRET");
    expect(combined).toContain("LINE_CHANNEL_ACCESS_TOKEN");
    expect(combined).toContain("LINE_WEBHOOK_SECRET_PATH");
    expect(combined).toContain("LINE_REAL_PUSH_ENABLED=false");
    expect(combined).toContain("`LINE_WEBHOOK_SECRET` is not the runtime env name");
  });

  it("records configured secrets without recording values", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.devLog]);

    for (const expected of [
      "LINE_CHANNEL_SECRET configured; value not recorded",
      "LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded",
      "LINE_WEBHOOK_SECRET_PATH configured; value not recorded",
      "secret_values_entered_outside_codex=yes",
      "actual_webhookSecretPath=not_recorded"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records the failed API health after line runtime drop-in and rollback recovery", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.readiness, paths.devLog]);

    for (const expected of [
      "dropin_added=yes",
      "api_service_restart_attempted=yes",
      "api_service_active_after_restart=active",
      "api_direct_health_after_line_runtime=000",
      "api_direct_health_after_line_runtime_result=failed",
      "dropin_removed=yes",
      "api_service_restart_after_rollback=success",
      "api_direct_health_after_rollback=200",
      "https_api_health_after_rollback=200",
      "api_environment_files_after_rollback=/etc/amami-line-crm/api.env only"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not proceed to actual webhook dry-run or LINE Developers verification", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.readiness, paths.devLog]);

    expect(combined).toContain("actual_webhook_invalid_signature_dry_run_result=not_performed");
    expect(combined).toContain("line_developers_verification_result=not_performed");
    expect(combined).toContain("webhook_verification_proceeded=no");
  });

  it("keeps production readiness No-Go and records remaining gates", () => {
    const combined = readCombined([
      paths.loopTask,
      paths.runbook,
      paths.manualGate,
      paths.dryRun,
      paths.lineChecklist,
      paths.readiness,
      paths.readme,
      paths.devLoop,
      paths.devLog
    ]);

    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).toContain("LINE real push/reply is not approved");
    expect(combined).toContain("Supabase real connection has not executed");
    expect(combined).toContain("OpenAI real API has not executed");
    expect(combined).toContain("Production secret injection is not complete");
  });

  it("does not record obvious secret assignments, token values, database URLs, email addresses, private key paths, or a production go flag", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"),
      new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
      new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
      new RegExp(envAssignment("LINE_WEBHOOK_SECRET")),
      new RegExp(envAssignment("OPENAI_API_KEY")),
      new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
      new RegExp(envAssignment("SUPABASE_DB_URL")),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("postgresql" + "://", "i"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("priv" + "key\\.pem"),
      new RegExp("production" + "_go")
    ];

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(repoRoot, relativePath);
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readFileSync(resolve(relativePath), "utf8")).join("\n");
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
