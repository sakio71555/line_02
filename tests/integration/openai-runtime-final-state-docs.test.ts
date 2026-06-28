import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = "docs/11_codex_tasks/182_openai_runtime_activation_with_explicit_approval.md";
const runbookPath = "docs/15_runbooks/openai_runtime_activation_with_explicit_approval.md";
const monitoringSchedulePath = "docs/15_runbooks/production_monitoring_schedule.md";

describe("Loop 182 OpenAI runtime final state docs", () => {
  it("keeps activation docs present", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records the current monitoring assumption as OpenAI runtime enabled", () => {
    const combined = readCombined([runbookPath, monitoringSchedulePath]);

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=openai",
      "OpenAI systemd drop-in=present",
      "activation_mode=line_and_openai_runtime"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps OpenAI runtime monitoring separate from LINE sends and provider smoke", () => {
    const combined = readCombined([taskDocPath, runbookPath, monitoringSchedulePath]);

    for (const expected of [
      "OpenAI real API smoke=not performed",
      "additional_line_send_performed=false",
      "Review sanitized OpenAI error classification",
      "Review OpenAI usage and cost without recording values",
      "Confirm AI output is not automatically sent to LINE"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secret-shaped values", () => {
    const combined = readCombined([taskDocPath, runbookPath, monitoringSchedulePath]);

    for (const pattern of forbiddenPatterns()) {
      expect(combined).not.toMatch(pattern);
    }
  });
});

function resolve(relativePath: string): string {
  return join(repoRoot, relativePath);
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readFileSync(resolve(relativePath), "utf8")).join("\n");
}

function forbiddenPatterns(): RegExp[] {
  return [
    new RegExp(envAssignment("LINE_CHANNEL_ACCESS_TOKEN")),
    new RegExp(envAssignment("LINE_CHANNEL_SECRET")),
    new RegExp(envAssignment("LINE_WEBHOOK_SECRET_PATH")),
    new RegExp("/api/line/webhook/" + "[A-Za-z0-9._~-]{8,}"),
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
