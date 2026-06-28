import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const sharedDocs = [
  "README.md",
  "docs/08_dev_loop.md",
  "docs/15_runbooks/production_activation_line_only.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md"
];

describe("production monitoring shared docs", () => {
  it("links or references Loop 179 monitoring from shared docs", () => {
    const combined = readCombined(sharedDocs);

    for (const expected of [
      "Loop 179",
      "first-hour production monitoring",
      "docs/11_codex_tasks/179_first_hour_production_monitoring.md",
      "docs/15_runbooks/first_hour_production_monitoring.md"
    ]) {
      expect(combined).toContain(expected);
    }
  });

  it("keeps monitoring read-only and separates rollback into another loop", () => {
    const devLoop = read("docs/08_dev_loop.md");

    for (const expected of [
      "activation後の状態をread-onlyで確認",
      "runtime flag、service、Nginx/DNS/certbot、Supabase schema/RLS、LINE settings、OpenAI runtimeは変更せず",
      "rollback recommendationだけをdocsへ残して別の明示承認Loopへ分けます"
    ]) {
      expect(devLoop).toContain(expected);
    }
  });

  it("records production Go state after monitoring in readiness and handoff docs", () => {
    const combined = readCombined([
      "docs/15_runbooks/production_readiness_final.md",
      "docs/15_runbooks/final_operator_handoff_checklist.md"
    ]);

    for (const expected of [
      "monitoring_status=healthy",
      "rollback_recommended=false",
      "Production readiness remains Go for line-only monitoring.",
      "LINE_REAL_PUSH_ENABLED=true",
      "OpenAI systemd drop-in=absent",
      "Loop 180: production stabilization and operator handoff closeout"
    ]) {
      expect(combined).toContain(expected);
    }
  });
});

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readCombined(relativePaths: string[]): string {
  return relativePaths.map(read).join("\n");
}
