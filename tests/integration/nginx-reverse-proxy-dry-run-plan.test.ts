import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/112_nginx_reverse_proxy_dry_run_plan.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/nginx_reverse_proxy_dry_run_plan.md");
const reverseProxyExamplePath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm.reverse-proxy.conf.example"
);
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const productionReadinessPath = join(
  repoRoot,
  "docs/15_runbooks/production_readiness_final.md"
);
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-22.md");

describe("Loop 112 Nginx reverse proxy dry-run plan", () => {
  it("adds the dry-run docs and repo-local reverse proxy example", () => {
    for (const filePath of [taskDocPath, runbookPath, reverseProxyExamplePath]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }
  });

  it("keeps the reverse proxy example placeholder-based and localhost-only", () => {
    const example = readText(reverseProxyExamplePath);

    expect(example).toContain("server_name _CHANGE_ME_");
    expect(example).toContain("location = /api/health");
    expect(example).toContain("proxy_pass http://127.0.0.1:8788/health");
    expect(example).toContain("location /api/");
    expect(example).toContain("proxy_pass http://127.0.0.1:8788/api/");
    expect(example).toContain("location /");
    expect(example).toContain("proxy_pass http://127.0.0.1:3002");
    expect(example).toContain("proxy_set_header Host $host");
    expect(example).toContain("X-Forwarded-For");
    expect(example).toContain("X-Forwarded-Proto");
    expect(example).toContain("X-Forwarded-Host");
    expect(example).toContain("X-Forwarded-Port");
    expect(example).not.toContain("admin.taiyolabel.site");
    expect(example).not.toContain("api.taiyolabel.site");
    expect(example).not.toContain("ssl_certificate");
    expect(example).not.toContain("default_server");
  });

  it("documents the dry-run boundary without enabling public nginx", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("production_no_go");
    expect(combined).toContain("sites-enabled");
    expect(combined).toContain("Nginx reload");
    expect(combined).toContain("certbot");
    expect(combined).toContain("DNS");
    expect(combined).toContain("Host header");
    expect(combined).toContain("_CHANGE_ME_");
    expect(combined).toContain("curl -sS -H 'Host: _CHANGE_ME_'");
    expect(combined).toContain("127.0.0.1:3002");
    expect(combined).toContain("127.0.0.1:8788");
  });

  it("updates loop, readiness, and dev log docs while keeping production No-Go", () => {
    const combined = [
      readText(devLoopPath),
      readText(productionReadinessPath),
      readText(devLogPath)
    ].join("\n");

    expect(combined).toContain("Loop 112");
    expect(combined).toContain("reverse proxy dry-run");
    expect(combined).toContain("production_no_go");
    expect(combined).toContain("Nginx有効化");
    expect(combined).toContain("reload/restart");
    expect(combined).toContain("certbot");
    expect(combined).toContain("DNS");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
