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

export const OPENAI_DRAFT_REPLY_REQUIRED_FIELDS = [
  "draft_body",
  "next_questions",
  "risk_flags",
  "recommended_response_mode",
  "should_handoff"
] as const;

export type OpenAiDraftReplyRequiredField = (typeof OPENAI_DRAFT_REPLY_REQUIRED_FIELDS)[number];

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
  max_output_tokens: number;
  store: false;
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
  status?: number;
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
  readonly status: number | null;
  readonly providerCode: string | null;
  readonly providerType: string | null;
  readonly classification: OpenAiProviderErrorClassification;
  readonly providerOutputTextExtracted: boolean | null;
  readonly jsonContractParseSuccess: boolean | null;
  readonly jsonContractSchemaValid: boolean | null;
  readonly parseStage: OpenAiProviderParseStage | null;
  readonly schemaMissingFields: readonly string[];
  readonly schemaInvalidFields: readonly string[];

  constructor(input: OpenAiProviderErrorInput = {}) {
    super("OpenAI provider request failed.");
    this.name = "OpenAiProviderError";
    this.status = input.status ?? null;
    this.providerCode = sanitizeOpenAiErrorToken(input.providerCode);
    this.providerType = sanitizeOpenAiErrorToken(input.providerType);
    this.providerOutputTextExtracted = input.providerOutputTextExtracted ?? null;
    this.jsonContractParseSuccess = input.jsonContractParseSuccess ?? null;
    this.jsonContractSchemaValid = input.jsonContractSchemaValid ?? null;
    this.parseStage = input.parseStage ?? null;
    this.schemaMissingFields = sanitizeOpenAiSchemaFieldNames(input.schemaMissingFields);
    this.schemaInvalidFields = sanitizeOpenAiSchemaFieldNames(input.schemaInvalidFields);
    this.classification =
      input.classification ??
      classifyOpenAiProviderError({
        status: this.status,
        providerCode: this.providerCode,
        providerType: this.providerType
      });
  }
}

export type OpenAiProviderErrorClassification =
  | "A_env_missing_or_malformed"
  | "B_model_missing_or_invalid"
  | "C_auth_or_key_rejected"
  | "D_quota_or_billing_or_project_access"
  | "E_network_or_timeout"
  | "F_request_shape_or_provider_mapping_bug"
  | "G_response_parse_bug"
  | "H_provider_transport_bug"
  | "I_unknown_sanitized";

export type OpenAiProviderParseStage =
  | "text_extraction"
  | "json_parse"
  | "schema_validation"
  | "provider_mapping"
  | "none"
  | "unknown";

export interface OpenAiProviderErrorInput {
  status?: number | null;
  providerCode?: string | null;
  providerType?: string | null;
  classification?: OpenAiProviderErrorClassification;
  providerOutputTextExtracted?: boolean | null;
  jsonContractParseSuccess?: boolean | null;
  jsonContractSchemaValid?: boolean | null;
  parseStage?: OpenAiProviderParseStage | null;
  schemaMissingFields?: readonly string[] | null;
  schemaInvalidFields?: readonly string[] | null;
}

export interface OpenAiProviderErrorClassificationInput {
  status?: number | null;
  providerCode?: string | null;
  providerType?: string | null;
}

