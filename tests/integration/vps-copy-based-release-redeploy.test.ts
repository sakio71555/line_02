import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/121_vps_copy_based_release_alignment_and_localhost_redeploy.md"
);
const runbookPath = join(repoRoot, "docs/15_runbooks/vps_copy_based_release_archive_redeploy.md");
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-26.md");

describe("Loop 121 VPS copy-based release archive redeploy docs", () => {
  it("records the Loop 121 task doc and copy-based archive runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("records release archive, backup, and staging evidence without active deploy", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(devLogPath)].join("\n");

    expect(combined).toContain("release_candidate_commit=e1eeb2d7be37074258aa5aade48d7b03a1cd7ac1");
    expect(combined).toContain("archive_sha256=f5ab2e23ef8de82a97c0b858b8099ea693474e3b90b4209892f137d85297f98e");
    expect(combined).toContain("/root/deploy-backups/amami-line-crm/loop121-20260626-180347");
    expect(combined).toContain("/root/deploy-staging/amami-line-crm/loop121-20260626-180347");
    expect(combined).toContain("active_deploy_updated=no");
    expect(combined).toContain("systemd_restart=no");
  });

  it("documents the staging test No-Go reason and compatibility categories", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("VPS staging full test failed before active deploy");
    expect(combined).toContain("copy-based staging source has no `.git`");
    expect(combined).toContain("archive excludes `.env*`");
    expect(combined).toContain("VPS Node.js 20.20.2");
    expect(combined).toContain("Loop 121.1: copy-based VPS staging test compatibility patch");
  });

  it("keeps the safety boundary and production readiness as No-Go", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath)].join("\n");

    expect(combined).toContain("Nginx reload/restart was not run");
    expect(combined).toContain("DNS/certbot/HTTPS/external smoke was not run");
    expect(combined).toContain("LINE/OpenAI/Supabase real connections were not run");
    expect(combined).toContain("production_no_go");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("does not record obvious secret values or private keys", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath)].join("\n");
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
