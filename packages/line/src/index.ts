import { createHmac, timingSafeEqual } from "node:crypto";

import type { TenantScoped } from "@amami-line-crm/shared";

export interface LineWebhookContext extends TenantScoped {
  channel_id: string;
  raw_body: string;
  signature: string;
}

export interface VerifyLineSignatureInput {
  channelSecret: string;
  body: string;
  signature: string;
}

export function verifyLineSignature(input: VerifyLineSignatureInput): boolean {
  const expected = createHmac("sha256", input.channelSecret).update(input.body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(input.signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export interface LineWebhookPayload {
  destination: string;
  events: NormalizedLineWebhookEvent[];
}

export interface NormalizedLineWebhookEvent {
  event_id: string | null;
  type: string;
  timestamp: number | null;
  reply_token: string | null;
  source_type: string | null;
  source_user_id: string | null;
  source_group_id: string | null;
  source_room_id: string | null;
  message_id: string | null;
  message_type: string | null;
  text: string | null;
  file_name: string | null;
  file_size: number | null;
  duration: number | null;
}

export function parseLineWebhookPayload(rawBody: string): LineWebhookPayload {
  const parsed: unknown = JSON.parse(rawBody);

  if (!isRecord(parsed)) {
    throw new Error("LINE webhook body must be a JSON object.");
  }

  const destination = readString(parsed.destination);
  const events = parsed.events;

  if (!destination || !Array.isArray(events)) {
    throw new Error("LINE webhook body must include destination and events.");
  }

  return {
    destination,
    events: events.map(normalizeLineWebhookEvent)
  };
}

function normalizeLineWebhookEvent(event: unknown): NormalizedLineWebhookEvent {
  if (!isRecord(event)) {
    throw new Error("LINE webhook event must be an object.");
  }

  const source = isRecord(event.source) ? event.source : {};
  const message = isRecord(event.message) ? event.message : {};

  return {
    event_id: readString(event.webhookEventId),
    type: readRequiredString(event.type, "event.type"),
    timestamp: readNumber(event.timestamp),
    reply_token: readString(event.replyToken),
    source_type: readString(source.type),
    source_user_id: readString(source.userId),
    source_group_id: readString(source.groupId),
    source_room_id: readString(source.roomId),
    message_id: readString(message.id),
    message_type: readString(message.type),
    text: readString(message.text),
    file_name: readString(message.fileName),
    file_size: readNumber(message.fileSize),
    duration: readNumber(message.duration)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readRequiredString(value: unknown, fieldName: string): string {
  const result = readString(value);

  if (!result) {
    throw new Error(`LINE webhook ${fieldName} must be a non-empty string.`);
  }

  return result;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export interface LineQuickReplyMessageAction {
  type: "message";
  label: string;
  text: string;
}

export interface LineQuickReplyItem {
  type: "action";
  action: LineQuickReplyMessageAction;
}

export interface LineQuickReply {
  items: LineQuickReplyItem[];
}

export interface LineTextReplyMessage {
  type: "text";
  text: string;
  quickReply?: LineQuickReply;
}

export interface LineImageReplyMessage {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
}

export interface LineVideoReplyMessage {
  type: "video";
  originalContentUrl: string;
  previewImageUrl: string;
}

export type LineReplyMessage =
  | LineTextReplyMessage
  | LineImageReplyMessage
  | LineVideoReplyMessage;

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl: string | null;
  statusMessage: string | null;
  language: string | null;
}

export interface LineMessageContent {
  data: Uint8Array;
  contentType: string | null;
}

export interface LineIdTokenIdentity {
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
  email: string | null;
}

export interface VerifyLineIdTokenInput {
  idToken: string;
  channelId: string;
}

export interface LineIdTokenVerifier {
  verify(input: VerifyLineIdTokenInput): Promise<LineIdTokenIdentity>;
}

export interface LineIdTokenVerifyFetchResponse {
  ok: boolean;
  text(): Promise<string>;
}

export type LineIdTokenVerifyFetch = (
  input: string,
  init: RequestInit
) => Promise<LineIdTokenVerifyFetchResponse>;

export interface LineClient {
  replyMessage(replyToken: string, messages: LineReplyMessage[]): Promise<void>;
  pushMessage(to: string, messages: LineReplyMessage[]): Promise<void>;
  linkRichMenuToUser?(userId: string, richMenuId: string): Promise<void>;
  getProfile?(userId: string): Promise<LineUserProfile | null>;
  getMessageContent?(messageId: string): Promise<LineMessageContent>;
}

export interface LineMessagingPushRequest {
  channelAccessToken: string;
  endpoint: string;
  to: string;
  messages: LineReplyMessage[];
}

export interface LineMessagingReplyRequest {
  channelAccessToken: string;
  endpoint: string;
  replyToken: string;
  messages: LineReplyMessage[];
}

export interface LineMessagingProfileRequest {
  channelAccessToken: string;
  endpoint: string;
  userId: string;
}

export interface LineMessagingRichMenuLinkRequest {
  channelAccessToken: string;
  endpoint: string;
  userId: string;
  richMenuId: string;
}

export interface LineMessagingContentRequest {
  channelAccessToken: string;
  endpoint: string;
  messageId: string;
}

export interface LineMessagingTransport {
  pushMessage(request: LineMessagingPushRequest): Promise<void>;
  replyMessage?(request: LineMessagingReplyRequest): Promise<void>;
  getProfile?(request: LineMessagingProfileRequest): Promise<LineUserProfile>;
  linkRichMenuToUser?(request: LineMessagingRichMenuLinkRequest): Promise<void>;
  getMessageContent?(request: LineMessagingContentRequest): Promise<LineMessageContent>;
}

export interface LineMessagingFetchResponse {
  ok: boolean;
  text(): Promise<string>;
  arrayBuffer?(): Promise<ArrayBuffer>;
  body?: ReadableStream<Uint8Array> | null;
  headers?: {
    get(name: string): string | null;
  };
}

export type LineMessagingFetch = (
  input: string,
  init: RequestInit
) => Promise<LineMessagingFetchResponse>;

export const MAX_LINE_MESSAGE_CONTENT_BYTES = 50 * 1024 * 1024;

export interface RealLineClientConfig {
  channelAccessToken: string;
  transport: LineMessagingTransport;
  pushEndpoint?: string;
  replyEndpoint?: string;
  profileEndpointBase?: string;
  richMenuEndpointBase?: string;
  contentEndpointBase?: string;
}

export class LineMessagingApiError extends Error {
  readonly statusCode: number | null;

  constructor(message = "LINE Messaging API request failed.", statusCode: number | null = null) {
    super(message);
    this.name = "LineMessagingApiError";
    this.statusCode = statusCode;
  }
}

export class LineIdTokenVerificationError extends Error {
  constructor(message = "LINE ID token verification failed.") {
    super(message);
    this.name = "LineIdTokenVerificationError";
  }
}

export class FetchLineIdTokenVerifier implements LineIdTokenVerifier {
  private readonly endpoint: string;
  private readonly fetchImplementation: LineIdTokenVerifyFetch;

  constructor(input: { endpoint?: string; fetch?: LineIdTokenVerifyFetch } = {}) {
    this.endpoint = input.endpoint ?? "https://api.line.me/oauth2/v2.1/verify";
    this.fetchImplementation = input.fetch ?? (fetch.bind(globalThis) as LineIdTokenVerifyFetch);
  }

  async verify(input: VerifyLineIdTokenInput): Promise<LineIdTokenIdentity> {
    const idToken = input.idToken.trim();
    const channelId = input.channelId.trim();

    if (!idToken || !channelId) {
      throw new LineIdTokenVerificationError();
    }

    const response = await this.fetchImplementation(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: channelId
      }).toString()
    });

    if (!response.ok) {
      throw new LineIdTokenVerificationError();
    }

    return parseLineIdTokenVerificationResponse(await response.text(), channelId);
  }
}

export class FetchLineMessagingTransport implements LineMessagingTransport {
  private readonly fetchImplementation: LineMessagingFetch;
  private readonly maxMessageContentBytes: number;

  constructor(input: { fetch?: LineMessagingFetch; maxMessageContentBytes?: number } = {}) {
    this.fetchImplementation = input.fetch ?? (fetch.bind(globalThis) as LineMessagingFetch);
    this.maxMessageContentBytes =
      input.maxMessageContentBytes ?? MAX_LINE_MESSAGE_CONTENT_BYTES;

    if (
      !Number.isSafeInteger(this.maxMessageContentBytes) ||
      this.maxMessageContentBytes < 1 ||
      this.maxMessageContentBytes > MAX_LINE_MESSAGE_CONTENT_BYTES
    ) {
      throw new LineMessagingApiError("LINE message content size limit is invalid.");
    }
  }

  async pushMessage(request: LineMessagingPushRequest): Promise<void> {
    await this.postJson(request.endpoint, request.channelAccessToken, {
      to: request.to,
      messages: request.messages
    });
  }

  async replyMessage(request: LineMessagingReplyRequest): Promise<void> {
    await this.postJson(request.endpoint, request.channelAccessToken, {
      replyToken: request.replyToken,
      messages: request.messages
    });
  }

  async getProfile(request: LineMessagingProfileRequest): Promise<LineUserProfile> {
    const response = await this.fetchImplementation(request.endpoint, {
      method: "GET",
      headers: {
        authorization: `Bearer ${request.channelAccessToken}`
      }
    });

    if (!response.ok) {
      throw new LineMessagingApiError("LINE Messaging API request failed.", readStatus(response));
    }

    return parseLineUserProfileResponse(await response.text());
  }

  async linkRichMenuToUser(request: LineMessagingRichMenuLinkRequest): Promise<void> {
    await this.postWithoutBody(request.endpoint, request.channelAccessToken);
  }

  async getMessageContent(request: LineMessagingContentRequest): Promise<LineMessageContent> {
    const response = await this.fetchImplementation(request.endpoint, {
      method: "GET",
      headers: {
        authorization: `Bearer ${request.channelAccessToken}`
      }
    });

    if (!response.ok || (!response.body && !response.arrayBuffer)) {
      throw new LineMessagingApiError("LINE message content request failed.", readStatus(response));
    }

    const declaredContentLength = readContentLength(response);

    if (
      declaredContentLength !== null &&
      declaredContentLength > this.maxMessageContentBytes
    ) {
      await cancelMessageContentBody(response.body);
      throw new LineMessagingApiError("LINE message content exceeds the allowed size.");
    }

    const data = await readMessageContentWithinLimit(
      response,
      this.maxMessageContentBytes
    );

    if (data.byteLength === 0) {
      throw new LineMessagingApiError("LINE message content response was empty.");
    }

    if (data.byteLength > this.maxMessageContentBytes) {
      throw new LineMessagingApiError("LINE message content exceeds the allowed size.");
    }

    return {
      data,
      contentType: response.headers?.get("content-type")?.split(";", 1)[0]?.trim() || null
    };
  }

  private async postJson(
    endpoint: string,
    channelAccessToken: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const response = await this.fetchImplementation(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${channelAccessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new LineMessagingApiError("LINE Messaging API request failed.", readStatus(response));
    }
  }

  private async postWithoutBody(endpoint: string, channelAccessToken: string): Promise<void> {
    const response = await this.fetchImplementation(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${channelAccessToken}`
      }
    });

    if (!response.ok) {
      throw new LineMessagingApiError("LINE Messaging API request failed.", readStatus(response));
    }
  }
}

async function readMessageContentWithinLimit(
  response: LineMessagingFetchResponse,
  maxBytes: number
): Promise<Uint8Array> {
  if (!response.body) {
    if (!response.arrayBuffer) {
      throw new LineMessagingApiError("LINE message content request failed.", readStatus(response));
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const chunk = await reader.read();

      if (chunk.done) {
        break;
      }

      totalBytes += chunk.value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new LineMessagingApiError("LINE message content exceeds the allowed size.");
      }

      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  const data = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return data;
}

async function cancelMessageContentBody(
  body: ReadableStream<Uint8Array> | null | undefined
): Promise<void> {
  await body?.cancel().catch(() => undefined);
}

function readStatus(response: LineMessagingFetchResponse): number | null {
  const status = (response as LineMessagingFetchResponse & { status?: unknown }).status;

  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

function readContentLength(response: LineMessagingFetchResponse): number | null {
  const value = response.headers?.get("content-length")?.trim();

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export class RealLineClient implements LineClient {
  private readonly channelAccessToken: string;
  private readonly pushEndpoint: string;
  private readonly replyEndpoint: string;
  private readonly profileEndpointBase: string;
  private readonly richMenuEndpointBase: string;
  private readonly contentEndpointBase: string;
  private readonly transport: LineMessagingTransport;

  constructor(config: RealLineClientConfig) {
    const token = config.channelAccessToken.trim();

    if (!token) {
      throw new LineMessagingApiError("LINE channel access token is required.");
    }

    this.channelAccessToken = token;
    this.transport = config.transport;
    this.pushEndpoint = config.pushEndpoint ?? "https://api.line.me/v2/bot/message/push";
    this.replyEndpoint = config.replyEndpoint ?? "https://api.line.me/v2/bot/message/reply";
    this.profileEndpointBase =
      config.profileEndpointBase?.replace(/\/+$/u, "") ?? "https://api.line.me/v2/bot/profile";
    this.richMenuEndpointBase =
      config.richMenuEndpointBase?.replace(/\/+$/u, "") ?? "https://api.line.me/v2/bot/user";
    this.contentEndpointBase =
      config.contentEndpointBase?.replace(/\/+$/u, "") ??
      "https://api-data.line.me/v2/bot/message";
  }

  async replyMessage(replyToken: string, messages: LineReplyMessage[]): Promise<void> {
    if (!this.transport.replyMessage) {
      throw new LineMessagingApiError("LINE reply transport is not configured.");
    }

    try {
      await this.transport.replyMessage({
        channelAccessToken: this.channelAccessToken,
        endpoint: this.replyEndpoint,
        replyToken,
        messages
      });
    } catch (error) {
      if (error instanceof LineMessagingApiError) {
        throw error;
      }

      throw new LineMessagingApiError();
    }
  }

  async pushMessage(to: string, messages: LineReplyMessage[]): Promise<void> {
    try {
      await this.transport.pushMessage({
        channelAccessToken: this.channelAccessToken,
        endpoint: this.pushEndpoint,
        to,
        messages
      });
    } catch (error) {
      if (error instanceof LineMessagingApiError) {
        throw error;
      }

      throw new LineMessagingApiError();
    }
  }

  async getProfile(userId: string): Promise<LineUserProfile | null> {
    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      return null;
    }

    if (!this.transport.getProfile) {
      throw new LineMessagingApiError("LINE profile transport is not configured.");
    }

    try {
      return await this.transport.getProfile({
        channelAccessToken: this.channelAccessToken,
        endpoint: `${this.profileEndpointBase}/${encodeURIComponent(normalizedUserId)}`,
        userId: normalizedUserId
      });
    } catch (error) {
      if (error instanceof LineMessagingApiError) {
        throw error;
      }

      throw new LineMessagingApiError();
    }
  }

  async linkRichMenuToUser(userId: string, richMenuId: string): Promise<void> {
    const normalizedUserId = userId.trim();
    const normalizedRichMenuId = richMenuId.trim();

    if (!normalizedUserId || !normalizedRichMenuId) {
      throw new LineMessagingApiError("LINE rich menu target and id are required.");
    }

    if (!this.transport.linkRichMenuToUser) {
      throw new LineMessagingApiError("LINE rich menu link transport is not configured.");
    }

    try {
      await this.transport.linkRichMenuToUser({
        channelAccessToken: this.channelAccessToken,
        endpoint: `${this.richMenuEndpointBase}/${encodeURIComponent(
          normalizedUserId
        )}/richmenu/${encodeURIComponent(normalizedRichMenuId)}`,
        userId: normalizedUserId,
        richMenuId: normalizedRichMenuId
      });
    } catch (error) {
      if (error instanceof LineMessagingApiError) {
        throw error;
      }

      throw new LineMessagingApiError();
    }
  }

  async getMessageContent(messageId: string): Promise<LineMessageContent> {
    const normalizedMessageId = messageId.trim();

    if (!normalizedMessageId) {
      throw new LineMessagingApiError("LINE message id is required.");
    }

    if (!this.transport.getMessageContent) {
      throw new LineMessagingApiError("LINE message content transport is not configured.");
    }

    try {
      return await this.transport.getMessageContent({
        channelAccessToken: this.channelAccessToken,
        endpoint: `${this.contentEndpointBase}/${encodeURIComponent(normalizedMessageId)}/content`,
        messageId: normalizedMessageId
      });
    } catch (error) {
      if (error instanceof LineMessagingApiError) {
        throw error;
      }

      throw new LineMessagingApiError();
    }
  }
}

export class MockLineClient implements LineClient {
  readonly replies: Array<{ replyToken: string; messages: LineReplyMessage[] }> = [];
  readonly pushes: Array<{ to: string; messages: LineReplyMessage[] }> = [];
  readonly richMenuLinks: Array<{ userId: string; richMenuId: string }> = [];
  readonly profiles = new Map<string, LineUserProfile>();
  readonly messageContents = new Map<string, LineMessageContent>();

  async replyMessage(replyToken: string, messages: LineReplyMessage[]): Promise<void> {
    this.replies.push({ replyToken, messages });
  }

  async pushMessage(to: string, messages: LineReplyMessage[]): Promise<void> {
    this.pushes.push({ to, messages });
  }

  async linkRichMenuToUser(userId: string, richMenuId: string): Promise<void> {
    this.richMenuLinks.push({ userId, richMenuId });
  }

  async getProfile(userId: string): Promise<LineUserProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async getMessageContent(messageId: string): Promise<LineMessageContent> {
    const content = this.messageContents.get(messageId);

    if (!content) {
      throw new LineMessagingApiError("Mock LINE message content is not configured.");
    }

    return content;
  }
}

function parseLineUserProfileResponse(body: string): LineUserProfile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    throw new LineMessagingApiError();
  }

  if (!isRecord(parsed)) {
    throw new LineMessagingApiError();
  }

  const userId = readString(parsed.userId);
  const displayName = readString(parsed.displayName);

  if (!userId || !displayName) {
    throw new LineMessagingApiError();
  }

  return {
    userId,
    displayName,
    pictureUrl: readString(parsed.pictureUrl),
    statusMessage: readString(parsed.statusMessage),
    language: readString(parsed.language)
  };
}

function parseLineIdTokenVerificationResponse(
  body: string,
  expectedChannelId: string
): LineIdTokenIdentity {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    throw new LineIdTokenVerificationError();
  }

  if (!isRecord(parsed)) {
    throw new LineIdTokenVerificationError();
  }

  const userId = readString(parsed.sub);
  const audience = readString(parsed.aud);

  if (!userId || (audience && audience !== expectedChannelId)) {
    throw new LineIdTokenVerificationError();
  }

  return {
    userId,
    displayName: readString(parsed.name),
    pictureUrl: readString(parsed.picture),
    email: readString(parsed.email)
  };
}
