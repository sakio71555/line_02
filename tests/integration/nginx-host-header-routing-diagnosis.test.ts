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
  "docs/11_codex_tasks/115_nginx_host_header_routing_diagnosis_and_local_stage_fix.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/nginx_host_header_routing_diagnosis.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");

describe("Loop 115 Nginx host-header routing diagnosis", () => {
  it("keeps the reverse proxy example placeholder-based with route diagnostics", () => {
    const example = readText(examplePath);

    expect(example).toContain("server_name _CHANGE_ME_");
    expect(example).toContain('add_header X-Amami-Line-Crm-Proxy "amami-line-crm" always;');
    expect(example).toContain("location = /api/health");
    expect(example).toContain("proxy_pass http://127.0.0.1:8788/health");
    expect(example).toContain("location /api/");
    expect(example).toContain("proxy_pass http://127.0.0.1:8788/api/");
    expect(example).toContain("location /");
    expect(example).toContain("proxy_pass http://127.0.0.1:3100");
    expect(example).toContain("proxy_set_header Host $host");
    expect(example).toContain("X-Forwarded-For");
    expect(example).toContain("X-Forwarded-Proto");
    expect(example).toContain("X-Forwarded-Host");
    expect(example).toContain("X-Forwarded-Port");
    expect(example).not.toContain("amami-line-crm.invalid");
    expect(example).not.toContain("admin.taiyolabel.site");
    expect(example).not.toContain("api.taiyolabel.site");
    expect(example).not.toContain("certbot --");
    expect(example).not.toContain("ssl_certificate");
    expect(example).not.toContain("default_server");
  });

  it("documents the standalone localhost-only routing diagnosis and system reload ban", () => {
    for (const filePath of [taskDocPath, runbookPath]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }

    const combined = `${readText(taskDocPath)}\n${readText(runbookPath)}`;

    expect(combined).toContain("127.0.0.1:18080");
    expect(combined).toContain("localhost-only");
    expect(combined).toContain("system Nginx reload/restart was not executed");
    expect(combined).toContain("Host header");
    expect(combined).toContain("/api/health");
    expect(combined).toContain("X-Amami-Line-Crm-Proxy");
    expect(combined).toContain("production_no_go");
    expect(combined).toContain("sites-enabled symlink");
    expect(combined).toContain("sudo nginx -t");
    expect(combined).not.toContain("sudo systemctl reload nginx");
    expect(combined).not.toContain("sudo systemctl restart nginx");
    expect(combined).not.toContain("certbot --");
  });

  it("keeps production readiness No-Go after the diagnosis", () => {
    const readiness = readText(readinessPath);

    expect(readiness).toContain("Loop 115");
    expect(readiness).toContain("production_no_go");
    expect(readiness).toContain("Host header routing");
    expect(readiness).toContain("system Nginx reload/restart未実施");
    expect(readiness).not.toContain("ready_for_controlled_production_enablement");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
