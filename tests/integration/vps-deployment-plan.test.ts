import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/106_vps_deployment_plan_and_templates.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/vps_deployment_taiyolabel_site.md");
const externalChecklistPath = join(
  repoRoot,
  "docs/15_runbooks/external_services_setup_checklist.md"
);
const deploymentReadmePath = join(repoRoot, "deploy/vps/taiyolabel/README.md");
const httpNginxPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm-http-bootstrap.conf.template"
);
const sslNginxPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm-ssl.conf.template"
);
const apiSystemdPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/systemd/amami-line-crm-api.service.template"
);
const adminSystemdPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/systemd/amami-line-crm-admin.service.template"
);
const apiEnvPath = join(repoRoot, "deploy/vps/taiyolabel/env/api.env.example");
const adminEnvPath = join(repoRoot, "deploy/vps/taiyolabel/env/admin.env.example");
const productionReadinessPath = join(
  repoRoot,
  "docs/15_runbooks/production_readiness_final.md"
);

describe("Loop 106 VPS deployment plan and templates", () => {
  it("adds the deployment docs and templates", () => {
    for (const filePath of [
      taskDocPath,
      runbookPath,
      externalChecklistPath,
      deploymentReadmePath,
      httpNginxPath,
      sslNginxPath,
      apiSystemdPath,
      adminSystemdPath,
      apiEnvPath,
      adminEnvPath
    ]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }
  });

  it("keeps nginx templates on the production same-origin boundary", () => {
    const combined = `${readText(httpNginxPath)}\n${readText(sslNginxPath)}`;

    expect(combined).toContain("admin.taiyolabel.site");
    expect(combined).not.toContain("server_name api.taiyolabel.site");
    expect(combined).toContain("location /api/");
    expect(combined).toContain("proxy_pass http://127.0.0.1:8788/api/;");
    expect(combined).toContain("location = /api/health");
    expect(combined).toContain("proxy_pass http://127.0.0.1:8788/health;");
    expect(combined).toContain("127.0.0.1:3100");
    expect(combined).toContain("127.0.0.1:8788");
    expect(combined).toContain("X-Forwarded-Proto");
    expect(combined).toContain("X-Forwarded-For");
    expect(combined).not.toContain("default_server");
    expect(combined).not.toContain("server_name _");
    expect(combined).not.toContain("/etc/letsencrypt/live/app.ajnl.net");
  });

  it("uses the dedicated future certificate name in the SSL template", () => {
    const sslTemplate = readText(sslNginxPath);

    expect(sslTemplate).toContain("amami-line-crm-taiyolabel");
    expect(sslTemplate).toContain(
      "/etc/letsencrypt/live/amami-line-crm-taiyolabel/fullchain.pem"
    );
    expect(sslTemplate).toContain(
      "/etc/letsencrypt/live/amami-line-crm-taiyolabel/privkey.pem"
    );
  });

  it("wires systemd templates to verified production start scripts after Loop 107", () => {
    const combined = `${readText(apiSystemdPath)}\n${readText(adminSystemdPath)}`;

    expect(combined).toContain("Description=amami-line-crm-api");
    expect(combined).toContain("Description=amami-line-crm-admin");
    expect(combined).toContain("WorkingDirectory=/var/www/amami-line-crm");
    expect(combined).toContain("EnvironmentFile=/etc/amami-line-crm/api.env");
    expect(combined).toContain("EnvironmentFile=/etc/amami-line-crm/admin.env");
    expect(combined).toContain("API_PORT=8788");
    expect(combined).toContain("ADMIN_PORT=3100");
    expect(combined).toContain("Restart=always");
    expect(combined).toContain(
      "ExecStart=/usr/bin/env npx pnpm@10.12.1 --filter @amami-line-crm/api start"
    );
    expect(combined).toContain(
      "ExecStart=/usr/bin/env npx pnpm@10.12.1 --filter @amami-line-crm/admin start"
    );
    expect(combined).not.toContain("No production API start script is defined");
    expect(combined).not.toContain("No production Admin start script is defined");
  });

  it("keeps env examples empty for secrets and disabled for real external APIs", () => {
    const combined = `${readText(apiEnvPath)}\n${readText(adminEnvPath)}`;

    for (const name of [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_DB_URL",
      "LINE_CHANNEL_SECRET",
      "LINE_CHANNEL_ACCESS_TOKEN",
      "OPENAI_API_KEY"
    ]) {
      expect(combined).toContain(`${name}=`);
      expect(combined).not.toMatch(new RegExp(`${name}=\\S+`, "u"));
    }

    expect(combined).toContain("LINE_MESSAGING_ENABLED=false");
    expect(combined).toContain("LINE_REAL_PUSH_ENABLED=false");
    expect(combined).toContain("AI_PROVIDER=mock");
    expect(combined).toContain("OPENAI_REAL_API_ENABLED=false");
    expect(combined).toContain("API_BASE_URL=https://admin.taiyolabel.site");
    expect(combined).toContain("API_PUBLIC_ORIGIN=https://admin.taiyolabel.site");
    expect(combined).not.toContain("API_BASE_URL=https://admin.taiyolabel.site/api");
    expect(combined).not.toContain("API_PUBLIC_ORIGIN=https://admin.taiyolabel.site/api");
    expect(combined).not.toContain("api.taiyolabel.site");
    expect(combined).not.toMatch(new RegExp(`${"sk"}-[A-Za-z0-9_-]{10,}`, "u"));
    expect(combined).not.toMatch(new RegExp(`${"ey"}J[A-Za-z0-9_-]{20,}`, "u"));
    expect(combined).not.toMatch(/postgres(?:ql)?:\/\//iu);
  });

  it("records production_no_go and the remaining deployment blockers", () => {
    const combined = [
      readText(taskDocPath),
      readText(runbookPath),
      readText(productionReadinessPath)
    ].join("\n");

    expect(combined).toContain("production_no_go");
    expect(combined).toContain("production start scripts");
    expect(combined).toContain("API planned port `8788`");
    expect(combined).toContain("Loop 107");
    expect(combined).toContain("localhost-only");
    expect(combined).toContain("nginx");
    expect(combined).toContain("certbot");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
