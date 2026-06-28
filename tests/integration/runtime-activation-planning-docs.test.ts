import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const planningDocs = [
  "docs/11_codex_tasks/176_operator_final_go_approval_and_runtime_activation_planning.md",
  "docs/15_runbooks/operator_final_go_approval_and_runtime_activation_planning.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md"
];

describe("runtime activation planning docs", () => {
  it("requires a future explicit approval before LINE final activation", () => {
    const combined = readCombined(planningDocs);

    expect(combined).toContain("ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO");
    expect(combined).toContain("ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=YES");
    expect(combined).toContain("Use the approved LINE enable helper");
    expect(combined).toContain("Run the approved LINE real push disable helper");
    expect(combined).toContain("Do not retry, bulk-send, multicast, broadcast, group-send, or room-send");
  });

  it("requires a future explicit approval before OpenAI final activation", () => {
    const combined = readCombined(planningDocs);

    expect(combined).toContain("ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO");
    expect(combined).toContain("ALLOW_OPENAI_RUNTIME_FINAL_TRUE=YES");
    expect(combined).toContain("Add the approved OpenAI runtime drop-in");
    expect(combined).toContain("Remove the OpenAI runtime drop-in");
    expect(combined).toContain("Confirm `AI_PROVIDER=mock`");
  });

  it("keeps combined activation as higher risk and separates subsystems", () => {
    const combined = readCombined(planningDocs);

    expect(combined).toContain("highest-risk option");
    expect(combined).toContain("activate one subsystem at a time");
    expect(combined).toContain("health and safety checkpoints");
    expect(combined).toContain("rollback checkpoints");
  });
});

function readCombined(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readFileSync(join(repoRoot, relativePath), "utf8")).join("\n");
}
