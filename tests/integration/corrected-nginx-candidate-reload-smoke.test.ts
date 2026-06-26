import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/123_corrected_nginx_candidate_reload_smoke.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/corrected_nginx_candidate_reload_smoke.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-26.md");

describe("Loop 123 corrected Nginx candidate reload smoke docs", () => {
  it("adds the Loop 123 task doc and runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("records the corrected invalid-host candidate and avoids real-domain use", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("active_source=2a9a746940b5f7a707af4c042bb9225d3dea258b");
    expect(combined).toContain("/etc/nginx/sites-available/amami-line-crm.conf");
    expect(combined).toContain("server_name amami-line-crm.invalid;");
    expect(combined).toContain("add_header X-Amami-Line-Crm-Proxy");
    expect(combined).toContain("approved_review_host=admin.taiyolabel.site");
    expect(combined).toContain("approved_review_host_used_as_host_header=no");
    expect(combined).toContain("real_domain_used=no");
    expect(combined).toContain("real_domain_count=0");
    expect(combined).toContain("invalid_host_count=1");
  });

  it("records temporary reload, Host header smoke No-Go, and rollback cleanup", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("temporary_symlink=created");
    expect(combined).toContain("sudo_nginx_t=success");
    expect(combined).toContain("sudo_systemctl_reload_nginx=completed");
    expect(combined).toContain("nginx_T_temporary_include=confirmed");
    expect(combined).toContain("nginx-admin /=200");
    expect(combined).toContain("nginx-admin /login=404");
    expect(combined).toContain("nginx-api /api/health=404");
    expect(combined).toContain("diagnostic_header=absent_on_404_response");
    expect(combined).toContain("no_go_reason=api_health_404");
    expect(combined).toContain("sites_enabled_after=absent");
    expect(combined).toContain("rollback_cleanup=trap_completed");
    expect(combined).toContain("rollback_nginx_t=success");
    expect(combined).toContain("rollback_reload=completed_by_trap");
    expect(combined).toContain("post_rollback_direct_api_health=200");
    expect(combined).toContain("post_rollback_direct_admin_login=200");
  });

  it("keeps production readiness and external-service boundaries documented", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath)].join("\n");

    expect(combined).toContain("production_no_go");
    expect(combined).toContain("DNS");
    expect(combined).toContain("certbot");
    expect(combined).toContain("HTTPS");
    expect(combined).toContain("external smoke");
    expect(combined).toContain("LINE/OpenAI/Supabase");
    expect(combined).toContain("API/Auth/RLS/runtime/migration");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("does not record obvious secret values or private keys", () => {
    const combined = [
      readText(taskDocPath),
      readText(runbookPath),
      existsSync(devLogPath) ? readText(devLogPath) : ""
    ].join("\n");
    const forbiddenPatterns = [
      new RegExp("LINE_CHANNEL_ACCESS" + "_TOKEN=.+"),
      new RegExp("LINE_CHANNEL" + "_SECRET=.+"),
      new RegExp("OPENAI" + "_API_KEY=.+"),
      new RegExp("SUPABASE_SERVICE" + "_ROLE_KEY=.+"),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("postgresql" + "://", "i"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY")
    ];

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
