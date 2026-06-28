import { describe, expect, it, vi } from "vitest";

import {
  OpenAiProvider,
  OpenAiProviderError,
  parseOpenAiJsonContractText,
  type OpenAiResponsesFetch,
  type OpenAiResponsesTransport
} from "@amami-line-crm/ai";

import { runOpenAiProviderBoundarySmokeCli } from "../../scripts/smoke/openai-provider-smoke";

describe("Loop 167 OpenAI JSON output contract remediation", () => {
  it("parses compact JSON objects", () => {
    expect(parseOpenAiJsonContractText('{"ok":true,"message":"ready"}')).toEqual({
      ok: true,
      message: "ready"
    });
  });

  it("parses pretty JSON objects", () => {
    expect(
      parseOpenAiJsonContractText(`{
  "ok": true,
  "message": "ready"
}`)
    ).toEqual({
      ok: true,
      message: "ready"
    });
  });

  it("parses JSON inside markdown code fences", () => {
    expect(
      parseOpenAiJsonContractText(`\`\`\`json
{
  "ok": true,
  "message": "ready"
}
\`\`\``)
    ).toEqual({
      ok: true,
      message: "ready"
    });
  });

  it("parses JSON with surrounding whitespace", () => {
    expect(parseOpenAiJsonContractText('  \n\t{"ok":true,"message":"ready"}\n  ')).toEqual({
      ok: true,
      message: "ready"
    });
  });

  it("extracts the first balanced JSON object when light surrounding prose is present", () => {
    expect(
      parseOpenAiJsonContractText(
        'Result follows: {"ok":true,"message":"brace in string: { not a block }"} done.'
      )
    ).toEqual({
      ok: true,
      message: "brace in string: { not a block }"
    });
  });

  it("classifies blank text without leaking raw content", () => {
    expect(() => parseOpenAiJsonContractText("   ")).toThrow(OpenAiProviderError);

    try {
      parseOpenAiJsonContractText("   ");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenAiProviderError);
      expect((error as OpenAiProviderError).classification).toBe("G_response_parse_bug");
      expect((error as OpenAiProviderError).providerOutputTextExtracted).toBe(true);
      expect((error as OpenAiProviderError).jsonContractParseSuccess).toBe(false);
      expect((error as OpenAiProviderError).jsonContractSchemaValid).toBe(false);
      expect((error as OpenAiProviderError).parseStage).toBe("json_parse");
      expect((error as Error).message).not.toContain("OPENAI_API_KEY");
      expect((error as Error).message).not.toContain("Authorization");
    }
  });

  it("classifies malformed JSON without leaking raw JSON", () => {
    const rawJson = '{"draft_body":"RAW_JSON_SHOULD_NOT_PRINT"';

    try {
      parseOpenAiJsonContractText(rawJson);
    } catch (error) {
      expect(error).toBeInstanceOf(OpenAiProviderError);
      expect((error as OpenAiProviderError).classification).toBe("G_response_parse_bug");
      expect((error as OpenAiProviderError).parseStage).toBe("json_parse");
      expect((error as Error).message).not.toContain(rawJson);
      expect((error as Error).message).not.toContain("RAW_JSON_SHOULD_NOT_PRINT");
    }
  });

  it("classifies missing reply draft fields as schema validation failures", async () => {
    const provider = createProviderWithOutput({
      draft_body: "safe text"
    });

    await expect(() => provider.draftReply(createDraftInput())).rejects.toMatchObject({
      classification: "G_response_parse_bug",
      providerOutputTextExtracted: true,
      jsonContractParseSuccess: true,
      jsonContractSchemaValid: false,
      parseStage: "schema_validation"
    });
  });

  it("classifies invalid reply draft field types as schema validation failures", async () => {
    const provider = createProviderWithOutput({
      draft_body: "safe text",
      next_questions: ["safe question"],
      risk_flags: ["safe risk"],
      recommended_response_mode: "human_required",
      should_handoff: "yes"
    });

    await expect(() => provider.draftReply(createDraftInput())).rejects.toMatchObject({
      classification: "G_response_parse_bug",
      providerOutputTextExtracted: true,
      jsonContractParseSuccess: true,
      jsonContractSchemaValid: false,
      parseStage: "schema_validation"
    });
  });

  it("does not print extracted text, prompt, model value, API key, or raw response body in smoke output", async () => {
    const rawResponseBody = "RAW_PROVIDER_RESPONSE_BODY_SHOULD_NOT_PRINT";
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          output_text: `\`\`\`json
${JSON.stringify({
  draft_body: rawResponseBody,
  next_questions: ["safe question"],
  risk_flags: ["safe risk"],
  recommended_response_mode: "human_required",
  should_handoff: true
})}
\`\`\``
        };
      }
    }));

    const result = await runOpenAiProviderBoundarySmokeCli({
      env: {
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "private-openai-key",
        OPENAI_MODEL: "gpt-test-model",
        OPENAI_REAL_API_SMOKE_APPROVED: "YES"
      },
      openAiFetch
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("openai_provider_smoke=success");
    expect(result.stdout).toContain("provider_output_text_extracted=true");
    expect(result.stdout).toContain("json_contract_parse_success=true");
    expect(result.stdout).toContain("json_contract_schema_valid=true");
    expect(result.stdout).toContain("response_body_recorded=false");
    expect(result.stdout).toContain("prompt_body_recorded=false");
    expect(result.stdout).toContain("api_key_recorded=false");
    expect(result.stdout).toContain("model_value_recorded=false");
    expect(result.stdout).not.toContain(rawResponseBody);
    expect(result.stdout).not.toContain("private-openai-key");
    expect(result.stdout).not.toContain("gpt-test-model");
    expect(result.stdout).not.toContain("Non-personal internal OpenAI smoke test");
  });
});

function createProviderWithOutput(output: Record<string, unknown>): OpenAiProvider {
  const transport: OpenAiResponsesTransport = {
    async createResponse() {
      return {
        output_text: JSON.stringify(output)
      };
    }
  };

  return new OpenAiProvider({
    apiKey: "private-openai-key",
    model: "gpt-test-model",
    transport
  });
}

function createDraftInput() {
  return {
    tenant_id: "tenant_amamihome",
    customer_id: "customer_test",
    conversation: [
      {
        role: "customer" as const,
        content: "non personal test message",
        created_at: "2026-06-28T00:00:00.000Z"
      }
    ]
  };
}
