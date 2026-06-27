import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  loopTask: "docs/11_codex_tasks/140_https_review_checklist.md",
  runbook: "docs/15_runbooks/https_review_checklist.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  httpsEnableRunbook: "docs/15_runbooks/http01_https_enable_and_rollback.md",
  lineRunbook: "docs/15_runbooks/line_webhook_production_url_dry_run_checklist.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-26.md"
};

describe("Loop 140 HTTPS review checklist docs", () => {
  it("adds the Loop 140 task doc and HTTPS review runbook", () => {
    expect(existsSync(resolve(paths.loopTask))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records HTTPS route and HTTP redirect review results", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.readiness, paths.devLog]);

    for (const expected of [
      "https_root=200",
      "https_login=200",
      "https_select_tenant=200",
      "https_customers=200",
      "https_alerts=200",
      "https_api_health=200",
      "http_root_redirect=302 https://admin.taiyolabel.site/",
      "http_login_redirect=302 https://admin.taiyolabel.site/login"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records certificate review, HSTS disabled, and read-only VPS status", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.readiness]);

    for (const expected of [
      "certificate_subject=CN=admin.taiyolabel.site",
      "certificate_issuer=Let's Encrypt YE1",
      "certificate_not_before=Jun 27 03:56:29 2026 GMT",
      "certificate_not_after=Sep 25 03:56:28 2026 GMT",
      "hsts_enabled=no",
      "nginx_test=success",
      "sites_enabled=present",
      "certificate_fullchain_exists=yes",
      "certificate_private_key_presence_checked=yes",
      "api_direct_health=200",
      "admin_direct_login=200"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps the review URL No-Go for production and documents remaining gates", () => {
    const combined = readCombined([
      paths.loopTask,
      paths.runbook,
      paths.readiness,
      paths.lineRunbook,
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
    expect(combined).toContain("line_webhook_registration=not_done");
  });

  it("records that no mutable infrastructure or external integrations were changed", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.readiness, paths.httpsEnableRunbook]);

    for (const expected of [
      "dns_change=no",
      "certbot_rerun=no",
      "nginx_config_change=no",
      "nginx_reload_restart=no",
      "line_webhook_registration=no",
      "line_real_push=no",
      "openai_real_api=no",
      "supabase_real_connection=no",
      "production_secret_injection=no",
      "env_display_or_mutation=no",
      "private_key_content_displayed=no"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record email addresses, obvious secrets, database URLs, bearer tokens, or private key paths", () => {
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

    expect(combined).toContain("Project owner email configured; value not recorded");

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
