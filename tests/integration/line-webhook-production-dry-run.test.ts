import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  loopTask: "docs/11_codex_tasks/141_line_webhook_production_dry_run.md",
  runbook: "docs/15_runbooks/line_webhook_production_dry_run.md",
  lineChecklist: "docs/15_runbooks/line_webhook_production_url_dry_run_checklist.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  httpsReview: "docs/15_runbooks/https_review_checklist.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-26.md"
};

describe("Loop 141 LINE webhook production dry-run docs", () => {
  it("adds the Loop 141 task doc and LINE webhook dry-run runbook", () => {
    expect(existsSync(resolve(paths.loopTask))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records route boundaries and the candidate URL pattern without the actual webhook secret path", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.lineChecklist]);

    expect(combined).toContain("route=/api/line/webhook/:webhookSecret");
    expect(combined).toContain(
      "candidate_line_webhook_url=https://admin.taiyolabel.site/api/line/webhook/<webhookSecretPath>"
    );
    expect(combined).toContain("actual_webhook_secret_path_recorded=no");
    expect(combined).toContain("signature_header=x-line-signature");
    expect(combined).toContain("signature_verification=verifyLineSignature");
    expect(combined).toContain("signature_body=raw request body");
    expect(combined).not.toContain("dummy-" + "dry-run-secret");
  });

  it("records safe dummy rejection statuses and readiness for the manual registration gate", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.lineChecklist, paths.devLog]);

    for (const expected of [
      "https_api_health=200",
      "dummy_invalid_signature_post_status=404",
      "dummy_get_status=404",
      "dummy_empty_post_status=404",
      "dummy_invalid_signature_accepted_2xx=no",
      "dummy_invalid_signature_5xx=no",
      "line_webhook_ready_for_registration=true",
      "line_webhook_registration=not_done"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps production readiness No-Go and documents remaining gates", () => {
    const combined = readCombined([
      paths.loopTask,
      paths.runbook,
      paths.readiness,
      paths.httpsReview,
      paths.readme,
      paths.devLoop,
      paths.devLog
    ]);

    expect(combined).toContain("https_ready_for_review=true");
    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).toContain("LINE webhook is not registered");
    expect(combined).toContain("LINE real push is not approved");
    expect(combined).toContain("Supabase real connection has not executed");
    expect(combined).toContain("OpenAI real API has not executed");
    expect(combined).toContain("Production secret injection has not executed");
  });

  it("records read-only VPS status and no mutable infrastructure changes", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.readiness]);

    for (const expected of [
      "nginx_test=success",
      "public_nginx_listeners=80,443",
      "local_app_listeners=127.0.0.1:3002,127.0.0.1:8788",
      "sites_enabled=present",
      "api_direct_health=200",
      "admin_direct_login=200",
      "dns_change=no",
      "certbot_rerun=no",
      "nginx_config_change=no",
      "nginx_reload_restart=no",
      "line_developers_console_change=no",
      "line_api_call=no",
      "line_real_push=no"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record obvious secrets, token values, database URLs, email addresses, or private key paths", () => {
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
      new RegExp("priv" + "key\\.pem")
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
