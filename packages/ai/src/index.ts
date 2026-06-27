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

export interface AiRagAnswerSource {
  id: string;
  title: string;
  url: string;
  category: string;
  source_type: string;
  excerpt: string;
  score: number;
}

export interface AiRagAnswerDraftInput extends TenantScoped {
  query: string;
  sources: AiRagAnswerSource[];
}

export interface AiRagAnswerDraft {
  can_answer: boolean;
  answer_body: string;
  sources: AiRagAnswerSource[];
  risk_flags: string[];
  handoff_required: boolean;
  recommended_response_mode: AiRecommendedResponseMode;
  provider: "mock" | "openai";
}

export interface AiProvider {
  summarizeConversation(input: AiSummaryInput): Promise<AiSummary>;
  draftReply(input: AiReplyDraftInput): Promise<AiReplyDraft>;
  draftRagAnswer(input: AiRagAnswerDraftInput): Promise<AiRagAnswerDraft>;
}

export const AI_PROVIDER_ENV_NAME = "AI_PROVIDER";
export const OPENAI_API_KEY_ENV_NAME = "OPENAI_API_KEY";
export const OPENAI_MODEL_ENV_NAME = "OPENAI_MODEL";

export type AiProviderMode = "mock" | "openai";
export type OpenAiRealApiRequestKind = "summary" | "reply_draft" | "rag_answer_draft";

export interface TenantAiSettingsForOpenAiGate {
  tenant_id: string;
  provider: string;
  summary_enabled: boolean;
  reply_draft_enabled: boolean;
  rag_enabled: boolean;
  auto_reply_enabled: boolean;
}

export type OpenAiRealApiGateFailureReason =
  | "ai_provider_not_openai"
  | "openai_api_key_missing"
  | "openai_model_missing"
  | "tenant_ai_settings_missing"
  | "tenant_openai_not_allowed"
  | "tenant_ai_feature_disabled"
  | "rag_source_required"
  | "ai_auto_send_not_allowed";

export type OpenAiRealApiGateResult =
  | {
      ok: true;
      provider: "openai";
      model: string;
      draftOnly: true;
      autoSendAllowed: false;
    }
  | {
      ok: false;
      provider: AiProviderMode;
      reason: OpenAiRealApiGateFailureReason;
    };

export interface OpenAiRealApiGateInput {
  env: Pick<NodeJS.ProcessEnv, "AI_PROVIDER" | "OPENAI_API_KEY" | "OPENAI_MODEL">;
  tenantAiSettings?: TenantAiSettingsForOpenAiGate | null;
  requestKind: OpenAiRealApiRequestKind;
  ragSourceCount?: number;
  autoSendRequested?: boolean;
}

export interface OpenAiResponsesMessage {
  role: "system" | "user";
  content: string;
}

export interface OpenAiResponsesRequest {
  model: string;
  input: OpenAiResponsesMessage[];
  metadata: Record<string, string>;
  text: {
    format: {
      type: "json_object";
    };
  };
}

export interface OpenAiResponsesTransportOptions {
  apiKey: string;
}

export interface OpenAiResponsesTransportResponse {
  output_text?: string;
  outputText?: string;
}

export interface OpenAiResponsesFetchResponse {
  ok: boolean;
  json(): Promise<unknown>;
}

export type OpenAiResponsesFetch = (
  input: string,
  init: RequestInit
) => Promise<OpenAiResponsesFetchResponse>;

export interface OpenAiResponsesTransport {
  createResponse(
    request: OpenAiResponsesRequest,
    options: OpenAiResponsesTransportOptions
  ): Promise<OpenAiResponsesTransportResponse>;
}

export class OpenAiProviderError extends Error {
  readonly code = "openai_provider_failed";

  constructor() {
    super("OpenAI provider request failed.");
    this.name = "OpenAiProviderError";
  }
}

export class FetchOpenAiResponsesTransport implements OpenAiResponsesTransport {
  private readonly endpoint: string;
  private readonly fetchImplementation: OpenAiResponsesFetch;

