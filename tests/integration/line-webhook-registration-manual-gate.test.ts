import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  loopTask: "docs/11_codex_tasks/142_line_webhook_registration_manual_gate.md",
  manualGate: "docs/15_runbooks/line_webhook_registration_manual_gate.md",
  dryRun: "docs/15_runbooks/line_webhook_production_dry_run.md",
  lineChecklist: "docs/15_runbooks/line_webhook_production_url_dry_run_checklist.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-26.md"
};

describe("Loop 142 LINE webhook registration manual gate docs", () => {
  it("adds the Loop 142 task doc and manual gate runbook", () => {
    expect(existsSync(resolve(paths.loopTask))).toBe(true);
    expect(existsSync(resolve(paths.manualGate))).toBe(true);
  });

  it("records the candidate URL pattern without the actual webhook secret path", () => {
    const combined = readCombined([paths.loopTask, paths.manualGate, paths.dryRun, paths.lineChecklist]);

    expect(combined).toContain(
      "candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>"
    );
    expect(combined).toContain("actual_webhook_secret_path_recorded=no");
    expect(combined).toContain("webhook_secret_path_real_value_managed_outside_docs=true");
    expect(combined).toContain("route=/api/line/webhook/:webhookSecret");
    expect(combined).not.toContain("dummy-" + "dry-run-secret");
  });

  it("documents the pre-registration and post-registration manual gate checks", () => {
    const combined = readCombined([paths.loopTask, paths.manualGate, paths.lineChecklist, paths.readiness]);

    for (const expected of [
      "https_ready_for_review=true",
      "line_webhook_ready_for_registration=true",
      "https_api_health=200",
      "line_channel_secret_displayed=no",
      "line_access_token_displayed=no",
      "line_developers_console_verification_result=record_without_secret",
      "api_log_webhook_arrival=confirm_if_secret_safe",
      "invalid_signature_or_secret_mismatch=none_expected",
      "webhook_5xx=none_expected",
      "line_real_push_triggered=no"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents human-only LINE Developers Console steps", () => {
    const combined = readCombined([paths.loopTask, paths.manualGate]);

    for (const expected of [
      "Open LINE Developers Console",
      "Select the target Provider and Messaging API Channel",
      "Open Messaging API settings",
      "Webhook URL field",
      "Turn Webhook usage ON",
      "Press Verify if needed",
      "Check existing response, greeting, and auto-response settings",
      "Do not perform real LINE send testing until a separate"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps production readiness No-Go and records remaining gates", () => {
    const combined = readCombined([
      paths.loopTask,
      paths.manualGate,
      paths.readiness,
      paths.readme,
      paths.devLoop,
      paths.devLog
    ]);

    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).toContain("line_webhook_registration=manual_only_not_done_by_codex");
    expect(combined).toContain("LINE real push is not approved");
    expect(combined).toContain("Supabase real connection has not executed");
    expect(combined).toContain("OpenAI real API has not executed");
    expect(combined).toContain("Production secret injection has not executed");
  });

  it("records that Codex did not make external or runtime changes", () => {
    const combined = readCombined([paths.loopTask, paths.manualGate, paths.lineChecklist, paths.readiness]);

    for (const expected of [
      "line_developers_console_change_by_codex=no",
      "line_webhook_registration_by_codex=no",
      "line_webhook_usage_toggle_by_codex=no",
      "line_api_call=no",
      "line_real_push=no",
      "openai_real_api=no",
      "supabase_real_connection=no",
      "production_secret_injection=no",
      "env_display_or_mutation=no",
      "dns_change=no",
      "certbot_rerun=no",
      "nginx_config_change=no",
      "nginx_reload_restart=no",
      "vps_command_execution=no"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record obvious secrets, token values, database URLs, email addresses, private key paths, or a production go flag", () => {
    const combined = readCombined(Object.values(paths));
    const forbiddenPatterns = [
      new RegExp("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"),
      new RegExp("LINE_CHANNEL_ACCESS" + "_TOKEN=.+"),
      new RegExp("LINE_CHANNEL" + "_SECRET=.+"),
      new RegExp("OPENAI" + "_API_KEY=.+"),
      new RegExp("SUPABASE_SERVICE" + "_ROLE_KEY=.+"),
      new RegExp("SUPABASE" + "_DB_URL=.+"),
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
