import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("Loop 165 OpenAI remediation docs", () => {
  it("records the request-shape remediation without secrets or production promotion", () => {
    const taskDoc = read("docs/11_codex_tasks/165_openai_request_shape_provider_transport_remediation.md");
    const runbook = read("docs/15_runbooks/openai_request_shape_provider_transport_remediation.md");
    const productionReadiness = read("docs/15_runbooks/production_readiness_final.md");
    const devLog = read("docs/14_dev_logs/2026-06-28.md");
    const combined = [taskDoc, runbook, productionReadiness, devLog].join("\n");

    expect(combined).toContain("raw_responses_smoke_status=success");
    expect(combined).toContain("provider_boundary_smoke_status=failed");
    expect(combined).toContain("provider_boundary_retry_performed=no");
    expect(combined).toContain("openai_response_body_recorded=no");
    expect(combined).toContain("openai_prompt_body_recorded=no");
    expect(combined).toContain("openai_api_key_recorded=no");
    expect(combined).toContain("openai_model_value_recorded=no");
    expect(combined).toContain("ai_provider_final=mock");
    expect(combined).toContain("production_readiness=production_no_go");
    expect(combined).toContain("Loop 166: OpenAI provider output contract remediation");
  });

  it("keeps the provider-only smoke command documented for avoiding raw diagnostic retries", () => {
    const runbook = read("docs/15_runbooks/openai_request_shape_provider_transport_remediation.md");
    const devLoop = read("docs/08_dev_loop.md");

    expect(runbook).toContain("provider_boundary_only_script=scripts/smoke/openai-provider-boundary-smoke.ts");
    expect(devLoop).toContain("provider-only CLI");
    expect(devLoop).toContain("raw診断を繰り返さない");
  });
});

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}
