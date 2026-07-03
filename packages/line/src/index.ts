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
    text: readString(message.text)
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

export interface LineReplyMessage {
  type: "text";
  text: string;
  quickReply?: LineQuickReply;
}

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl: string | null;
  statusMessage: string | null;
  language: string | null;
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
  getProfile?(userId: string): Promise<LineUserProfile | null>;
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

export interface LineMessagingTransport {
  pushMessage(request: LineMessagingPushRequest): Promise<void>;
  replyMessage?(request: LineMessagingReplyRequest): Promise<void>;
  getProfile?(request: LineMessagingProfileRequest): Promise<LineUserProfile>;
}

export interface LineMessagingFetchResponse {
  ok: boolean;
  text(): Promise<string>;
}

export type LineMessagingFetch = (
  input: string,
  init: RequestInit
) => Promise<LineMessagingFetchResponse>;

export interface RealLineClientConfig {
  channelAccessToken: string;
  transport: LineMessagingTransport;
  pushEndpoint?: string;
  replyEndpoint?: string;
  profileEndpointBase?: string;
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

  constructor(input: { fetch?: LineMessagingFetch } = {}) {
    this.fetchImplementation = input.fetch ?? (fetch.bind(globalThis) as LineMessagingFetch);
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
}

function readStatus(response: LineMessagingFetchResponse): number | null {
  const status = (response as LineMessagingFetchResponse & { status?: unknown }).status;

  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

export class RealLineClient implements LineClient {
  private readonly channelAccessToken: string;
  private readonly pushEndpoint: string;
  private readonly replyEndpoint: string;
  private readonly profileEndpointBase: string;
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
}

export class MockLineClient implements LineClient {
  readonly replies: Array<{ replyToken: string; messages: LineReplyMessage[] }> = [];
  readonly pushes: Array<{ to: string; messages: LineReplyMessage[] }> = [];
  readonly profiles = new Map<string, LineUserProfile>();

  async replyMessage(replyToken: string, messages: LineReplyMessage[]): Promise<void> {
    this.replies.push({ replyToken, messages });
  }

  async pushMessage(to: string, messages: LineReplyMessage[]): Promise<void> {
    this.pushes.push({ to, messages });
  }

  async getProfile(userId: string): Promise<LineUserProfile | null> {
    return this.profiles.get(userId) ?? null;
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
