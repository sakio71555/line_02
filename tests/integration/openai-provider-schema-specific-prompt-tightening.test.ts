import { describe, expect, it, vi } from "vitest";

import {
  MockAiProvider,
  OpenAiProvider,
  OpenAiProviderError,
  OPENAI_DRAFT_REPLY_REQUIRED_FIELDS,
  validateOpenAiDraftReplyContract,
  type OpenAiResponsesFetch,
  type OpenAiResponsesRequest,
  type OpenAiResponsesTransport,
  type OpenAiResponsesTransportOptions,
  type OpenAiResponsesTransportResponse
} from "@amami-line-crm/ai";

import { runOpenAiProviderBoundarySmokeCli } from "../../scripts/smoke/openai-provider-smoke";

describe("Loop 168 OpenAI provider schema-specific prompt tightening", () => {
  it("documents the required draftReply contract fields in code", () => {
    expect([...OPENAI_DRAFT_REPLY_REQUIRED_FIELDS]).toEqual([
      "draft_body",
      "next_questions",
      "risk_flags",
      "recommended_response_mode",
      "should_handoff"
    ]);
  });

  it("keeps MockAiProvider and OpenAiProvider draftReply response shapes aligned", async () => {
    const mockDraft = await new MockAiProvider().draftReply(createDraftInput());
    const transport = new RecordingOpenAiTransport(validDraftJson());
    const openAiDraft = await createOpenAiProvider(transport).draftReply(createDraftInput());

    expect(Object.keys(openAiDraft).sort()).toEqual(Object.keys(mockDraft).sort());
    expect(openAiDraft).toMatchObject({
      provider: "openai",
      draft_body: expect.any(String),
      next_questions: expect.arrayContaining([expect.any(String)]),
      risk_flags: expect.arrayContaining([expect.any(String)]),
      recommended_response_mode: "human_required",
      should_handoff: true
    });
  });

  it("accepts valid draftReply JSON and ignores extra fields", () => {
    expect(() =>
      validateOpenAiDraftReplyContract({
        ...validDraftObject(),
        ignored_extra_field: "extra field should be ignored"
      })
    ).not.toThrow();
  });

  it("reports missing field names only for invalid draftReply JSON", async () => {
    const provider = createOpenAiProvider(
      new RecordingOpenAiTransport(
        JSON.stringify({
          draft_body: "safe draft",
          recommended_response_mode: "human_required",
          should_handoff: true
        })
      )
    );

    await expect(() => provider.draftReply(createDraftInput())).rejects.toMatchObject({
      classification: "G_response_parse_bug",
      jsonContractParseSuccess: true,
      jsonContractSchemaValid: false,
      parseStage: "schema_validation",
      schemaMissingFields: ["next_questions", "risk_flags"],
      schemaInvalidFields: []
    });
  });

  it("reports invalid field names only for invalid draftReply JSON", async () => {
    const rawJsonValue = "RAW_JSON_VALUE_SHOULD_NOT_PRINT";
    const provider = createOpenAiProvider(
      new RecordingOpenAiTransport(
        JSON.stringify({
          ...validDraftObject(),
          draft_body: rawJsonValue,
          recommended_response_mode: "not_a_mode",
          should_handoff: "yes"
        })
      )
    );

    try {
      await provider.draftReply(createDraftInput());
      throw new Error("expected draftReply to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenAiProviderError);
      expect((error as OpenAiProviderError).schemaMissingFields).toEqual([]);
      expect((error as OpenAiProviderError).schemaInvalidFields).toEqual([
        "recommended_response_mode",
        "should_handoff"
      ]);
      expect((error as Error).message).not.toContain(rawJsonValue);
    }
  });

  it("tightens the draftReply prompt to the exact contract without changing API response shape", async () => {
    const transport = new RecordingOpenAiTransport(validDraftJson());
    const draft = await createOpenAiProvider(transport).draftReply(createDraftInput());
    const request = transport.calls[0]?.request;
    const prompt = request?.input.find((message) => message.role === "user")?.content ?? "";

    expect(draft).toMatchObject({
      draft_body: "担当者が確認してから送る返信案です。",
      next_questions: ["ご希望時期"],
      risk_flags: ["見積金額は断定しない"],
      recommended_response_mode: "human_required",
      should_handoff: true,
      provider: "openai"
    });
    expect(prompt).toContain("draft_body");
    expect(prompt).toContain("next_questions");
    expect(prompt).toContain("risk_flags");
    expect(prompt).toContain("recommended_response_mode");
    expect(prompt).toContain("should_handoff");
    expect(prompt).toContain("Markdown");
    expect(prompt).toContain("code fence");
    expect(prompt).toContain("禁止");
    expect(request).toMatchObject({
      metadata: {
        request_kind: "reply_draft",
        draft_only: "true",
        auto_send: "false"
      },
      text: {
        format: {
          type: "json_object"
        }
      }
    });
  });

  it("prints schema field diagnostics without raw JSON, prompt, key, or model values", async () => {
    const rawProviderValue = "RAW_PROVIDER_VALUE_SHOULD_NOT_PRINT";
    const openAiFetch = vi.fn<OpenAiResponsesFetch>(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          output_text: JSON.stringify({
            draft_body: rawProviderValue,
            recommended_response_mode: "invalid_mode",
            should_handoff: "yes"
          })
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

    expect(result.exitCode).toBe(1);
    expect(openAiFetch).toHaveBeenCalledTimes(1);
    expect(result.stdout).toContain("openai_provider_smoke=failed");
    expect(result.stdout).toContain("json_contract_parse_success=true");
    expect(result.stdout).toContain("json_contract_schema_valid=false");
    expect(result.stdout).toContain("parse_stage=schema_validation");
    expect(result.stdout).toContain("schema_missing_fields=next_questions,risk_flags");
    expect(result.stdout).toContain(
      "schema_invalid_fields=recommended_response_mode,should_handoff"
    );
    expect(result.stdout).toContain("classification=G_response_parse_bug");
    expect(result.stdout).toContain("response_body_recorded=false");
    expect(result.stdout).toContain("prompt_body_recorded=false");
    expect(result.stdout).toContain("api_key_recorded=false");
    expect(result.stdout).toContain("model_value_recorded=false");
    expect(result.stdout).not.toContain(rawProviderValue);
    expect(result.stdout).not.toContain("private-openai-key");
    expect(result.stdout).not.toContain("gpt-test-model");
    expect(result.stdout).not.toContain("Non-personal internal OpenAI smoke test");
  });
});

class RecordingOpenAiTransport implements OpenAiResponsesTransport {
  readonly calls: Array<{
    request: OpenAiResponsesRequest;
    options: OpenAiResponsesTransportOptions;
  }> = [];

  constructor(private readonly outputText: string) {}

  async createResponse(
    request: OpenAiResponsesRequest,
    options: OpenAiResponsesTransportOptions
  ): Promise<OpenAiResponsesTransportResponse> {
    this.calls.push({ request, options });

    return { output_text: this.outputText };
  }
}

function createOpenAiProvider(transport: OpenAiResponsesTransport): OpenAiProvider {
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

function validDraftObject() {
  return {
    draft_body: "担当者が確認してから送る返信案です。",
    next_questions: ["ご希望時期"],
    risk_flags: ["見積金額は断定しない"],
    recommended_response_mode: "human_required",
    should_handoff: true
  };
}

function validDraftJson(): string {
  return JSON.stringify(validDraftObject());
}
