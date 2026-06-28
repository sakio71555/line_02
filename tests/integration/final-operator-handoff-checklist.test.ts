import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const handoffPath = join(repoRoot, "docs/15_runbooks/final_operator_handoff_checklist.md");

describe("final operator handoff checklist", () => {
  it("records the Loop 175 final runtime, Go decision, rollback, and monitoring sections", () => {
    const handoff = readFileSync(handoffPath, "utf8");

    for (const expected of [
      "## Loop 175 Final Operator Handoff",
      "### 1. Current Final Runtime State",
      "### 2. Verified Capabilities",
      "### 3. Go Decision",
      "### 4. Activation Note",
      "### 5. Rollback Checklist",
      "### 6. First-Hour Monitoring Checklist",
      "LINE_REAL_PUSH_ENABLED=false",
      "AI_PROVIDER=mock",
      "OpenAI drop-in absent",
      "REPOSITORY_RUNTIME=supabase",
      "FINAL_OPERATOR_PRODUCTION_GO_APPROVED=NO",
      "final_operator_go=false",
      "go_ready_but_operator_go_pending=true",
      "production_readiness=production_no_go"
    ]) {
      expect(handoff).toContain(expected);
    }
  });
});
