import OpenAI from "openai";

import type { TenantScoped } from "@amami-line-crm/shared";

export interface AiConversationTurn {
  role: "customer" | "staff" | "system";
  content: string;
  created_at: string;
}

export interface AiRequestBase extends TenantScoped {
  customer_id: string;
  consultation_id?: string;
}

export interface AiSummaryInput extends AiRequestBase {
  conversation: AiConversationTurn[];
}

export interface AiSummary {
  summary: string;
  risks: string[];
  next_action: string;
  provider: "mock" | "openai";
}

export interface AiReplyDraftInput extends AiRequestBase {
  conversation: AiConversationTurn[];
  staff_context?: string;
}

export interface AiReplyDraft {
  reply: string;
  should_escalate_to_human: boolean;
  reasons: string[];
  provider: "mock" | "openai";
}

export interface AiProvider {
  summarizeConversation(input: AiSummaryInput): Promise<AiSummary>;
  draftReply(input: AiReplyDraftInput): Promise<AiReplyDraft>;
}

export class MockAiProvider implements AiProvider {
  async summarizeConversation(input: AiSummaryInput): Promise<AiSummary> {
    const latest = input.conversation.at(-1)?.content ?? "相談内容はまだありません";

    return {
      summary: `顧客 ${input.customer_id} の最新相談: ${latest}`,
      risks: [],
      next_action: "担当者が内容を確認し、必要に応じて返信する",
      provider: "mock"
    };
  }

  async draftReply(input: AiReplyDraftInput): Promise<AiReplyDraft> {
    const latest = input.conversation.at(-1)?.content ?? "";

    return {
      reply: latest
        ? "お問い合わせありがとうございます。担当者が内容を確認してご案内します。"
        : "お問い合わせありがとうございます。ご相談内容をお送りください。",
      should_escalate_to_human: true,
      reasons: ["Phase 0ではAI自動返信ではなく、担当者確認前提の返信下書きのみ生成します"],
      provider: "mock"
    };
  }
}

export function createMockAiProvider(): AiProvider {
  return new MockAiProvider();
}

export class OpenAiProvider implements AiProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(input: { apiKey: string; model: string }) {
    this.client = new OpenAI({ apiKey: input.apiKey });
    this.model = input.model;
  }

  getRuntimeInfo(): { provider: "openai"; model: string; clientReady: boolean } {
    return {
      provider: "openai",
      model: this.model,
      clientReady: Boolean(this.client)
    };
  }

  async summarizeConversation(_input: AiSummaryInput): Promise<AiSummary> {
    throw new Error("OpenAiProvider is scaffolded only in Phase 0; use MockAiProvider.");
  }

  async draftReply(_input: AiReplyDraftInput): Promise<AiReplyDraft> {
    throw new Error("OpenAiProvider is scaffolded only in Phase 0; use MockAiProvider.");
  }
}
