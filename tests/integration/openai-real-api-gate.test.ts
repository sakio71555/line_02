import { describe, expect, it, vi } from "vitest";

import {
  evaluateOpenAiRealApiGate,
  OpenAiProvider,
  OpenAiProviderError,
  resolveAiProviderMode,
  type OpenAiResponsesRequest,
  type OpenAiResponsesTransport,
  type OpenAiResponsesTransportOptions,
  type OpenAiResponsesTransportResponse,
  type TenantAiSettingsForOpenAiGate
} from "@amami-line-crm/ai";

describe("Loop 103 OpenAI real API gate", () => {
  it("keeps the default provider mode as mock", () => {
    expect(resolveAiProviderMode({})).toBe("mock");
    expect(resolveAiProviderMode({ AI_PROVIDER: "mock" })).toBe("mock");
  });

  it("does not allow AI_PROVIDER=openai by itself", () => {
    const result = evaluateOpenAiRealApiGate({
      env: { AI_PROVIDER: "openai" },
      tenantAiSettings: enabledTenantAiSettings(),
      requestKind: "reply_draft"
    });

    expect(result).toEqual({
      ok: false,
      provider: "openai",
      reason: "openai_api_key_missing"
    });
  });

  it("requires an OpenAI model before real API use", () => {
    const result = evaluateOpenAiRealApiGate({
      env: {
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "private-openai-key"
      },
      tenantAiSettings: enabledTenantAiSettings(),
      requestKind: "summary"
    });

    expect(result).toEqual({
      ok: false,
      provider: "openai",
      reason: "openai_model_missing"
    });
  });

  it("requires tenant AI settings to explicitly allow OpenAI", () => {
    expect(
      evaluateOpenAiRealApiGate({
        env: enabledOpenAiEnv(),
        tenantAiSettings: null,
        requestKind: "summary"
      })
    ).toEqual({
      ok: false,
      provider: "openai",
      reason: "tenant_ai_settings_missing"
    });

    expect(
      evaluateOpenAiRealApiGate({
        env: enabledOpenAiEnv(),
        tenantAiSettings: {
          ...enabledTenantAiSettings(),
          provider: "mock"
        },
        requestKind: "summary"
      })
    ).toEqual({
      ok: false,
      provider: "openai",
      reason: "tenant_openai_not_allowed"
    });
  });

  it("requires the requested tenant AI feature to be enabled", () => {
    const result = evaluateOpenAiRealApiGate({
      env: enabledOpenAiEnv(),
      tenantAiSettings: {
        ...enabledTenantAiSettings(),
        reply_draft_enabled: false
      },
      requestKind: "reply_draft"
    });

    expect(result).toEqual({
      ok: false,
      provider: "openai",
      reason: "tenant_ai_feature_disabled"
    });
  });

  it("requires tenant-scoped RAG sources before answer draft", () => {
    const result = evaluateOpenAiRealApiGate({
      env: enabledOpenAiEnv(),
      tenantAiSettings: enabledTenantAiSettings(),
      requestKind: "rag_answer_draft",
      ragSourceCount: 0
    });

    expect(result).toEqual({
      ok: false,
      provider: "openai",
      reason: "rag_source_required"
    });
  });

  it("rejects auto-send settings and keeps AI output draft-only", () => {
    const result = evaluateOpenAiRealApiGate({
      env: enabledOpenAiEnv(),
      tenantAiSettings: {
        ...enabledTenantAiSettings(),
        auto_reply_enabled: true
      },
      requestKind: "reply_draft"
    });

    expect(result).toEqual({
      ok: false,
      provider: "openai",
      reason: "ai_auto_send_not_allowed"
    });
  });

  it("allows real provider boundary only when all gates pass", () => {
    const result = evaluateOpenAiRealApiGate({
      env: enabledOpenAiEnv(),
      tenantAiSettings: enabledTenantAiSettings(),
      requestKind: "rag_answer_draft",
      ragSourceCount: 2
    });

    expect(result).toEqual({
      ok: true,
      provider: "openai",
      model: "gpt-test-model",
      draftOnly: true,
      autoSendAllowed: false
    });
  });
});

describe("Loop 103 OpenAiProvider fake transport boundary", () => {
  it("builds Responses API-shaped payloads through an injected transport", async () => {
    const transport = new RecordingOpenAiTransport(
      JSON.stringify({
        draft_body: "担当者が確認してから送る返信案です。",
        next_questions: ["ご希望時期"],
        risk_flags: ["見積金額は断定しない"],
        recommended_response_mode: "human_required",
        should_handoff: true
      })
    );
    const provider = new OpenAiProvider({
      apiKey: "private-openai-key",
      model: "gpt-test-model",
      transport
    });

    const draft = await provider.draftReply({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_1",
      conversation: [
        {
          role: "customer",
          content: "オンライン相談をしたいです。",
          created_at: "2026-06-18T00:00:00.000Z"
        }
      ]
    });

    expect(draft).toMatchObject({
      provider: "openai",
      draft_body: "担当者が確認してから送る返信案です。",
      should_handoff: true
    });
    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0]).toMatchObject({
      options: { apiKey: "private-openai-key" },
      request: {
        model: "gpt-test-model",
        metadata: {
          tenant_id: "tenant_amamihome",
          customer_id: "customer_1",
          request_kind: "reply_draft",
          draft_only: "true",
          auto_send: "false"
        },
        text: {
          format: {
            type: "json_object"
          }
        }
      }
    });
  });

  it("does not use global fetch when fake transport is injected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiProvider({
      apiKey: "private-openai-key",
      model: "gpt-test-model",
      transport: new RecordingOpenAiTransport(
        JSON.stringify({
          summary: "会話要約",
          next_actions: ["担当者確認"],
          risk_flags: ["断定しない"],
          recommended_response_mode: "human_required"
        })
      )
    });

    await provider.summarizeConversation({
      tenant_id: "tenant_amamihome",
      customer_id: "customer_1",
      conversation: [
        {
          role: "customer",
          content: "資料請求したいです。",
          created_at: "2026-06-18T00:00:00.000Z"
        }
      ]
    });

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("redacts API key, prompt, and raw transport details from provider errors", async () => {
    const provider = new OpenAiProvider({
      apiKey: "private-openai-key",
      model: "gpt-test-model",
      transport: {
        async createResponse(): Promise<OpenAiResponsesTransportResponse> {
          throw new Error("private-openai-key leaked full prompt オンライン相談");
        }
      }
    });

    await expect(
      provider.draftReply({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_1",
        conversation: [
          {
            role: "customer",
            content: "オンライン相談",
            created_at: "2026-06-18T00:00:00.000Z"
          }
        ]
      })
    ).rejects.toThrow(OpenAiProviderError);

    await expect(
      provider.draftReply({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_1",
        conversation: [
          {
            role: "customer",
            content: "オンライン相談",
            created_at: "2026-06-18T00:00:00.000Z"
          }
        ]
      })
    ).rejects.not.toThrow("private-openai-key");
  });
});

function enabledOpenAiEnv(): Pick<
  NodeJS.ProcessEnv,
  "AI_PROVIDER" | "OPENAI_API_KEY" | "OPENAI_MODEL"
> {
  return {
    AI_PROVIDER: "openai",
    OPENAI_API_KEY: "private-openai-key",
    OPENAI_MODEL: "gpt-test-model"
  };
}

function enabledTenantAiSettings(): TenantAiSettingsForOpenAiGate {
  return {
    tenant_id: "tenant_amamihome",
    provider: "openai",
    summary_enabled: true,
    reply_draft_enabled: true,
    rag_enabled: true,
    auto_reply_enabled: false
  };
}

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
