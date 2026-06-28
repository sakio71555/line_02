import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const docs = [
  "docs/11_codex_tasks/177_explicit_production_activation_with_operator_approval.md",
  "docs/15_runbooks/explicit_production_activation_with_operator_approval.md",
  "docs/15_runbooks/production_readiness_final.md",
  "docs/15_runbooks/final_operator_handoff_checklist.md"
];

describe("production activation runtime state docs", () => {
  it("keeps LINE real push disabled when approval tokens remain NO", () => {
    const combined = readCombined(docs);

    expect(combined).toContain("ALLOW_LINE_REAL_PUSH_ENABLED_FINAL_TRUE=NO");
    expect(combined).toContain("LINE_REAL_PUSH_ENABLED=false");
    expect(combined).toContain("line_real_push_final_enable=not_performed");
    expect(combined).toContain("No additional LINE send was performed");
  });

  it("keeps OpenAI runtime disabled when approval tokens remain NO", () => {
    const combined = readCombined(docs);

    expect(combined).toContain("ALLOW_OPENAI_RUNTIME_FINAL_TRUE=NO");
    expect(combined).toContain("AI_PROVIDER=mock");
    expect(combined).toContain("OpenAI drop-in absent");
    expect(combined).toContain("openai_runtime_final_enable=not_performed");
    expect(combined).toContain("openai_real_api_performed=false");
  });

  it("records infrastructure and Supabase schema boundaries as unchanged", () => {
    const combined = readCombined(docs);

    expect(combined).toContain("ALLOW_NGINX_DNS_CERTBOT_CHANGES=NO");
    expect(combined).toContain("ALLOW_SUPABASE_SCHEMA_OR_RLS_CHANGES=NO");
    expect(combined).toContain("Nginx/DNS/certbot changes=none");
    expect(combined).toContain("Supabase schema/RLS changes=none");
  });
});

function readCombined(relativePaths: string[]): string {
  return relativePaths.map((relativePath) => readFileSync(join(repoRoot, relativePath), "utf8")).join("\n");
}