export function classifyOpenAiProviderError(
  input: OpenAiProviderErrorClassificationInput
): OpenAiProviderErrorClassification {
  const status = typeof input.status === "number" ? input.status : null;
  const providerCode = input.providerCode?.toLowerCase() ?? "";
  const providerType = input.providerType?.toLowerCase() ?? "";
  const combined = `${providerCode} ${providerType}`;

  if (status === 401 || status === 403) {
    return "C_auth_or_key_rejected";
  }

  if (status === 404 && combined.includes("model")) {
    return "B_model_missing_or_invalid";
  }

  if (status === 429) {
    return "D_quota_or_billing_or_project_access";
  }

  if (status === 400 || combined.includes("invalid_request")) {
    return "F_request_shape_or_provider_mapping_bug";
  }

  return "I_unknown_sanitized";
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
    let response: OpenAiResponsesFetchResponse;

    try {
      response = await this.fetchImplementation(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(request)
      });
    } catch {
      throw new OpenAiProviderError({ classification: "E_network_or_timeout" });
    }

    if (!response.ok) {
      const providerError = await readSanitizedOpenAiProviderError(response);

      throw new OpenAiProviderError({
        status: response.status ?? null,
        providerCode: providerError.providerCode,
        providerType: providerError.providerType
      });
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new OpenAiProviderError({ classification: "G_response_parse_bug" });
    }

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
              "会話を担当者支援用に要約し、summary, next_actions, risk_flags, recommended_response_mode を含むJSON objectだけを返してください。Markdownや説明文は付けないでください。",
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
    } catch (error) {
      throw preserveOpenAiProviderError(error);
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
            instruction: buildDraftReplyJsonInstruction(),
            conversation: input.conversation,
            ...(input.staff_context ? { staffContext: input.staff_context } : {})
          })
        }),
        { apiKey: this.apiKey }
      );
      const parsed = parseOpenAiJsonResponse(result);
      validateOpenAiDraftReplyContract(parsed);

      return {
        draft_body: readRequiredString(parsed, "draft_body"),
        next_questions: readStringArray(parsed, "next_questions"),
        risk_flags: readStringArray(parsed, "risk_flags"),
        recommended_response_mode: readRecommendedResponseMode(parsed),
        should_handoff: readBoolean(parsed, "should_handoff"),
        provider: "openai"
      };
    } catch (error) {
      throw preserveOpenAiProviderError(error);
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
    } catch (error) {
      throw preserveOpenAiProviderError(error);
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
    max_output_tokens: 800,
    store: false,
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

function buildDraftReplyJsonInstruction(): string {
  return [
    "担当者が確認して送る住宅相談CRM用の返信下書きを短く作成してください。",
    "返答はJSON objectだけにしてください。Markdown、code fence、前後の説明文、自然文のみの回答は禁止です。",
    "field名は次の5つだけを完全一致で含めてください: draft_body, next_questions, risk_flags, recommended_response_mode, should_handoff。",
    "draft_bodyは空でないstring、next_questionsはstring配列、risk_flagsはstring配列、recommended_response_modeはbot_auto/human_required/human_active/emergency/closedのいずれか、should_handoffはbooleanです。",
    "見積金額、土地価格、建売在庫、補助金可否、契約条件、保証判断は断定せず、必要なら担当者確認へ誘導してください。"
  ].join("\n");
}

function buildRagPrompt(input: AiRagAnswerDraftInput): string {
  const sources = input.sources
    .map(
      (source, index) =>
        `${index + 1}. ${source.title}\nURL: ${source.url}\ncategory: ${source.category}\nexcerpt: ${source.excerpt}`
    )
    .join("\n\n");

  return [
    "tenant scopedな公式sourceだけを根拠に、担当者確認用の回答案をJSON objectだけで返してください。Markdownや説明文は付けないでください。",
    "answer_body, can_answer, risk_flags, handoff_required, recommended_response_mode を含めてください。",
    `質問: ${input.query}`,
    `sources:\n${sources}`
  ].join("\n\n");
}

export function parseOpenAiJsonResponse(
  response: OpenAiResponsesTransportResponse
): Record<string, unknown> {
  const output = response.output_text ?? response.outputText;

  if (!output) {
    throw new OpenAiProviderError({
      classification: "G_response_parse_bug",
      providerOutputTextExtracted: false,
      jsonContractParseSuccess: false,
      jsonContractSchemaValid: false,
      parseStage: "text_extraction"
    });
  }

  return parseOpenAiJsonContractText(output);
}

export function parseOpenAiJsonContractText(output: string): Record<string, unknown> {
  const candidates = createJsonTextCandidates(output);

  if (candidates.length === 0) {
    throw new OpenAiProviderError({
      classification: "G_response_parse_bug",
      providerOutputTextExtracted: true,
      jsonContractParseSuccess: false,
      jsonContractSchemaValid: false,
      parseStage: "json_parse"
    });
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);

      if (!isRecord(parsed)) {
        throw new OpenAiProviderError({
          classification: "G_response_parse_bug",
          providerOutputTextExtracted: true,
          jsonContractParseSuccess: true,
          jsonContractSchemaValid: false,
          parseStage: "schema_validation"
        });
      }

      return parsed;
    } catch (error) {
      if (error instanceof OpenAiProviderError) {
        throw error;
      }
    }
  }

  throw new OpenAiProviderError({
    classification: "G_response_parse_bug",
    providerOutputTextExtracted: true,
    jsonContractParseSuccess: false,
    jsonContractSchemaValid: false,
    parseStage: "json_parse"
  });
}

