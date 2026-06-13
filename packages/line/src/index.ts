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

export interface LineReplyMessage {
  type: "text";
  text: string;
}

export interface LineClient {
  replyMessage(replyToken: string, messages: LineReplyMessage[]): Promise<void>;
  pushMessage(to: string, messages: LineReplyMessage[]): Promise<void>;
}

export class MockLineClient implements LineClient {
  readonly replies: Array<{ replyToken: string; messages: LineReplyMessage[] }> = [];
  readonly pushes: Array<{ to: string; messages: LineReplyMessage[] }> = [];

  async replyMessage(replyToken: string, messages: LineReplyMessage[]): Promise<void> {
    this.replies.push({ replyToken, messages });
  }

  async pushMessage(to: string, messages: LineReplyMessage[]): Promise<void> {
    this.pushes.push({ to, messages });
  }
}
