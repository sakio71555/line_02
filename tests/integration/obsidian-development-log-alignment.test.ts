import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

const entry = "OBSIDIAN.md";
const obsidianReadme = "docs/16_obsidian/README.md";
const template = "docs/16_obsidian/loop_log_template.md";
const linkMap = "docs/16_obsidian/obsidian_link_map.md";
const taskDoc = "docs/11_codex_tasks/194_2_obsidian_development_log_alignment.md";
const devLoop = "docs/08_dev_loop.md";
const readme = "README.md";
const devLog = "docs/14_dev_logs/2026-06-28.md";

const updatedDocs = [entry, obsidianReadme, template, linkMap, taskDoc, devLoop, readme, devLog, ".gitignore"];

describe("Loop 194.2 Obsidian development log alignment", () => {
  it("adds the Obsidian entry and helper docs", () => {
    for (const relativePath of [entry, obsidianReadme, template, linkMap, taskDoc]) {
      expect(existsSync(resolve(relativePath))).toBe(true);
    }
  });

  it("documents the repository root as an Obsidian Vault", () => {
    const text = read(entry);

    expect(text).toContain("Obsidian Vault");
    expect(text).toContain("/Users/sakio/Desktop/PROJECT/amami-line-crm");
    expect(text).toContain("docs/14_dev_logs");
    expect(text).toContain("docs/11_codex_tasks");
    expect(text).toContain("docs/15_runbooks");
  });

  it("documents official Obsidian development log locations", () => {
    const combined = [read(entry), read(obsidianReadme), read(taskDoc)].join("\n");

    for (const expected of [
      "DevelopmentLog",
      "docs/14_dev_logs",
      "docs/11_codex_tasks",
      "docs/15_runbooks",
      "GitHub-pushed Markdown",
      "source of truth"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("provides the required Loop template sections", () => {
    const text = read(template);

    for (const expected of [
      "## DevelopmentLog",
      "## Decisions",
      "## Risks",
      "## Checklist",
      "## Validation",
      "## Next Loop"
    ]) {
      expect(text).toContain(expected);
    }
  });

  it("adds a Markdown link map to key task, runbook, and dev log files", () => {
    const text = read(linkMap);

    for (const expected of [
      "[README.md](../../README.md)",
      "[Development Loop](../08_dev_loop.md)",
      "[Latest Dev Log: 2026-06-28](../14_dev_logs/2026-06-28.md)",
      "[Loop 181+ Future Backlog](../11_codex_tasks/181_plus_future_backlog_after_production_go.md)",
      "[Production Readiness Final](../15_runbooks/production_readiness_final.md)",
      "[Production Monitoring Schedule](../15_runbooks/production_monitoring_schedule.md)",
      "[Supabase Manual Backup Result Recording](../15_runbooks/supabase_manual_backup_result_recording.md)"
    ]) {
      expect(text).toContain(expected);
    }
  });

  it("updates README and dev loop policy with Obsidian requirements", () => {
    expect(read(readme)).toContain("Obsidian / Development Logs");
    expect(read(readme)).toContain("OBSIDIAN.md");

    const devLoopText = read(devLoop);
    expect(devLoopText).toContain("Every Loop must update Obsidian-readable Markdown logs");
    expect(devLoopText).toContain("Obsidian log updated: true/false");
    expect(devLoopText).toContain("DevelopmentLog updated: true/false");
  });

  it("records Loop 194.2 in the dev log with safety boundaries", () => {
    const text = read(devLog);

    for (const expected of [
      "Loop 194.2: Obsidian development log alignment",
      "obsidian_alignment_status=complete",
      "repo root can be opened as Obsidian Vault",
      "Markdown logs remain source of truth",
      "docs/14_dev_logs is the official DevelopmentLog location",
      "runtime/API/UI/DB/infra changes not performed"
    ]) {
      expect(text).toContain(expected);
    }
  });

  it("documents .obsidian personal state handling", () => {
    const combined = [read(entry), read(obsidianReadme), read(taskDoc), read(".gitignore")].join("\n");

    for (const expected of [
      ".obsidian/workspace*",
      ".obsidian/cache",
      ".obsidian/plugins",
      ".obsidian/themes",
      "personal environment state"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record obvious secret values in the updated docs", () => {
    const combined = updatedDocs.map((relativePath) => read(relativePath)).join("\n");
    const forbiddenPatterns = [
      new RegExp("LINE_CHANNEL_ACCESS" + "_TOKEN=.+"),
      new RegExp("LINE_CHANNEL" + "_SECRET=.+"),
      new RegExp("LINE_WEBHOOK_SECRET" + "_PATH=.+"),
      new RegExp("LINE_WEBHOOK" + "_SECRET=.+"),
      new RegExp("/api/line/webhook/[A-Za-z0-9._~-]{8,}"),
      new RegExp("/line/webhook/[A-Za-z0-9._~-]{8,}"),
      new RegExp("userId[\"': ][A-Za-z0-9._-]+"),
      new RegExp("replyToken[\"': ][A-Za-z0-9._-]+"),
      new RegExp("OPENAI" + "_API_KEY=.+"),
      new RegExp("OPENAI" + "_MODEL=.+"),
      new RegExp("sk-" + "[A-Za-z0-9]"),
      new RegExp("Authorization: " + "Bearer [A-Za-z0-9._-]+"),
      new RegExp("SUPABASE" + "_URL=https?://[^<]"),
      new RegExp("SUPABASE" + "_ANON_KEY=.+"),
      new RegExp("SUPABASE_SERVICE" + "_ROLE_KEY=.+"),
      new RegExp("SUPABASE" + "_DB_URL=.+"),
      new RegExp("postgresql" + "://", "i"),
      new RegExp("postgres" + "://", "i"),
      new RegExp("BEGIN (RSA |EC |OPENSSH )?PRIVATE" + " KEY"),
      new RegExp("privkey" + "\\.pem")
    ];

    for (const pattern of forbiddenPatterns) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(root, relativePath);
}

function read(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}
