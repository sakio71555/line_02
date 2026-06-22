import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/113_nginx_sites_enabled_include_dry_run_final_gate.md"
);
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/nginx_sites_enabled_include_dry_run_final_gate.md"
);
const devLoopPath = join(repoRoot, "docs/08_dev_loop.md");
const productionReadinessPath = join(
  repoRoot,
  "docs/15_runbooks/production_readiness_final.md"
);
const devLogPath = join(repoRoot, "docs/14_dev_logs/2026-06-22.md");
const readmePath = join(repoRoot, "README.md");

describe("Loop 113 Nginx sites-enabled include dry-run final gate", () => {
  it("adds the Loop 113 task doc and runbook", () => {
    for (const filePath of [taskDocPath, runbookPath]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }
  });

  it("documents a temporary symlink flow with cleanup and post-cleanup checks", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("/etc/nginx/sites-available/amami-line-crm.conf");
    expect(combined).toContain("/etc/nginx/sites-enabled/amami-line-crm.conf");
    expect(combined).toContain("sudo ln -s");
    expect(combined).toContain("trap cleanup EXIT");
    expect(combined).toContain("sudo rm -f \"$LINK\"");
    expect(combined).toContain("test ! -e \"$LINK\"");
    expect(combined).toContain("post-cleanup `sudo nginx -t`");
    expect(combined).toContain("temporary symlink was removed");
  });

  it("keeps production exposure and external services out of scope", () => {
    const combined = [
      readText(taskDocPath),
      readText(runbookPath),
      readText(devLoopPath),
      readText(productionReadinessPath),
      readText(devLogPath),
      readText(readmePath)
    ].join("\n");

    expect(combined).toContain("production_no_go");
    expect(combined).toContain("Nginx reload/restart");
    expect(combined).toContain("certbot");
    expect(combined).toContain("DNS");
    expect(combined).toContain("public");
    expect(combined).toContain("LINE/OpenAI/Supabase");
    expect(combined).toContain("symlink");
    expect(combined).toContain("削除");
  });

  it("records the include summary without real secret values", () => {
    const combined = [readText(taskDocPath), readText(runbookPath)].join("\n");

    expect(combined).toContain("amami-line-crm.invalid");
    expect(combined).toContain("127.0.0.1:3002");
    expect(combined).toContain("127.0.0.1:8788");
    expect(combined).not.toMatch(/LINE_CHANNEL_ACCESS_TOKEN=.+/);
    expect(combined).not.toMatch(/LINE_CHANNEL_SECRET=.+/);
    expect(combined).not.toMatch(/OPENAI_API_KEY=.+/);
    expect(combined).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY=.+/);
    expect(combined).not.toMatch(/SUPABASE_DB_URL=.+/);
    expect(combined).not.toContain("Authorization: Bearer ");
    expect(combined).not.toContain("postgresql://");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}
