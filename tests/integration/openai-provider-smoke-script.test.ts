import { describe, expect, it, vi } from "vitest";

import type { OpenAiResponsesFetch } from "@amami-line-crm/ai";

import {
  runOpenAiProviderSmoke,
  runOpenAiProviderSmokeCli
} from "../../scripts/smoke/openai-provider-smoke";

describe("Loop 162 OpenAI provider smoke command", () => {
  it("fails fast when OPENAI_API_KEY is missing", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>();
    const result = await runOpenAiProviderSmokeCli({
      env: {
        AI_PROVIDER: "openai",
        OPENAI_MODEL: "gpt-test-model",
        OPENAI_REAL_API_SMOKE_APPROVED: "YES"
      },
      openAiFetch
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("openai_smoke=not_performed");
    expect(result.stdout).toContain("reason=openai_api_key_missing");
    expect(openAiFetch).not.toHaveBeenCalled();
  });

  it("fails fast when OPENAI_MODEL is missing", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>();
    const result = await runOpenAiProviderSmokeCli({
      env: {
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "private-openai-key",
        OPENAI_REAL_API_SMOKE_APPROVED: "YES"
      },
      openAiFetch
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("openai_smoke=not_performed");
    expect(result.stdout).toContain("reason=openai_model_missing");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(openAiFetch).not.toHaveBeenCalled();
  });

  it("requires explicit paid smoke approval before calling the transport", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>();
    const result = await runOpenAiProviderSmokeCli({
      env: {
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "private-openai-key",
        OPENAI_MODEL: "gpt-test-model",
        OPENAI_REAL_API_SMOKE_APPROVED: "NO"
      },
      openAiFetch
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("openai_smoke=not_performed");
    expect(result.stdout).toContain("reason=openai_real_api_smoke_not_approved");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(openAiFetch).not.toHaveBeenCalled();
  });

  it("uses a fake transport for the success path and does not print the response body", async () => {
    const rawResponseBody = "RAW_RESPONSE_BODY_SHOULD_NOT_PRINT";
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async (_input, _init) => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            draft_body: rawResponseBody,
            next_questions: ["dummy question"],
            risk_flags: ["dummy risk"],
            recommended_response_mode: "human_required",
            should_handoff: true
          })
        };
      }
    }));

    const result = await runOpenAiProviderSmokeCli({
      env: {
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "private-openai-key",
        OPENAI_MODEL: "gpt-test-model",
        OPENAI_REAL_API_SMOKE_APPROVED: "YES"
      },
      openAiFetch
    });

    expect(result.exitCode).toBe(0);
    expect(openAiFetch).toHaveBeenCalledTimes(1);
    expect(result.stdout).toContain("openai_smoke=success");
    expect(result.stdout).toContain("provider=openai");
    expect(result.stdout).toContain("response_received=true");
    expect(result.stdout).toContain("response_body_recorded=false");
    expect(result.stdout).toContain("api_key_recorded=false");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(result.stdout).not.toContain(rawResponseBody);
  });

  it("sanitizes provider failures and does not print request secrets", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => ({
      ok: false,
      async json() {
        return {
          error: "private-openai-key should not be printed"
        };
      }
    }));

    const result = await runOpenAiProviderSmoke({
      env: {
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "private-openai-key",
        OPENAI_MODEL: "gpt-test-model",
        OPENAI_REAL_API_SMOKE_APPROVED: "YES"
      },
      openAiFetch
    });

    expect(openAiFetch).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "failed",
      provider: "openai",
      errorClass: "OpenAiProviderError",
      responseBodyRecorded: false,
      apiKeyRecorded: false
    });
    expect(JSON.stringify(result)).not.toContain("private-openai-key");
  });
});
