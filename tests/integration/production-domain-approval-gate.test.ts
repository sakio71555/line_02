import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/117_real_domain_decision_and_dns_provider_confirmation_plan.md"
);
const domainPacketPath = join(repoRoot, "docs/15_runbooks/domain_decision_packet.md");
const dnsChecklistPath = join(repoRoot, "docs/15_runbooks/dns_provider_confirmation_checklist.md");
const approvalSheetPath = join(repoRoot, "docs/15_runbooks/production_domain_approval_sheet.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const httpTemplatePath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm.http-bootstrap.conf.example"
);
const httpsTemplatePath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm.https.conf.example"
);
const reverseProxyTemplatePath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example"
);
const preflightScriptPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/preflight/check_domain_dns_https_readiness.sh"
);

describe("Loop 117 production domain approval gate", () => {
  it("adds docs for the decision packet, DNS checklist, and approval sheet", () => {
    for (const filePath of [taskDocPath, domainPacketPath, dnsChecklistPath, approvalSheetPath]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }
  });

  it("keeps human approval fields explicit without choosing a hostname", () => {
    const approvalSheet = readText(approvalSheetPath);
    const combined = [readText(taskDocPath), readText(domainPacketPath), approvalSheet].join("\n");

    expect(approvalSheet).toContain("Production hostname:");
    expect(approvalSheet).toContain("DNS provider:");
    expect(approvalSheet).toContain("DNS rollback owner:");
    expect(approvalSheet).toContain("LINE webhook URL:");
    expect(combined).toContain("canonical_hostname=unknown");
    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).not.toContain("canonical_hostname=amamihome.net");
    expect(combined).not.toContain("canonical_hostname=admin.taiyolabel.site");
    expect(combined).not.toContain("canonical_hostname=api.taiyolabel.site");
  });

  it("documents DNS and publish boundaries as still forbidden", () => {
    const combined = [readText(taskDocPath), readText(dnsChecklistPath), readText(readinessPath)].join("\n");

    expect(combined).toContain("TXT query禁止");
    expect(combined).toContain("DNS変更禁止");
    expect(combined).toContain("Nginx reload/restart禁止");
    expect(combined).toContain("certbot実行禁止");
    expect(combined).toContain("production_no_go");
    expect(combined).toContain("dns_query_executed=no");
  });

  it("keeps new Nginx templates placeholder-based", () => {
    const combined = [readText(httpTemplatePath), readText(httpsTemplatePath), readText(reverseProxyTemplatePath)].join(
      "\n"
    );

    expect(combined).toContain("server_name _CHANGE_ME_");
    expect(combined).not.toContain("server_name admin.taiyolabel.site");
    expect(combined).not.toContain("server_name api.taiyolabel.site");
    expect(combined).not.toContain("server_name amamihome.net");
    expect(combined).not.toContain("server_name amami-line-crm.invalid");
  });

  it("keeps the read-only preflight helper safe for undecided domains", () => {
    const script = readText(preflightScriptPath);

    expect(script).toContain("--no-dns");
    expect(script).toContain("domain_unconfirmed");
    expect(script).toContain("dns_provider_inferred");
    expect(script).toContain("nginx -t");
    expect(script).toContain("certbot --version");
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
    expect(script).not.toMatch(/dig\s+\+short\s+TXT/i);
  });

  it("does not introduce obvious secrets in the new approval docs", () => {
    const combined = [readText(taskDocPath), readText(domainPacketPath), readText(dnsChecklistPath), readText(approvalSheetPath)].join(
      "\n"
    );

    expect(combined).not.toMatch(/BEGIN [A-Z ]*KEY/);
    expect(combined).not.toMatch(/sk_live_/);
    expect(combined).not.toMatch(/xox[baprs]-/);
    expect(combined).not.toMatch(/eyJ[a-zA-Z0-9_-]{20,}\./);
    expect(combined).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
