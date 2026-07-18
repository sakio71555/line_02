import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/108_vps_dry_deployment_preflight_commands.md"
);
const preflightRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/vps_dry_deployment_preflight_commands.md"
);
const rollbackRunbookPath = join(
  repoRoot,
  "docs/15_runbooks/vps_dry_deployment_rollback.md"
);
const noGoChecklistPath = join(
  repoRoot,
  "docs/15_runbooks/vps_dry_deployment_no_go_checklist.md"
);
const productionReadinessPath = join(
  repoRoot,
  "docs/15_runbooks/production_readiness_final.md"
);
const deploymentReadmePath = join(repoRoot, "deploy/vps/taiyolabel/README.md");
const preflightDirectory = join(repoRoot, "deploy/vps/taiyolabel/preflight");
const apiEnvPath = join(repoRoot, "deploy/vps/taiyolabel/env/api.env.example");
const adminEnvPath = join(repoRoot, "deploy/vps/taiyolabel/env/admin.env.example");
const httpNginxPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm-http-bootstrap.conf.template"
);
const sslNginxPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm-ssl.conf.template"
);

const preflightPackFiles = [
  "README.md",
  "01_read_only_audit.md",
  "02_prepare_release_directory.md",
  "03_env_secret_injection_checklist.md",
  "04_local_service_smoke_plan.md",
  "05_nginx_http_bootstrap_plan.md",
  "06_certbot_ssl_plan.md",
  "07_external_smoke_plan.md",
  "99_rollback_plan.md"
].map((fileName) => join(preflightDirectory, fileName));

describe("Loop 108 VPS dry deployment preflight docs", () => {
  it("adds the preflight task, runbooks, checklist, and deploy command pack", () => {
    for (const filePath of [
      taskDocPath,
      preflightRunbookPath,
      rollbackRunbookPath,
      noGoChecklistPath,
      ...preflightPackFiles
    ]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }
  });

  it("documents taiyolabel hosts, planned upstreams, and execution phases", () => {
    const combined = readAll([taskDocPath, preflightRunbookPath, ...preflightPackFiles]);

    expect(combined).toContain("admin.taiyolabel.site");
    expect(combined).toContain("api.taiyolabel.site");
    expect(combined).toContain("160.251.174.201");
    expect(combined).toContain("127.0.0.1:3100");
    expect(combined).toContain("127.0.0.1:8788");
    expect(combined).toContain("Phase 0: Read-only audit");
    expect(combined).toContain("Phase 7: certbot SSL issue");
    expect(combined).toContain("Phase 10: LINE webhook URL registration");
  });

  it("states Loop 108 does not execute VPS, nginx, systemd, certbot, external APIs, or production smoke", () => {
    const combined = readAll([taskDocPath, preflightRunbookPath, ...preflightPackFiles]);

    expect(combined).toContain("Loop 108 does not execute");
    expect(combined).toContain("Do not SSH");
    expect(combined).toContain("does not execute VPS SSH");
    expect(combined).toContain("does not execute VPS SSH, systemd, nginx, certbot");
    expect(combined).toContain("Do not register this URL in LINE Developers during Loop 108");
    expect(combined).toContain("LINE_MESSAGING_ENABLED=false");
    expect(combined).toContain("OPENAI_REAL_API_ENABLED=false");
    expect(combined).toContain("production_no_go");
  });

  it("protects existing nginx, systemd, SSL, and /var/www assets", () => {
    const combined = readAll([preflightRunbookPath, rollbackRunbookPath, ...preflightPackFiles]);

    for (const protectedText of [
      "Do not touch `/var/www/ehime-portal`",
      "Do not touch `/var/www/line-transport`",
      "Do not touch `/var/www/html`",
      "/etc/nginx/sites-available/default",
      "/etc/nginx/sites-available/ehime-portal",
      "/etc/nginx/sites-available/line-transport",
      "ehime-crawler-admin.service",
      "line-transport-api.service",
      "Do not reuse existing ajnl certificates"
    ]) {
      expect(combined).toContain(protectedText);
    }
  });

  it("keeps rollback scoped only to amami-line-crm assets", () => {
    const rollback = readText(rollbackRunbookPath);

    expect(rollback).toContain("amami-line-crm-api.service");
    expect(rollback).toContain("amami-line-crm-admin.service");
    expect(rollback).toContain("/etc/nginx/sites-enabled/amami-line-crm");
    expect(rollback).toContain("/etc/amami-line-crm");
    expect(rollback).toContain("/var/www/amami-line-crm");
    expect(rollback).toContain("amami-line-crm-taiyolabel");
    expect(rollback).toContain("Do Not Touch");
    expect(rollback).toContain("Loop 108 does not execute rollback commands");
  });

  it("keeps nginx templates scoped and avoids default server or reused ajnl certificate paths", () => {
    const nginxTemplates = readAll([httpNginxPath, sslNginxPath]);

    expect(nginxTemplates).toContain("proxy_pass http://127.0.0.1:3100");
    expect(nginxTemplates).toContain("proxy_pass http://127.0.0.1:8788");
    expect(nginxTemplates).toContain("amami-line-crm-taiyolabel");
    expect(nginxTemplates).not.toContain("default_server");
    expect(nginxTemplates).not.toContain("/etc/letsencrypt/live/app.ajnl.net");
  });

  it("keeps env examples free of obvious secret-like values", () => {
    const envExamples = readAll([apiEnvPath, adminEnvPath]);

    expect(envExamples).toContain("LINE_MESSAGING_ENABLED=false");
    expect(envExamples).toContain("LINE_REAL_PUSH_ENABLED=false");
    expect(envExamples).toContain("AI_PROVIDER=mock");
    expect(envExamples).toContain("OPENAI_REAL_API_ENABLED=false");
    expect(envExamples).not.toMatch(new RegExp(`${"sk"}-[A-Za-z0-9_-]{10,}`, "u"));
    expect(envExamples).not.toMatch(new RegExp(`${"ey"}J[A-Za-z0-9_-]{20,}`, "u"));
    expect(envExamples).not.toMatch(/postgres(?:ql)?:\/\//iu);
    expect(envExamples).not.toMatch(new RegExp(`${"SUPABASE_SERVICE_ROLE_KEY"}=\\S+`, "u"));
    expect(envExamples).not.toMatch(new RegExp(`${"LINE_CHANNEL_ACCESS_TOKEN"}=\\S+`, "u"));
    expect(envExamples).not.toMatch(new RegExp(`${"OPENAI_API_KEY"}=\\S+`, "u"));
  });

  it("keeps production readiness as production_no_go and links Loop 108 docs", () => {
    const combined = readAll([
      productionReadinessPath,
      deploymentReadmePath,
      taskDocPath,
      preflightRunbookPath,
      noGoChecklistPath
    ]);

    expect(combined).toContain("Loop 108");
    expect(combined).toContain("VPS dry deployment preflight command pack");
    expect(combined).toContain("rollback runbook");
    expect(combined).toContain("No-Go checklist");
    expect(combined).toContain("production_no_go");
    expect(combined).toContain("production deploy / external smoke");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function readAll(filePaths: string[]): string {
  return filePaths.map(readText).join("\n");
}
