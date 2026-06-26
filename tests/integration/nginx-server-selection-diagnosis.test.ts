import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(repoRoot, "docs/11_codex_tasks/124_nginx_server_selection_diagnosis.md");
const runbookPath = join(repoRoot, "docs/15_runbooks/nginx_server_selection_diagnosis.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-26.md");

describe("Loop 124 Nginx server selection diagnosis docs", () => {
  it("adds the Loop 124 task doc and diagnosis runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("documents include tree, temporary symlink, and nginx -T diagnosis without reload", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("sites_enabled_include_count=1");
    expect(combined).toContain("conf_d_include_count=1");
    expect(combined).toContain("sites_available_direct_include_count=0");
    expect(combined).toContain("temporary_symlink_created=yes");
    expect(combined).toContain("candidate_in_temp_nginx_T=yes");
    expect(combined).toContain("temp_invalid_host_count=1");
    expect(combined).toContain("temp_admin_upstream_count=1");
    expect(combined).toContain("temp_api_upstream_count=2");
    expect(combined).toContain("temp_diagnostic_header_count=1");
    expect(combined).toContain("temp_api_health_location_count=1");
    expect(combined).toContain("temporary_symlink_removed=yes");
    expect(combined).toContain("reload_restart=not_run");
    expect(combined).toContain("Nginx reload/restart was not run");
    expect(combined).toContain("Forbidden Operations");
  });

  it("records server block map, active curl behavior, and root-cause hypotheses", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("Server Block Map");
    expect(combined).toContain("/etc/nginx/sites-enabled/default");
    expect(combined).toContain("server_name");
    expect(combined).toContain("default_server");
    expect(combined).toContain("Host: amami-line-crm.invalid");
    expect(combined).toContain("/api/health = 404");
    expect(combined).toContain("X-Amami-Line-Crm-Proxy=absent");
    expect(combined).toContain("Root Cause Hypotheses");
    expect(combined).toContain("Symlink was included in `nginx -T` but not active after reload");
    expect(combined).toContain("Reload did not apply expected config");
    expect(combined).toContain("diagnostic probe");
  });

  it("keeps real-domain, external service, and production readiness boundaries", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath), readText(devLogPath)].join(
      "\n"
    );

    expect(combined).toContain("production_no_go");
    expect(combined).toContain("real_domain_used=no");
    expect(combined).toContain("admin_taiyolabel_host_used=no");
    expect(combined).toContain("admin.taiyolabel.site");
    expect(combined).toContain("DNS changes");
    expect(combined).toContain("certbot/HTTPS");
    expect(combined).toContain("External public smoke");
    expect(combined).toContain("LINE/OpenAI/Supabase");
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
