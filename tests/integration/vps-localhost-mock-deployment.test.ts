import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/109_vps_localhost_mock_deployment_execution.md"
);
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/vps_localhost_mock_deployment_execution.md"
);
const apiPackagePath = join(repoRoot, "apps/api/package.json");
const adminPackagePath = join(repoRoot, "apps/admin/package.json");
const productionReadinessPath = join(
  repoRoot,
  "docs/15_runbooks/production_readiness_final.md"
);

describe("Loop 109 VPS localhost mock deployment execution", () => {
  it("records localhost-only VPS execution docs without public deployment steps", () => {
    expect(existsSync(taskDocPath), taskDocPath).toBe(true);
    expect(existsSync(runbookPath), runbookPath).toBe(true);

    const combined = `${readText(taskDocPath)}\n${readText(runbookPath)}`;

    expect(combined).toContain("127.0.0.1:8788");
    expect(combined).toContain("127.0.0.1:3002");
    expect(combined).toContain("/var/www/amami-line-crm");
    expect(combined).toContain("/etc/amami-line-crm");
    expect(combined).toContain("amami-line-crm-api.service");
    expect(combined).toContain("amami-line-crm-admin.service");
    expect(combined).toContain("ssh -L 3002:127.0.0.1:3002");
    expect(combined).toContain("production_no_go");
    expect(combined).toContain("Nginx config install");
    expect(combined).toContain("certbot");
  });

  it("keeps API/Admin start scripts aligned with the VPS localhost smoke", () => {
    const apiPackage = readPackage(apiPackagePath);
    const adminPackage = readPackage(adminPackagePath);

    expect(apiPackage.scripts.start).toBe("tsx src/index.ts");
    expect(adminPackage.scripts.start).toBe("next start --hostname 127.0.0.1");
  });

  it("keeps production readiness as No-Go after localhost-only review deployment", () => {
    const productionReadiness = readText(productionReadinessPath);

    expect(productionReadiness).toContain("VPS localhost mock deployment");
    expect(productionReadiness).toContain("production_no_go");
    expect(productionReadiness).toContain("Nginx公開");
    expect(productionReadiness).toContain("SSL");
    expect(productionReadiness).toContain("external smoke");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function readPackage(filePath: string): { scripts: Record<string, string> } {
  return JSON.parse(readText(filePath)) as { scripts: Record<string, string> };
}
