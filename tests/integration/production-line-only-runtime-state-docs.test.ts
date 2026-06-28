import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const currentStateDocs = [
  "docs/11_codex_tasks/178_production_activation_line_only.md",
  "docs/15_runbooks/production_activation_line_only.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md",
  "docs/15_runbooks/final_production_go_nogo_review.md"
];

describe("production line-only runtime state docs", () => {
  it("documents the final line-only runtime state", () => {
    const combined = readCombined(currentStateDocs);

    for (const expected of [
      "REPOSITORY_RUNTIME=supabase",
      "LINE_REAL_PUSH_ENABLED=true",
      "AI_PROVIDER=mock",
      "OpenAI systemd drop-in=absent"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("documents that only LINE real push changed", () => {
    const combined = readCombined(currentStateDocs);

    for (const expected of [
      "ACTIVATION_MODE=line_only",
      "runtime_activation_changes=performed",
      "Nginx/DNS/certbot changes=none",
      "Supabase schema/RLS changes=none",
      "additional_line_send_performed=false",
      "openai_real_api_performed=false"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps the previous Loop 177 non-activation record available as history", () => {
    const loop177 = read(
      "docs/11_codex_tasks/177_explicit_production_activation_with_operator_approval.md"
    );

    expect(loop177).toContain("ACTIVATION_MODE=review_only");
    expect(loop177).toContain("activation_result=not_performed");
    expect(loop177).toContain("production_readiness=production_no_go");
  });
});

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map(read).join("\n");
}
