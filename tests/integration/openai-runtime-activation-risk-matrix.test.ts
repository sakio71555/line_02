import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const taskDocPath = "docs/11_codex_tasks/181_openai_runtime_activation_planning_after_production_go.md";
const runbookPath = "docs/15_runbooks/openai_runtime_activation_planning_after_production_go.md";

describe("Loop 181 OpenAI runtime activation risk matrix", () => {
  it("keeps the planning docs present", () => {
    expect(existsSync(resolve(taskDocPath))).toBe(true);
    expect(existsSync(resolve(runbookPath))).toBe(true);
  });

  it("records the required OpenAI activation risks", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

    for (const expected of [
      "API cost unexpected increase",
      "Model output drift",
      "Response latency increase",
      "Malformed JSON output",
      "Provider parsing regression",
      "OpenAI API outage",
      "Accidental AI-generated reply sent via LINE",
      "Secret logging"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records mitigations that keep LINE and staff workflow safe", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

    for (const expected of [
      "Keep `AI_PROVIDER=mock` until explicit approval",
      "do not auto-send AI output",
      "Do not change LINE runtime during OpenAI activation by default",
      "staff/manual workflow primary",
      "rollback drop-in",
      "Record only redacted key names and sanitized classifications"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("records monitoring for cost, behavior, rollback, and logging", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

    for (const expected of [
      "OpenAI usage and cost",
      "Provider latency",
      "AI draft quality review",
      "AI output is not automatically sent to LINE",
      "logs do not contain prompts, responses, API keys, model values, LINE identifiers, or message bodies"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secret-shaped values", () => {
    const combined = readCombined([taskDocPath, runbookPath]);

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
