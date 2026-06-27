import { describe, expect, it, vi } from "vitest";

import type { OpenAiResponsesFetch } from "@amami-line-crm/ai";

import { runOpenAiRawResponsesSmokeCli } from "../../scripts/smoke/openai-raw-responses-smoke";

const approvedEnv = {
  AI_PROVIDER: "openai",
  OPENAI_API_KEY: "private-openai-key",
  OPENAI_MODEL: "gpt-test-model",
  OPENAI_REAL_API_SMOKE_APPROVED: "YES"
};

describe("Loop 165 OpenAI raw smoke sanitized error classification", () => {
  it("classifies 401/403 as auth or key rejected without leaking raw error fields", async () => {
    const result = await runFailedRawSmoke({
      status: 403,
      code: "invalid_api_key",
      type: "authentication_error",
      message: "private-openai-key and raw message must not print"
    });

    expect(result.stdout).toContain("error_status=403");
    expect(result.stdout).toContain("error_code=invalid_api_key");
    expect(result.stdout).toContain("error_type=authentication_error");
    expect(result.stdout).toContain("error_classification=C_auth_or_key_rejected");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(result.stdout).not.toContain("raw message");
  });

  it("classifies 404 as model missing or invalid", async () => {
    const result = await runFailedRawSmoke({
      status: 404,
      code: "model_not_found",
      type: "invalid_request_error",
      message: "model value must not print"
    });

    expect(result.stdout).toContain("error_status=404");
    expect(result.stdout).toContain("error_code=model_not_found");
    expect(result.stdout).toContain("error_type=invalid_request_error");
    expect(result.stdout).toContain("error_classification=B_model_missing_or_invalid");
    expect(result.stdout).not.toContain("model value must not print");
  });

  it("classifies 429 as quota billing or project access", async () => {
    const result = await runFailedRawSmoke({
      status: 429,
      code: "insufficient_quota",
      type: "rate_limit_error",
      message: "billing detail must not print"
    });

    expect(result.stdout).toContain("error_status=429");
    expect(result.stdout).toContain("error_code=insufficient_quota");
    expect(result.stdout).toContain("error_type=rate_limit_error");
    expect(result.stdout).toContain("error_classification=D_quota_or_billing_or_project_access");
    expect(result.stdout).not.toContain("billing detail");
  });

  it("classifies request validation errors as request shape or mapping bugs", async () => {
    const result = await runFailedRawSmoke({
      status: 400,
      code: "invalid_request_error",
      type: "invalid_request_error",
      message: "request body must not print"
    });

    expect(result.stdout).toContain("error_status=400");
    expect(result.stdout).toContain("error_code=invalid_request_error");
    expect(result.stdout).toContain("error_type=invalid_request_error");
    expect(result.stdout).toContain("error_classification=F_request_shape_or_provider_mapping_bug");
    expect(result.stdout).not.toContain("request body");
  });

  it("classifies upstream 5xx as network or timeout", async () => {
    const result = await runFailedRawSmoke({
      status: 503,
      code: "server_error",
      type: "server_error",
      message: "raw upstream detail must not print"
    });

    expect(result.stdout).toContain("error_status=503");
    expect(result.stdout).toContain("error_code=server_error");
    expect(result.stdout).toContain("error_type=server_error");
    expect(result.stdout).toContain("error_classification=E_network_or_timeout");
    expect(result.stdout).not.toContain("raw upstream detail");
  });

  it("classifies thrown transport failures as network or timeout", async () => {
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => {
      throw new Error("network failure with private-openai-key must not print");
    });

    const result = await runOpenAiRawResponsesSmokeCli({
      env: approvedEnv,
      openAiFetch
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("openai_raw_smoke=failed");
    expect(result.stdout).toContain("http_status=unavailable");
    expect(result.stdout).toContain("error_status=unavailable");
    expect(result.stdout).toContain("error_code=unavailable");
    expect(result.stdout).toContain("error_type=unavailable");
    expect(result.stdout).toContain("error_classification=E_network_or_timeout");
    expect(result.stdout).not.toContain("private-openai-key");
    expect(result.stdout).not.toContain("network failure");
  });
});

async function runFailedRawSmoke(input: {
  status: number;
  code: string;
  type: string;
  message: string;
}) {
  const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => ({
    ok: false,
    status: input.status,
    async json() {
      return {
        error: {
          code: input.code,
          type: input.type,
          message: input.message
        }
      };
    }
  }));

  const result = await runOpenAiRawResponsesSmokeCli({
    env: approvedEnv,
    openAiFetch
  });

  expect(openAiFetch).toHaveBeenCalledTimes(1);
  expect(result.exitCode).toBe(1);
  expect(result.stdout).toContain("openai_raw_smoke=failed");
  expect(result.stdout).toContain("request_sent=true");
  expect(result.stdout).toContain("response_body_recorded=false");
  expect(result.stdout).toContain("prompt_body_recorded=false");
  expect(result.stdout).toContain("api_key_recorded=false");
  expect(result.stdout).not.toContain("Authorization");
  expect(result.stdout).not.toContain(input.message);

  return result;
}
