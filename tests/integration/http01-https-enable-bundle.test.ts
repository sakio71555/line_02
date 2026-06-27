import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const paths = {
  loopTask: "docs/11_codex_tasks/137_139_http01_https_enable_bundle.md",
  runbook: "docs/15_runbooks/http01_https_enable_and_rollback.md",
  readiness: "docs/15_runbooks/production_readiness_final.md",
  acmeRunbook: "docs/15_runbooks/acme_selected_method_dry_run_plan.md",
  nginxGate: "docs/15_runbooks/real_domain_nginx_enable_approval_gate.md",
  lineRunbook: "docs/15_runbooks/line_webhook_production_url_dry_run_checklist.md",
  approvalRecord: "docs/15_runbooks/domain_and_release_approval_record.md",
  readme: "README.md",
  devLoop: "docs/08_dev_loop.md",
  devLog: "docs/14_dev_logs/2026-06-26.md"
};

describe("Loop 137-139 HTTP-01 HTTPS enable bundle docs", () => {
  it("adds the task doc and HTTPS enable runbook", () => {
    expect(existsSync(resolve(paths.loopTask))).toBe(true);
    expect(existsSync(resolve(paths.runbook))).toBe(true);
  });

  it("records HTTP-01 decision, certbot result, and certificate summary", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.acmeRunbook]);

    expect(combined).toContain("acme_method=HTTP-01");
    expect(combined).toContain("fallback_acme_method=DNS-01 if HTTP-01 fails");
    expect(combined).toContain("certbot_http01_executed=yes");
    expect(combined).toContain("certbot_http01_result=success");
    expect(combined).toContain("certificate_path=/etc/letsencrypt/live/admin.taiyolabel.site/fullchain.pem");
    expect(combined).toContain("certificate_subject=CN=admin.taiyolabel.site");
    expect(combined).toContain("certificate_issuer=Let's Encrypt YE1");
  });

  it("records HTTP and HTTPS smoke, redirect, and HSTS disabled state", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.nginxGate, paths.readiness]);

    for (const expected of [
      "http_root=200",
      "http_login=200",
      "http_customers=200",
      "http_alerts=200",
      "http_api_health=200",
      "http_acme_probe=200",
      "https_root=200",
      "https_login=200",
      "https_customers=200",
      "https_alerts=200",
      "https_api_health=200",
      "http_redirect=302 https://admin.taiyolabel.site/login",
      "hsts_enabled=no",
      "https_ready_for_review=true"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps rollback evidence and production No-Go reasons", () => {
    const combined = readCombined([paths.loopTask, paths.runbook, paths.readiness, paths.devLog]);

    expect(combined).toContain("evidence_dir=/root/deploy-backups/amami-line-crm/loop137-139-20260627-135350");
    expect(combined).toContain("rollback_executed=no");
    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).toContain("LINE webhook is not registered");
    expect(combined).toContain("Supabase real connection has not executed");
    expect(combined).toContain("OpenAI real API has not executed");
    expect(combined).toContain("Production secret injection has not executed");
  });

  it("records LINE webhook as still unregistered despite HTTPS readiness", () => {
    const combined = readCombined([paths.lineRunbook, paths.readiness, paths.readme, paths.devLoop]);

    expect(combined).toContain("https_ready_for_review=true");
    expect(combined).toContain("LINE webhook is not registered");
    expect(combined).toContain("line_webhook_registration=not_done");
    expect(combined).toContain("production_readiness=production_no_go");
  });

  it("does not record email addresses, obvious secrets, database URLs, bearer tokens, or private keys", () => {
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
      new RegExp("privkey" + "\\.pem")
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