  constructor(input: { endpoint?: string; fetch?: OpenAiResponsesFetch } = {}) {
    this.endpoint = input.endpoint ?? "https://api.openai.com/v1/responses";
    this.fetchImplementation = input.fetch ?? (fetch.bind(globalThis) as OpenAiResponsesFetch);
  }

  async createResponse(
    request: OpenAiResponsesRequest,
    options: OpenAiResponsesTransportOptions
  ): Promise<OpenAiResponsesTransportResponse> {
    const response = await this.fetchImplementation(this.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new OpenAiProviderError();
    }

    const payload = await response.json();

    return normalizeOpenAiResponsesPayload(payload);
  }
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

  async draftRagAnswer(input: AiRagAnswerDraftInput): Promise<AiRagAnswerDraft> {
    const primarySource = input.sources[0];
    const answerBody = primarySource
      ? `${primarySource.title}について、公式情報候補を確認しました。詳細や最新状況は担当者が確認してご案内します。`
      : "公式情報では確認できません。担当者が確認します。";

    return {
      can_answer: input.sources.length > 0,
      answer_body: answerBody,
      sources: input.sources,
      risk_flags: ["見積金額、土地価格、在庫、補助金、契約条件、保証判断は断定しない"],
      handoff_required: true,
      recommended_response_mode: "human_required",
      provider: "mock"
    };
  }
}

export function createMockAiProvider(): AiProvider {
  return new MockAiProvider();
}

export class OpenAiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly transport: OpenAiResponsesTransport;

  constructor(input: { apiKey: string; model: string; transport: OpenAiResponsesTransport }) {
    this.apiKey = requireNonEmptyOpenAiConfig(input.apiKey);
    this.model = requireNonEmptyOpenAiConfig(input.model);
    this.transport = input.transport;
  }

  getRuntimeInfo(): { provider: "openai"; model: string; transportReady: boolean } {
    return {
      provider: "openai",
      model: this.model,
      transportReady: Boolean(this.transport)
    };
  }

  async summarizeConversation(input: AiSummaryInput): Promise<AiSummary> {
    try {
      const result = await this.transport.createResponse(
        createOpenAiResponsesRequest({
          model: this.model,
          requestKind: "summary",
          tenant_id: input.tenant_id,
          customer_id: input.customer_id,
          prompt: buildConversationPrompt({
            instruction:
              "会話を担当者支援用に要約し、summary, next_actions, risk_flags, recommended_response_mode をJSONで返してください。",
            conversation: input.conversation
          })
        }),
        { apiKey: this.apiKey }
      );
      const parsed = parseOpenAiJsonResponse(result);

      return {
        summary: readRequiredString(parsed, "summary"),
        next_actions: readStringArray(parsed, "next_actions"),
        risk_flags: readStringArray(parsed, "risk_flags"),
        recommended_response_mode: readRecommendedResponseMode(parsed),
        provider: "openai"
      };
    } catch {
      throw new OpenAiProviderError();
    }
  }

  async draftReply(input: AiReplyDraftInput): Promise<AiReplyDraft> {
    try {
      const result = await this.transport.createResponse(
        createOpenAiResponsesRequest({
          model: this.model,
          requestKind: "reply_draft",
          tenant_id: input.tenant_id,
          customer_id: input.customer_id,
          prompt: buildConversationPrompt({
            instruction:
              "担当者が確認して送る返信下書きを短く作り、draft_body, next_questions, risk_flags, recommended_response_mode, should_handoff をJSONで返してください。",
            conversation: input.conversation,
            ...(input.staff_context ? { staffContext: input.staff_context } : {})
          })
        }),
        { apiKey: this.apiKey }
      );
      const parsed = parseOpenAiJsonResponse(result);

      return {
        draft_body: readRequiredString(parsed, "draft_body"),
        next_questions: readStringArray(parsed, "next_questions"),
        risk_flags: readStringArray(parsed, "risk_flags"),
        recommended_response_mode: readRecommendedResponseMode(parsed),
        should_handoff: readBoolean(parsed, "should_handoff"),
        provider: "openai"
      };
    } catch {
      throw new OpenAiProviderError();
    }
  }

  async draftRagAnswer(input: AiRagAnswerDraftInput): Promise<AiRagAnswerDraft> {
    if (input.sources.length === 0) {
      throw new OpenAiProviderError();
    }

    try {
      const result = await this.transport.createResponse(
        createOpenAiResponsesRequest({
          model: this.model,
          requestKind: "rag_answer_draft",
          tenant_id: input.tenant_id,
          sourceCount: input.sources.length,
          prompt: buildRagPrompt(input)
        }),
        { apiKey: this.apiKey }
      );
      const parsed = parseOpenAiJsonResponse(result);

      return {
        can_answer: readBoolean(parsed, "can_answer"),
        answer_body: readRequiredString(parsed, "answer_body"),
        sources: input.sources,
        risk_flags: readStringArray(parsed, "risk_flags"),
        handoff_required: readBoolean(parsed, "handoff_required"),
        recommended_response_mode: readRecommendedResponseMode(parsed),
        provider: "openai"
      };
    } catch {
      throw new OpenAiProviderError();
    }
  }
}