export function validateOpenAiDraftReplyContract(record: Record<string, unknown>): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  validateStringField(record, "draft_body", missing, invalid);
  validateStringArrayField(record, "next_questions", missing, invalid);
  validateStringArrayField(record, "risk_flags", missing, invalid);
  validateRecommendedResponseModeField(record, "recommended_response_mode", missing, invalid);
  validateBooleanField(record, "should_handoff", missing, invalid);

  if (missing.length > 0 || invalid.length > 0) {
    throw createOpenAiSchemaValidationError({
      missingFields: missing,
      invalidFields: invalid
    });
  }
}

function validateStringField(
  record: Record<string, unknown>,
  key: OpenAiDraftReplyRequiredField,
  missing: string[],
  invalid: string[]
): void {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    missing.push(key);
    return;
  }

  const value = record[key];

  if (typeof value !== "string" || !value.trim()) {
    invalid.push(key);
  }
}

function validateStringArrayField(
  record: Record<string, unknown>,
  key: OpenAiDraftReplyRequiredField,
  missing: string[],
  invalid: string[]
): void {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    missing.push(key);
    return;
  }

  const value = record[key];

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    invalid.push(key);
  }
}

function validateRecommendedResponseModeField(
  record: Record<string, unknown>,
  key: OpenAiDraftReplyRequiredField,
  missing: string[],
  invalid: string[]
): void {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    missing.push(key);
    return;
  }

  if (!isRecommendedResponseMode(record[key])) {
    invalid.push(key);
  }
}

function validateBooleanField(
  record: Record<string, unknown>,
  key: OpenAiDraftReplyRequiredField,
  missing: string[],
  invalid: string[]
): void {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    missing.push(key);
    return;
  }

  if (typeof record[key] !== "boolean") {
    invalid.push(key);
  }
}

function createOpenAiSchemaValidationError(input: {
  missingFields: readonly string[];
  invalidFields: readonly string[];
}): OpenAiProviderError {
  return new OpenAiProviderError({
    classification: "G_response_parse_bug",
    providerOutputTextExtracted: true,
    jsonContractParseSuccess: true,
    jsonContractSchemaValid: false,
    parseStage: "schema_validation",
    schemaMissingFields: input.missingFields,
    schemaInvalidFields: input.invalidFields
  });
}

export function normalizeOpenAiResponsesPayload(payload: unknown): OpenAiResponsesTransportResponse {
  return { output_text: extractOpenAiResponseText(payload) };
}

export function extractOpenAiResponseText(payload: unknown): string {
  if (!isRecord(payload)) {
    throw openAiResponseTextExtractionError();
  }

  const candidates = [
    readOptionalString(payload.output_text),
    readOptionalString(payload.outputText),
    readOptionalString(payload.text),
    readOutputTextFromContentArray(payload.content),
    readOutputTextFromResponsesOutput(payload.output)
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  throw openAiResponseTextExtractionError();
}

function readOutputTextFromResponsesOutput(output: unknown): string | null {
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    if (!isRecord(item)) {
      continue;
    }

    const itemText = readOptionalString(item.text);

    if (itemText) {
      return itemText;
    }

    const contentText = readOutputTextFromContentArray(item.content);

    if (contentText) {
      return contentText;
    }
  }

  return null;
}

function readOutputTextFromContentArray(content: unknown): string | null {
  if (!Array.isArray(content)) {
    return null;
  }

  for (const item of content) {
    if (!isRecord(item)) {
      continue;
    }

    const text = readOptionalString(item.text);

    if (text) {
      return text;
    }
  }

  return null;
}

