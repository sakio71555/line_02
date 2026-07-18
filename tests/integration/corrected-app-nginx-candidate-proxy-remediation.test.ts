import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const examplePath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example"
);
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/128_corrected_app_nginx_candidate_proxy_remediation.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/corrected_app_nginx_candidate_proxy_remediation.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-26.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const readmePath = join(repoRoot, "README.md");

describe("Loop 128 corrected app Nginx candidate proxy remediation docs", () => {
  it("adds the Loop 128 task doc and remediation runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("keeps the reverse proxy example placeholder-based with the expected mappings", () => {
    const example = readText(examplePath);

    expect(example).toContain("server_name _CHANGE_ME_");
    expect(example).toContain("location = /api/health");
    expect(example).toContain("proxy_pass http://127.0.0.1:8788/health");
    expect(example).toContain("location /api/");
    expect(example).toContain("proxy_pass http://127.0.0.1:8788/api/");
    expect(example).toContain("location /");
    expect(example).toContain("proxy_pass http://127.0.0.1:3100");
    expect(example).toContain("Temporary diagnostic marker for invalid-host dry-runs");
    expect(example).toContain('add_header X-Amami-Line-Crm-Proxy "amami-line-crm" always;');
    expect(example).not.toContain("server_name admin.taiyolabel.site");
    expect(example).not.toContain("server_name api.taiyolabel.site");
    expect(example).not.toContain("ssl_certificate");
    expect(example).not.toContain("default_server");
  });

  it("records candidate comparison, backup evidence, reload smoke success, and rollback", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(devLogPath)].join("\n");

    expect(combined).toContain("/root/deploy-backups/amami-line-crm/loop128-20260626-235834");
    expect(combined).toContain("normalized_matches_repo=true");
    expect(combined).toContain("diff=server_name _CHANGE_ME_ -> server_name amami-line-crm.invalid");
    expect(combined).toContain("candidate_change=none_candidate_already_matched_repo_template_except_server_name");
    expect(combined).toContain("nginx_t_with_symlink=success");
    expect(combined).toContain("nginx_T_candidate_present=yes");
    expect(combined).toContain("nginx_T_api_health_mapping_present=yes");
    expect(combined).toContain("reload=completed");
    expect(combined).toContain("app_root_status=200");
    expect(combined).toContain("app_login_status=200");
    expect(combined).toContain("app_select_tenant_status=200");
    expect(combined).toContain("app_customers_status=200");
    expect(combined).toContain("app_alerts_status=200");
    expect(combined).toContain("app_api_health_status=200");
    expect(combined).toContain("app_api_health_proxy_header=amami-line-crm");
    expect(combined).toContain("invalid_host_candidate_smoke=success");
    expect(combined).toContain("app_symlink_after=absent");
    expect(combined).toContain("rollback_nginx_t=success");
    expect(combined).toContain("rollback_reload=completed");
    expect(combined).toContain("api-direct /health 200");
    expect(combined).toContain("admin-direct /login 200");
    expect(combined).toContain("3002_8788=localhost_only");
    expect(combined).toContain("18080=absent");
  });

  it("keeps real-domain, external-service, and production readiness boundaries documented", () => {
    const combined = [
      readText(taskDocPath),
      readText(runbookPath),
      readText(readinessPath),
      readText(devLoopPath),
      readText(readmePath),
      readText(devLogPath)
    ].join("\n");

    expect(combined).toContain("real_domain_used=no");
    expect(combined).toContain("admin_taiyolabel_host_used=no");
    expect(combined).toContain("dns_change=no");
    expect(combined).toContain("certbot_https=no");
    expect(combined).toContain("external_smoke=no");
    expect(combined).toContain("line_openai_supabase_connection=no");
    expect(combined).toContain("production_no_go");
    expect(combined).toContain("ACME selected-method dry-run plan");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("does not record obvious secret values or private keys", () => {
    const combined = [
      readText(taskDocPath),
      readText(runbookPath),
      readText(readinessPath),
      readText(devLogPath)
    ].join("\n");
    const forbiddenPatterns = [
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

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