export function resolveAiProviderMode(
  env: Pick<NodeJS.ProcessEnv, "AI_PROVIDER">
): AiProviderMode {
  return env.AI_PROVIDER?.trim().toLowerCase() === "openai" ? "openai" : "mock";
}

export function evaluateOpenAiRealApiGate(
  input: OpenAiRealApiGateInput
): OpenAiRealApiGateResult {
  const provider = resolveAiProviderMode(input.env);

  if (provider !== "openai") {
    return openAiGateFailure("mock", "ai_provider_not_openai");
  }

  if (!readNonEmptyString(input.env.OPENAI_API_KEY)) {
    return openAiGateFailure("openai", "openai_api_key_missing");
  }

  const model = readNonEmptyString(input.env.OPENAI_MODEL);

  if (!model) {
    return openAiGateFailure("openai", "openai_model_missing");
  }

  if (!input.tenantAiSettings) {
    return openAiGateFailure("openai", "tenant_ai_settings_missing");
  }

  if (input.tenantAiSettings.provider !== "openai") {
    return openAiGateFailure("openai", "tenant_openai_not_allowed");
  }

  if (!isTenantAiFeatureEnabled(input.tenantAiSettings, input.requestKind)) {
    return openAiGateFailure("openai", "tenant_ai_feature_disabled");
  }

  if (input.requestKind === "rag_answer_draft" && (input.ragSourceCount ?? 0) <= 0) {
    return openAiGateFailure("openai", "rag_source_required");
  }

  if (input.autoSendRequested || input.tenantAiSettings.auto_reply_enabled) {
    return openAiGateFailure("openai", "ai_auto_send_not_allowed");
  }

  return {
    ok: true,
    provider: "openai",
    model,
    draftOnly: true,
    autoSendAllowed: false
  };
}

function createOpenAiResponsesRequest(input: {
  model: string;
  requestKind: OpenAiRealApiRequestKind;
  tenant_id: string;
  customer_id?: string;
  sourceCount?: number;
  prompt: string;
}): OpenAiResponsesRequest {
  const metadata: Record<string, string> = {
    tenant_id: input.tenant_id,
    request_kind: input.requestKind,
    draft_only: "true",
    auto_send: "false"
  };

  if (input.customer_id) {
    metadata.customer_id = input.customer_id;
  }

  if (input.sourceCount !== undefined) {
    metadata.source_count = String(input.sourceCount);
  }

  return {
    model: input.model,
    input: [
      {
        role: "system",
        content:
          "あなたは住宅相談CRMの担当者支援AIです。見積金額、土地価格、在庫、補助金、契約条件、保証判断を断定せず、LINEへ自動送信しません。"
      },
      {
        role: "user",
        content: input.prompt
      }
    ],
    metadata,
    text: {
      format: {
        type: "json_object"
      }
    }
  };
}

