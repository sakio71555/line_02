import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("Loop 165 OpenAI request shape and provider transport remediation", () => {
  it("keeps provider requests on the Responses API with store disabled and bounded output", () => {
    const aiSource = read("packages/ai/src/index.ts");

    expect(aiSource).toContain("https://api.openai.com/v1/responses");
    expect(aiSource).toContain("max_output_tokens: 800");
    expect(aiSource).toContain("store: false");
    expect(aiSource).toContain("text:");
    expect(aiSource).not.toContain("chat.completions");
  });

  it("adds the raw diagnostic smoke and two-stage provider smoke scripts", () => {
    const rawSmoke = read("scripts/smoke/openai-raw-responses-smoke.ts");
    const providerSmoke = read("scripts/smoke/openai-provider-smoke.ts");
    const providerBoundarySmoke = read("scripts/smoke/openai-provider-boundary-smoke.ts");

    expect(rawSmoke).toContain("openai_raw_smoke=");
    expect(rawSmoke).toContain("max_output_tokens: 16");
    expect(rawSmoke).toContain("store: false");
    expect(rawSmoke).toContain("response_body_recorded=false");
    expect(rawSmoke).toContain("prompt_body_recorded=false");
    expect(rawSmoke).toContain("api_key_recorded=false");
    expect(providerSmoke).toContain("openai_provider_smoke=skipped");
    expect(providerSmoke).toContain("raw_smoke_failed");
    expect(providerSmoke).toContain("openai_smoke_final=");
    expect(providerBoundarySmoke).toContain("runOpenAiProviderBoundarySmokeCli");
  });
});

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}
