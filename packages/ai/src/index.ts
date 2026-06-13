import OpenAI from "openai";

import type { TenantScoped } from "@amami-line-crm/shared";

export type AiConversationRole = "customer" | "bot" | "staff" | "system" | "ai";

export type AiRecommendedResponseMode =
  | "bot_auto"
  | "human_required"
  | "human_active"
  | "emergency"
  | "closed";

export interface AiConversationTurn {
  role: AiConversationRole;
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
  next_actions: string[];
  risk_flags: string[];
  recommended_response_mode: AiRecommendedResponseMode;
  provider: "mock" | "openai";
}

export interface AiReplyDraftInput extends AiRequestBase {
  conversation: AiConversationTurn[];
  staff_context?: string;
}

export interface AiReplyDraft {
  draft_body: string;
  next_questions: string[];
  risk_flags: string[];
  recommended_response_mode: AiRecommendedResponseMode;
  should_handoff: boolean;
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
      summary: `顧客 ${input.customer_id} の会話要約: ${latest}`,
      next_actions: ["担当者が内容を確認し、必要に応じて返信する"],
      risk_flags: ["見積金額、土地価格、在庫、補助金、契約条件、保証判断は断定しない"],
      recommended_response_mode: "human_required",
      provider: "mock"
    };
  }

  async draftReply(input: AiReplyDraftInput): Promise<AiReplyDraft> {
    const latest = input.conversation.at(-1)?.content ?? "";

    return {
      draft_body: latest
        ? "お問い合わせありがとうございます。ご相談内容を確認しました。担当者より詳しい内容を確認のうえご案内します。"
        : "お問い合わせありがとうございます。ご相談内容をお送りください。",
      next_questions: ["ご希望時期", "建築予定エリア", "見学または相談の希望日時"],
      risk_flags: ["見積金額、土地価格、在庫、補助金、契約条件、保証判断は断定しない"],
      recommended_response_mode: "human_required",
      should_handoff: true,
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
