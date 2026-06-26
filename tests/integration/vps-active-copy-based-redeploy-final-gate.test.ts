import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/122_copy_based_vps_active_localhost_redeploy_final_gate.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/vps_active_copy_based_localhost_redeploy.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-26.md");

describe("Loop 122 VPS active copy-based localhost redeploy docs", () => {
  it("records the Loop 122 task doc and active redeploy runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("records release archive, checksum, staging validation, and active evidence", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(devLogPath)].join("\n");

    expect(combined).toContain("release_candidate=2a9a746940b5f7a707af4c042bb9225d3dea258b");
    expect(combined).toContain("archive_sha256=9ca1d4e5794e5741c0e4767cad69e0d45c95b102297f1d6e355bcb17d0d73939");
    expect(combined).toContain("/root/deploy-staging/amami-line-crm/loop122-extract-20260626-190958");
    expect(combined).toContain("/root/deploy-backups/amami-line-crm/loop122-20260626-190958");
    expect(combined).toContain("install_frozen_lockfile=success");
    expect(combined).toContain("test_integration=107 passed / 1 skipped files, 691 passed / 4 skipped tests");
    expect(combined).toContain("active_deploy_updated=yes");
  });

  it("documents env preservation, deploy markers, localhost smoke, and rollback", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("archive_env_policy=.env* excluded from archive; active .env* preserved on VPS");
    expect(combined).toContain("--exclude='.env'");
    expect(combined).toContain("--exclude='.env.*'");
    expect(combined).toContain(".deploy-source");
    expect(combined).toContain(".deploy-manifest.txt");
    expect(combined).toContain("api /health=200");
    expect(combined).toContain("admin /login=200");
    expect(combined).toContain("Rollback Plan");
  });

  it("keeps the public exposure and production readiness boundaries", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath)].join("\n");

    expect(combined).toContain("Nginx reload/restart was not run");
    expect(combined).toContain("DNS/certbot/HTTPS/external smoke was not run");
    expect(combined).toContain("LINE/OpenAI/Supabase real connections were not run");
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
