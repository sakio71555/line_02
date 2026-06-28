import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const schedulePath = "docs/15_runbooks/production_monitoring_schedule.md";
const backlogPath = "docs/11_codex_tasks/181_plus_future_backlog_after_production_go.md";

describe("production monitoring schedule and future backlog", () => {
  it("adds the production monitoring schedule and future backlog docs", () => {
    expect(existsSync(resolve(schedulePath))).toBe(true);
    expect(existsSync(resolve(backlogPath))).toBe(true);
  });

  it("documents daily, weekly, and incident checks", () => {
    const schedule = read(schedulePath);

    for (const expected of [
      "## Daily",
      "## Weekly",
      "## After Any Incident",
      "API direct health returns `200`",
      "Admin API no-header customers returns `401`",
      "LINE invalid-signature request returns `401`, `400`, or `403`"
    ]) {
      expect(schedule).toContain(expected);
    }
  });

  it("records current line-only runtime assumption", () => {
    const schedule = read(schedulePath);

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in=absent",
      "activation_mode=line_only",
      "monitoring_status=healthy"
    ]) {
      expect(schedule).toContain(expected);
    }
  });

  it("keeps future work split into small Loops", () => {
    const backlog = read(backlogPath);

    for (const expected of [
      "OpenAI runtime activation as a separate explicit Loop",
      "Authenticated staff route improvement",
      "Production alerting",
      "Backup automation",
      "Loop 181: OpenAI runtime activation planning"
    ]) {
      expect(backlog).toContain(expected);
    }
  });

  it("does not record secrets, webhook paths, identifiers, bodies, or external provider values", () => {
    const combined = `${read(schedulePath)}\n${read(backlogPath)}`;

    for (const pattern of forbiddenPatterns()) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(repoRoot, relativePath);
}

function read(relativePath: string): string {
  return readFileSync(resolve(relativePath), "utf8");
}

function forbiddenPatterns(): RegExp[] {
  return [
    new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
    new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
    new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
    new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
    new RegExp('userId["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp('replyToken["\\\': ]+[A-Za-z0-9._-]+'),
    new RegExp(envAssignment("OPENAI_API_KEY")),
    new RegExp(envAssignment("OPENAI_MODEL")),
    new RegExp("sk-" + "[A-Za-z0-9]"),
    new RegExp("SUPABASE_URL=https?" + "://[^<\\s]+"),
    new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
    new RegExp("postgresql" + "://", "i"),
    new RegExp("line-test" + "-sent-no-auto-reply")
  ];
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