function buildConversationPrompt(input: {
  instruction: string;
  conversation: AiConversationTurn[];
  staffContext?: string;
}): string {
  const turns = input.conversation
    .map((turn) => `[${turn.created_at}] ${turn.role}: ${turn.content}`)
    .join("\n");
  const context = input.staffContext ? `\n担当者context:\n${input.staffContext}` : "";

  return `${input.instruction}${context}\n\n会話:\n${turns}`;
}

function buildRagPrompt(input: AiRagAnswerDraftInput): string {
  const sources = input.sources
    .map(
      (source, index) =>
        `${index + 1}. ${source.title}\nURL: ${source.url}\ncategory: ${source.category}\nexcerpt: ${source.excerpt}`
    )
    .join("\n\n");

  return [
    "tenant scopedな公式sourceだけを根拠に、担当者確認用の回答案をJSONで返してください。",
    "answer_body, can_answer, risk_flags, handoff_required, recommended_response_mode を含めてください。",
    `質問: ${input.query}`,
    `sources:\n${sources}`
  ].join("\n\n");
}

function parseOpenAiJsonResponse(response: OpenAiResponsesTransportResponse): Record<string, unknown> {
  const output = response.output_text ?? response.outputText;

  if (!output) {
    throw new OpenAiProviderError();
  }

  const parsed: unknown = JSON.parse(output);

  if (!isRecord(parsed)) {
    throw new OpenAiProviderError();
  }

  return parsed;
}

function normalizeOpenAiResponsesPayload(payload: unknown): OpenAiResponsesTransportResponse {
  if (!isRecord(payload)) {
    throw new OpenAiProviderError();
  }

  const outputText = readOptionalString(payload.output_text) ?? readOptionalString(payload.outputText);

  if (outputText) {
    return { output_text: outputText };
  }

  const nestedOutputText = readOutputTextFromResponsesOutput(payload.output);

  if (nestedOutputText) {
    return { output_text: nestedOutputText };
  }

  throw new OpenAiProviderError();
}

function readOutputTextFromResponsesOutput(output: unknown): string | null {
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (!isRecord(content)) {
        continue;
      }

      const text = readOptionalString(content.text);

      if (text) {
        return text;
      }
    }
  }

  return null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new OpenAiProviderError();
  }

  return value.trim();
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new OpenAiProviderError();
  }

  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim());
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];

  if (typeof value !== "boolean") {
    throw new OpenAiProviderError();
  }

  return value;
}

function readRecommendedResponseMode(record: Record<string, unknown>): AiRecommendedResponseMode {
  const value = record.recommended_response_mode;

  if (!isRecommendedResponseMode(value)) {
    throw new OpenAiProviderError();
  }

  return value;
}

function isRecommendedResponseMode(value: unknown): value is AiRecommendedResponseMode {
  return (
    value === "bot_auto" ||
    value === "human_required" ||
    value === "human_active" ||
    value === "emergency" ||
    value === "closed"
  );
}

function requireNonEmptyOpenAiConfig(value: string): string {
  const normalized = readNonEmptyString(value);

  if (!normalized) {
    throw new OpenAiProviderError();
  }

  return normalized;
}

function readNonEmptyString(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function isTenantAiFeatureEnabled(
  settings: TenantAiSettingsForOpenAiGate,
  requestKind: OpenAiRealApiRequestKind
): boolean {
  if (requestKind === "summary") {
    return settings.summary_enabled;
  }

  if (requestKind === "reply_draft") {
    return settings.reply_draft_enabled;
  }

  return settings.rag_enabled;
}

function openAiGateFailure(
  provider: AiProviderMode,
  reason: OpenAiRealApiGateFailureReason
): OpenAiRealApiGateResult {
  return {
    ok: false,
    provider,
    reason
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
