import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/116_domain_dns_https_readiness_inventory.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/domain_dns_https_readiness_checklist.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const httpTemplatePath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm.http-bootstrap.conf.example"
);
const httpsTemplatePath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm.https.conf.example"
);
const preflightScriptPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/preflight/check_domain_dns_https_readiness.sh"
);

describe("Loop 116 domain DNS HTTPS readiness inventory", () => {
  it("adds the docs, templates, and read-only preflight helper", () => {
    for (const filePath of [taskDocPath, runbookPath, httpTemplatePath, httpsTemplatePath, preflightScriptPath]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }
  });

  it("keeps new Nginx examples placeholder-based and scoped to localhost upstreams", () => {
    const httpTemplate = readText(httpTemplatePath);
    const httpsTemplate = readText(httpsTemplatePath);
    const combined = `${httpTemplate}\n${httpsTemplate}`;

    expect(combined).toContain("server_name _CHANGE_ME_");
    expect(combined).toContain("proxy_pass http://127.0.0.1:8788/health");
    expect(combined).toContain("proxy_pass http://127.0.0.1:8788/api/");
    expect(combined).toContain("proxy_pass http://127.0.0.1:3100");
    expect(combined).toContain("X-Forwarded-Proto");
    expect(combined).toContain("X-Forwarded-Host");
    expect(combined).toContain("X-Forwarded-Port");
    expect(combined).toContain("_ACME_WEBROOT_CHANGE_ME_");
    expect(httpTemplate).toContain("X-Amami-Line-Crm-Proxy");
    expect(httpsTemplate).toContain("_FULLCHAIN_PATH_CHANGE_ME_");
    expect(httpsTemplate).toContain("_PRIVKEY_PATH_CHANGE_ME_");
    expect(httpsTemplate).not.toContain("X-Amami-Line-Crm-Proxy");
    expect(combined).not.toContain("admin.taiyolabel.site");
    expect(combined).not.toContain("api.taiyolabel.site");
    expect(combined).not.toContain("amami-line-crm.invalid");
    expect(combined).not.toContain("default_server");
    expect(combined).not.toContain("Strict-Transport-Security");
    expect(combined).not.toContain("/etc/letsencrypt/live/app.ajnl.net");
  });

  it("keeps the preflight helper read-only", () => {
    const script = readText(preflightScriptPath);

    expect(script).toContain("--domain");
    expect(script).toContain("--expected-ip");
    expect(script).toContain("*.invalid");
    expect(script).toContain("nginx -t");
    expect(script).toContain("certbot --version");
    expect(script).toContain("systemctl list-timers");
    expect(script).not.toContain("certbot --nginx");
    expect(script).not.toContain("certbot certonly");
    expect(script).not.toContain("certbot renew");
    expect(script).not.toContain("ln -s");
    expect(script).not.toContain("systemctl reload nginx");
    expect(script).not.toContain("systemctl restart nginx");
    expect(script).not.toContain("curl http");
    expect(script).not.toContain("curl https");
    expect(script).not.toContain("ufw allow");
    expect(script).not.toContain("iptables -A");
    expect(script).not.toContain("nft add");
  });

  it("documents unresolved domain decisions and keeps production No-Go", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath), readText(devLoopPath)].join(
      "\n"
    );

    expect(combined).toContain("Loop 116");
    expect(combined).toContain("domain_selection=unknown");
    expect(combined).toContain("domain_ownership=unconfirmed");
    expect(combined).toContain("dns_provider=unknown");
    expect(combined).toContain("acme_method=undecided");
    expect(combined).toContain("production_no_go");
    expect(combined).toContain("Admin canonical hostname");
    expect(combined).toContain("LINE webhook URL");
    expect(combined).toContain("single-host");
    expect(combined).toContain("separate API hostname");
    expect(combined).toContain("selected tenant cookie");
    expect(combined).toContain("Nginx reload/restart");
    expect(combined).toContain("external HTTP/HTTPS smoke");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
