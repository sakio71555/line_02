import { describe, expect, it, vi } from "vitest";

import type { OpenAiResponsesFetch } from "@amami-line-crm/ai";

import { runOpenAiRawResponsesSmokeCli } from "../../scripts/smoke/openai-raw-responses-smoke";

describe("Loop 165 raw Responses API diagnostic smoke script", () => {
  it("fails fast when OPENAI_API_KEY is missing", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>();
    const result = await runOpenAiRawResponsesSmokeCli({
      env: {
        AI_PROVIDER: "openai",
        OPENAI_MODEL: "gpt-test-model",
        OPENAI_REAL_API_SMOKE_APPROVED: "YES"
      },
      openAiFetch
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("openai_raw_smoke=not_performed");
    expect(result.stdout).toContain("reason=openai_api_key_missing");
    expect(result.stdout).toContain("request_sent=false");
    expect(openAiFetch).not.toHaveBeenCalled();
  });

  it("fails fast when OPENAI_MODEL is missing", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>();
    const result = await runOpenAiRawResponsesSmokeCli({
      env: {
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "private-openai-key",
        OPENAI_REAL_API_SMOKE_APPROVED: "YES"
      },
      openAiFetch
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("openai_raw_smoke=not_performed");
    expect(result.stdout).toContain("reason=openai_model_missing");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(openAiFetch).not.toHaveBeenCalled();
  });

  it("sends the minimal raw Responses API request shape without printing sensitive values", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => ({
      ok: true,
      status: 200,
      async json() {
        return { id: "raw-diagnostic-response" };
      }
    }));

    const result = await runOpenAiRawResponsesSmokeCli({
      env: approvedEnv(),
      openAiFetch
    });

    expect(result.exitCode).toBe(0);
    expect(openAiFetch).toHaveBeenCalledTimes(1);
    expect(openAiFetch.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/responses");
    const requestInit = openAiFetch.mock.calls[0]?.[1];
    expect(requestInit?.method).toBe("POST");
    expect(String(requestInit?.body)).not.toContain("private-openai-key");
    const body = JSON.parse(String(requestInit?.body)) as {
      model?: string;
      input?: unknown;
      max_output_tokens?: number;
      store?: boolean;
    };
    expect(body.model).toBe("gpt-test-model");
    expect(typeof body.input).toBe("string");
    expect(body.max_output_tokens).toBe(16);
    expect(body.store).toBe(false);
    expect(result.stdout).toContain("openai_raw_smoke=success");
    expect(result.stdout).toContain("endpoint=responses");
    expect(result.stdout).toContain("http_status=200");
    expect(result.stdout).toContain("response_body_recorded=false");
    expect(result.stdout).toContain("prompt_body_recorded=false");
    expect(result.stdout).toContain("api_key_recorded=false");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(result.stdout).not.toContain("gpt-test-model");
    expect(result.stdout).not.toContain(String(body.input));
  });

  it("does not print raw response body or raw error message on failure", async () => {
    const rawResponseBody = "RAW_RESPONSE_BODY_SHOULD_NOT_PRINT";
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => ({
      ok: false,
      status: 400,
      async json() {
        return {
          error: {
            code: "invalid_request_error",
            type: "invalid_request_error",
            message: rawResponseBody
          }
        };
      }
    }));

    const result = await runOpenAiRawResponsesSmokeCli({
      env: approvedEnv(),
      openAiFetch
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("openai_raw_smoke=failed");
    expect(result.stdout).toContain("error_classification=F_request_shape_or_provider_mapping_bug");
    expect(result.stdout).not.toContain(rawResponseBody);
    expect(result.stdout).not.toContain("private-openai-key");
    expect(result.stdout).not.toContain("Authorization");
    expect(result.stdout).not.toContain("gpt-test-model");
  });
});

function approvedEnv(): NodeJS.ProcessEnv {
  return {
    AI_PROVIDER: "openai",
    OPENAI_API_KEY: "private-openai-key",
    OPENAI_MODEL: "gpt-test-model",
    OPENAI_REAL_API_SMOKE_APPROVED: "YES"
  };
}