function openAiResponseTextExtractionError(): OpenAiProviderError {
  return new OpenAiProviderError({
    classification: "G_response_parse_bug",
    providerOutputTextExtracted: false,
    jsonContractParseSuccess: false,
    jsonContractSchemaValid: false,
    parseStage: "text_extraction"
  });
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new OpenAiProviderError({
      classification: "G_response_parse_bug",
      providerOutputTextExtracted: true,
      jsonContractParseSuccess: true,
      jsonContractSchemaValid: false,
      parseStage: "schema_validation"
    });
  }

  return value.trim();
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new OpenAiProviderError({
      classification: "G_response_parse_bug",
      providerOutputTextExtracted: true,
      jsonContractParseSuccess: true,
      jsonContractSchemaValid: false,
      parseStage: "schema_validation"
    });
  }

  if (!value.every((item) => typeof item === "string")) {
    throw new OpenAiProviderError({
      classification: "G_response_parse_bug",
      providerOutputTextExtracted: true,
      jsonContractParseSuccess: true,
      jsonContractSchemaValid: false,
      parseStage: "schema_validation"
    });
  }

  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];

  if (typeof value !== "boolean") {
    throw new OpenAiProviderError({
      classification: "G_response_parse_bug",
      providerOutputTextExtracted: true,
      jsonContractParseSuccess: true,
      jsonContractSchemaValid: false,
      parseStage: "schema_validation"
    });
  }

  return value;
}

function readRecommendedResponseMode(record: Record<string, unknown>): AiRecommendedResponseMode {
  const value = record.recommended_response_mode;

  if (!isRecommendedResponseMode(value)) {
    throw new OpenAiProviderError({
      classification: "G_response_parse_bug",
      providerOutputTextExtracted: true,
      jsonContractParseSuccess: true,
      jsonContractSchemaValid: false,
      parseStage: "schema_validation"
    });
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
    throw new OpenAiProviderError({ classification: "A_env_missing_or_malformed" });
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

function preserveOpenAiProviderError(error: unknown): OpenAiProviderError {
  if (error instanceof OpenAiProviderError) {
    return error;
  }

  return new OpenAiProviderError({ classification: "H_provider_transport_bug" });
}

function createJsonTextCandidates(output: string): string[] {
  const trimmed = output.trim();

  if (!trimmed) {
    return [];
  }

  const candidates = new Set<string>([trimmed]);
  const fencedMatches = trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);

  for (const match of fencedMatches) {
    const fenced = match[1]?.trim();

    if (fenced) {
      candidates.add(fenced);
    }
  }

  const balancedJson = extractFirstBalancedJsonValue(trimmed);

  if (balancedJson) {
    candidates.add(balancedJson);
  }

  return [...candidates];
}

function extractFirstBalancedJsonValue(input: string): string | null {
  const maxLength = 20_000;
  const source = input.length > maxLength ? input.slice(0, maxLength) : input;

  for (let start = 0; start < source.length; start += 1) {
    const open = source[start];

    if (open !== "{" && open !== "[") {
      continue;
    }

    const close = open === "{" ? "}" : "]";
    const stack = [close];
    let inString = false;
    let escaped = false;

    for (let index = start + 1; index < source.length; index += 1) {
      const char = source[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = inString;
        continue;
      }

      if (char === "\"") {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === "{" || char === "[") {
        stack.push(char === "{" ? "}" : "]");
        continue;
      }

      if (char === "}" || char === "]") {
        if (stack.at(-1) !== char) {
          break;
        }

        stack.pop();

        if (stack.length === 0) {
          return source.slice(start, index + 1);
        }
      }
    }
  }

  return null;
}

async function readSanitizedOpenAiProviderError(
  response: OpenAiResponsesFetchResponse
): Promise<{ providerCode: string | null; providerType: string | null }> {
  try {
    const payload = await response.json();

    if (!isRecord(payload) || !isRecord(payload.error)) {
      return { providerCode: null, providerType: null };
    }

    return {
      providerCode: readOptionalString(payload.error.code),
      providerType: readOptionalString(payload.error.type)
    };
  } catch {
    return { providerCode: null, providerType: null };
  }
}

function sanitizeOpenAiErrorToken(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const sanitized = normalized.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 80);

  return sanitized || null;
}

function sanitizeOpenAiSchemaFieldNames(values: readonly string[] | null | undefined): string[] {
  if (!values) {
    return [];
  }

  const fieldNames = values
    .map((value) => value.trim().replace(/[^A-Za-z0-9_]/g, "_").slice(0, 80))
    .filter((value) => value.length > 0);

  return [...new Set(fieldNames)];
}
