import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(repoRoot, "docs/11_codex_tasks/125_nginx_diagnostic_probe_server_block_candidate.md");
const runbookPath = join(repoRoot, "docs/15_runbooks/nginx_diagnostic_probe_server_block_candidate.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-26.md");

describe("Loop 125 Nginx diagnostic probe server block docs", () => {
  it("adds the Loop 125 task doc and diagnostic probe runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("documents the probe host, endpoint, headers, and temporary include workflow", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("amami-line-crm.invalid");
    expect(combined).toContain("/__amami_probe");
    expect(combined).toContain("X-Amami-Line-Crm-Probe");
    expect(combined).toContain("/etc/nginx/sites-available/amami-line-crm-probe.conf");
    expect(combined).toContain("/etc/nginx/sites-enabled/amami-line-crm-probe.conf");
    expect(combined).toContain("nginx -T");
    expect(combined).toContain("reload smoke");
    expect(combined).toContain("rollback reload");
  });

  it("records the probe-not-reached result and cleanup state", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(devLogPath)].join("\n");

    expect(combined).toContain("evidence_dir=/root/deploy-backups/amami-line-crm/loop125-20260626-213832");
    expect(combined).toContain("probe_status=404");
    expect(combined).toContain("probe_header=");
    expect(combined).toContain("root_status=200");
    expect(combined).toContain("api_health_status=404");
    expect(combined).toContain("server_selection=probe_not_reached");
    expect(combined).toContain("probe_symlink_after=absent");
    expect(combined).toContain("app_symlink_after=absent");
    expect(combined).toContain("candidate_final_state=deleted");
    expect(combined).toContain("rollback_nginx_t=success");
    expect(combined).toContain("rollback_reload=completed");
  });

  it("keeps real-domain, external-service, and production readiness boundaries", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath), readText(devLogPath)].join(
      "\n"
    );

    expect(combined).toContain("real_domain_used=no");
    expect(combined).toContain("admin_taiyolabel_host_used=no");
    expect(combined).toContain("admin.taiyolabel.site");
    expect(combined).toContain("DNS changes");
    expect(combined).toContain("certbot");
    expect(combined).toContain("HTTPS");
    expect(combined).toContain("External public smoke");
    expect(combined).toContain("LINE/OpenAI/Supabase");
    expect(combined).toContain("production_no_go");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("does not record obvious secret values or private keys", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath), readText(devLogPath)].join(
      "\n"
    );
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
