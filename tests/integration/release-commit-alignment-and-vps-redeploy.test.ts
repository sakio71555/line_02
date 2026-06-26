import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/120_release_commit_alignment_and_vps_reproducible_redeploy.md"
);
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/release_commit_alignment_and_vps_redeploy.md"
);
const readinessPath = join(repoRoot, "docs/15_runbooks/production_readiness_final.md");
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-26.md");

describe("Loop 120 release commit alignment and VPS redeploy docs", () => {
  it("adds the Loop 120 task doc and release redeploy runbook", () => {
    expect(existsSync(taskDocPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it("records release, rollback, VPS source, and evidence fields", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("release_candidate_commit=5cd0c5f9f49c47f5dfc7bfbebba2c2c44fa343db");
    expect(combined).toContain("rollback_candidate_commit=176cb34fc6059ecabfb9826daacaabc2a437bebe");
    expect(combined).toContain("vps_before_source=176cb34fc6059ecabfb9826daacaabc2a437bebe");
    expect(combined).toContain("vps_after_source=176cb34fc6059ecabfb9826daacaabc2a437bebe");
    expect(combined).toContain("evidence_path=/root/deploy-backups/amami-line-crm/loop120-20260626-174138");
  });

  it("documents fast-forward only and forbidden git operations", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("fast-forward");
    expect(combined).toContain("git pull --ff-only origin main");
    expect(combined).toContain("git reset");
    expect(combined).toContain("git stash");
    expect(combined).toContain("git rebase");
    expect(combined).toContain("force push");
    expect(combined).toContain("release directory is copy-based without git worktree");
  });

  it("keeps Nginx, DNS, HTTPS, and external services out of scope", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath)].join("\n");

    expect(combined).toContain("Nginx reload/restart");
    expect(combined).toContain("DNS");
    expect(combined).toContain("certbot");
    expect(combined).toContain("HTTPS");
    expect(combined).toContain("external smoke");
    expect(combined).toContain("LINE/OpenAI/Supabase");
    expect(combined).toContain("production_no_go");
    expect(combined).not.toContain("ready_for_controlled_production_enablement");
  });

  it("records localhost-only smoke and the no-deploy No-Go decision", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(devLogPath)].join("\n");

    expect(combined).toContain("api /health 200");
    expect(combined).toContain("admin /login 200");
    expect(combined).toContain("localhost-only");
    expect(combined).toContain("18080");
    expect(combined).toContain("fast_forward_attempted=no");
    expect(combined).toContain("restart_attempted=no");
  });

  it("does not record obvious secret values or private keys", () => {
    const combined = [readText(taskDocPath), readText(runbookPath), readText(readinessPath)].join("\n");
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
