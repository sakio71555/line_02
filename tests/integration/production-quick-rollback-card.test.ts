import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const rollbackCardPath = "docs/15_runbooks/production_quick_rollback_card.md";
const closeoutRunbookPath = "docs/15_runbooks/production_stabilization_and_operator_handoff_closeout.md";

describe("production quick rollback card", () => {
  it("adds a one-page quick rollback card", () => {
    expect(existsSync(resolve(rollbackCardPath))).toBe(true);
  });

  it("documents receive-only rollback target after explicit approval", () => {
    const content = read(rollbackCardPath);

    for (const expected of [
      "explicit rollback approval",
      "LINE_REAL_PUSH_ENABLED=false",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in=absent",
      "REPOSITORY_RUNTIME=supabase",
      "systemctl restart amami-line-crm-api.service"
    ]) {
      expect(content).toContain(expected);
    }
  });

  it("keeps rollback separate from routine monitoring and live closeout", () => {
    const combined = `${read(rollbackCardPath)}\n${read(closeoutRunbookPath)}`;

    for (const expected of [
      "Do not use this card for exploratory diagnosis",
      "No additional LINE send was performed",
      "No runtime changes were performed",
      "OpenAI runtime activation remains a separate explicit Loop"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("does not record secrets or webhook suffixes", () => {
    const content = read(rollbackCardPath);

    for (const pattern of forbiddenPatterns()) {
      expect(content).not.toMatch(pattern);
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
    new RegExp(envAssignment("OPENAI_API_KEY")),
    new RegExp(envAssignment("OPENAI_MODEL")),
    new RegExp("SUPABASE_URL=https?" + "://[^<\\s]+"),
    new RegExp(envAssignment("SUPABASE_SERVICE_ROLE_KEY")),
    new RegExp("postgresql" + "://", "i"),
    new RegExp("line-test" + "-sent-no-auto-reply")
  ];
}

function envAssignment(name: string): string {
  return `${name}=.+`;
}
