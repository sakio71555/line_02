import { describe, expect, it, vi } from "vitest";

import type { OpenAiResponsesFetch } from "@amami-line-crm/ai";

import {
  runOpenAiProviderBoundarySmokeCli,
  runOpenAiProviderSmokeCli
} from "../../scripts/smoke/openai-provider-smoke";

describe("Loop 165 OpenAI provider smoke command", () => {
  it("fails fast when OPENAI_API_KEY is missing and skips provider smoke", async () => {
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
    expect(result.stdout).toContain("openai_raw_smoke=not_performed");
    expect(result.stdout).toContain("reason=openai_api_key_missing");
    expect(result.stdout).toContain("openai_provider_smoke=skipped");
    expect(result.stdout).toContain("openai_smoke_final=not_performed");
    expect(result.stdout).toContain("request_sent=false");
    expect(openAiFetch).not.toHaveBeenCalled();
  });

  it("fails fast when OPENAI_MODEL is missing and does not print the key", async () => {
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
    expect(result.stdout).toContain("openai_raw_smoke=not_performed");
    expect(result.stdout).toContain("reason=openai_model_missing");
    expect(result.stdout).toContain("openai_provider_smoke=skipped");
    expect(result.stdout).toContain("openai_smoke_final=not_performed");
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
    expect(result.stdout).toContain("openai_raw_smoke=not_performed");
    expect(result.stdout).toContain("reason=openai_real_api_smoke_not_approved");
    expect(result.stdout).toContain("openai_provider_smoke=skipped");
    expect(result.stdout).toContain("openai_smoke_final=not_performed");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(openAiFetch).not.toHaveBeenCalled();
  });

  it("runs provider smoke after raw success and does not print response bodies", async () => {
    const rawResponseBody = "RAW_RESPONSE_BODY_SHOULD_NOT_PRINT";
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async (_input, _init) => {
      if (openAiFetch.mock.calls.length === 1) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { id: "raw-diagnostic-response" };
          }
        };
      }

      return {
        ok: true,
        status: 200,
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
      };
    });

    const result = await runOpenAiProviderSmokeCli({
      env: approvedEnv(),
      openAiFetch
    });

    expect(result.exitCode).toBe(0);
    expect(openAiFetch).toHaveBeenCalledTimes(2);
    expect(result.stdout).toContain("openai_raw_smoke=success");
    expect(result.stdout).toContain("openai_provider_smoke=success");
    expect(result.stdout).toContain("openai_smoke_final=success");
    expect(result.stdout).toContain("response_body_recorded=false");
    expect(result.stdout).toContain("prompt_body_recorded=false");
    expect(result.stdout).toContain("api_key_recorded=false");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(result.stdout).not.toContain(rawResponseBody);
  });

  it("skips provider smoke when raw diagnostic fails", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => ({
      ok: false,
      status: 401,
      async json() {
        return {
          error: {
            code: "invalid_api_key",
            type: "authentication_error",
            message: "private-openai-key should not be printed"
          }
        };
      }
    }));

    const result = await runOpenAiProviderSmokeCli({
      env: approvedEnv(),
      openAiFetch
    });

    expect(openAiFetch).toHaveBeenCalledTimes(1);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("openai_raw_smoke=failed");
    expect(result.stdout).toContain("error_status=401");
    expect(result.stdout).toContain("error_code=invalid_api_key");
    expect(result.stdout).toContain("error_type=authentication_error");
    expect(result.stdout).toContain("error_classification=C_auth_or_key_rejected");
    expect(result.stdout).toContain("openai_provider_smoke=skipped");
    expect(result.stdout).toContain("openai_smoke_final=failed");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(result.stdout).not.toContain("Authorization");
  });

  it("classifies provider failure after raw success as provider-side failure", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => {
      if (openAiFetch.mock.calls.length === 1) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { id: "raw-diagnostic-response" };
          }
        };
      }

      return {
        ok: false,
        status: 400,
        async json() {
          return {
            error: {
              code: "invalid_request_error",
              type: "invalid_request_error",
              message: "request body must not print"
            }
          };
        }
      };
    });

    const result = await runOpenAiProviderSmokeCli({
      env: approvedEnv(),
      openAiFetch
    });

    expect(openAiFetch).toHaveBeenCalledTimes(2);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("openai_raw_smoke=success");
    expect(result.stdout).toContain("openai_provider_smoke=failed");
    expect(result.stdout).toContain("provider_error_classification=F_request_shape_or_provider_mapping_bug");
    expect(result.stdout).toContain("openai_smoke_final=failed");
    expect(result.stdout).toContain("error_classification=F_request_shape_or_provider_mapping_bug");
    expect(result.stdout).not.toContain("request body");
  });

  it("can run the provider boundary smoke without repeating raw diagnostic smoke", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          output_text: JSON.stringify({
            draft_body: "provider output should not print",
            next_questions: ["dummy question"],
            risk_flags: ["dummy risk"],
            recommended_response_mode: "human_required",
            should_handoff: true
          })
        };
      }
    }));

    const result = await runOpenAiProviderBoundarySmokeCli({
      env: approvedEnv(),
      openAiFetch
    });

    expect(result.exitCode).toBe(0);
    expect(openAiFetch).toHaveBeenCalledTimes(1);
    expect(result.stdout).toContain("openai_provider_smoke=success");
    expect(result.stdout).not.toContain("openai_raw_smoke=");
    expect(result.stdout).not.toContain("provider output should not print");
    expect(result.stdout).not.toContain("private-openai-key");
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
