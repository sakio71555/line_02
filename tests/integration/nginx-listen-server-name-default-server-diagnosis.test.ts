import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(repoRoot, "docs/11_codex_tasks/127_nginx_listen_server_name_default_server_diagnosis.md");
const runbookPath = join(repoRoot, "docs/15_runbooks/nginx_listen_server_name_default_server_diagnosis.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-26.md");

describe("Loop 127 Nginx listen/server_name/default_server diagnosis docs", () => {
  it("adds the Loop 127 task doc and diagnosis runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("documents service, listener, active default server, and reload reflection diagnostics", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("nginx_service_status=active");
    expect(combined).toContain("main_pid=426936");
    expect(combined).toContain("port80_process=nginx");
    expect(combined).toContain("active_default_server_count=4");
    expect(combined).toContain("active_listen80_count=5");
    expect(combined).toContain("/etc/nginx/sites-enabled/default");
    expect(combined).toContain("server_name _");
    expect(combined).toContain("default_server");
    expect(combined).toContain("after_reload_service_status=active");
    expect(combined).toContain("journal_error_count_since_reload=0");
    expect(combined).toContain("worker PIDs");
  });

  it("records curl variants, dedicated probe logs, and probe-reached classification", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(devLogPath)].join("\n");

    expect(combined).toContain("/root/deploy-backups/amami-line-crm/loop127-20260626-224235");
    expect(combined).toContain("current_h1_probe_status=404");
    expect(combined).toContain("current_resolve_probe_status=404");
    expect(combined).toContain("current_connect_to_probe_status=404");
    expect(combined).toContain("probe_access_log_path=");
    expect(combined).toContain("probe_error_log_path=");
    expect(combined).toContain("probe_h1_status=204");
    expect(combined).toContain("probe_h1_header=X-Amami-Line-Crm-Probe: loop127");
    expect(combined).toContain("probe_resolve_status=204");
    expect(combined).toContain("probe_connect_to_status=204");
    expect(combined).toContain("probe_api_health_status=404");
    expect(combined).toContain("probe_api_health_header=X-Amami-Line-Crm-Probe: loop127-catchall");
    expect(combined).toContain("probe_access_log_lines=4");
    expect(combined).toContain("probe_error_log_lines=0");
    expect(combined).toContain("result=probe_reached");
  });

  it("records cleanup, rollback, and production safety boundaries", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath), readText(devLogPath)].join(
      "\n"
    );

    expect(combined).toContain("probe_symlink_after=absent");
    expect(combined).toContain("app_symlink_after=absent");
    expect(combined).toContain("candidate_final_state=deleted");
    expect(combined).toContain("rollback_nginx_t=success");
    expect(combined).toContain("rollback_reload=completed");
    expect(combined).toContain("real_domain_used=no");
    expect(combined).toContain("admin_taiyolabel_host_used=no");
    expect(combined).toContain("dns_change=no");
    expect(combined).toContain("certbot_https=no");
    expect(combined).toContain("external_smoke=no");
    expect(combined).toContain("line_openai_supabase_connection=no");
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
