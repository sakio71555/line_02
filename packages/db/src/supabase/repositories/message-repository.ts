import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isPendingLineReplyMessage,
  type Message,
  type MessageRepository
} from "@amami-line-crm/domain";

import { assertTenantId, type SupabaseRepositoryClient } from "./customer-repository";
import { unwrapSupabaseResult, type SupabaseRepositoryResult } from "./errors";

interface SupabaseMessageRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  consultation_id: string | null;
  line_message_id: string | null;
  role: Message["role"];
  message_type: Message["message_type"];
  body: string | null;
  media_storage_path: string | null;
  staff_user_id: string | null;
  ai_generated: boolean;
  sent_to_line_at: string | null;
  created_at: string;
}

export type SupabaseMessageRepositoryClient = Pick<SupabaseClient, "from">;

export class SupabaseMessageRepository implements MessageRepository {
  constructor(private readonly client: SupabaseRepositoryClient | SupabaseMessageRepositoryClient) {}

  async insert(message: Message): Promise<Message> {
    assertTenantId(message.tenant_id);

    const result = (await this.client
      .from("messages")
      .insert(toMessageRow(message))
      .select("*")
      .single()) as SupabaseRepositoryResult<SupabaseMessageRow>;
    const row = unwrapSupabaseResult(result, "messages", "insert");

    if (!row || row.tenant_id !== message.tenant_id) {
      throw new Error("Supabase messages.insert returned a row outside the requested tenant scope.");
    }

    return toMessage(row);
  }

  async findByTenantAndLineMessageId(
    tenantId: string,
    lineMessageId: string
  ): Promise<Message | null> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("line_message_id", lineMessageId)
      .maybeSingle()) as SupabaseRepositoryResult<SupabaseMessageRow>;
    const row = unwrapSupabaseResult(result, "messages", "findByTenantAndLineMessageId");

    if (!row) {
      return null;
    }

    if (row.tenant_id !== tenantId || row.line_message_id !== lineMessageId) {
      throw new Error(
        "Supabase messages.findByTenantAndLineMessageId returned a row outside the requested scope."
      );
    }

    return toMessage(row);
  }

  async updateSentToLineAt(input: {
    tenant_id: string;
    message_id: string;
    sent_to_line_at: string;
  }): Promise<Message | null> {
    assertTenantId(input.tenant_id);

    const result = (await this.client
      .from("messages")
      .update({ message_type: "text", sent_to_line_at: input.sent_to_line_at })
      .eq("tenant_id", input.tenant_id)
      .eq("id", input.message_id)
      .eq("message_type", "summary")
      .is("sent_to_line_at", null)
      .select("*")
      .maybeSingle()) as SupabaseRepositoryResult<SupabaseMessageRow>;
    const row = unwrapSupabaseResult(result, "messages", "updateSentToLineAt");

    if (!row) {
      return null;
    }

    if (row.tenant_id !== input.tenant_id || row.id !== input.message_id) {
      throw new Error(
        "Supabase messages.updateSentToLineAt returned a row outside the requested scope."
      );
    }

    return toMessage(row);
  }

  async deleteByIdForTenant(tenantId: string, messageId: string): Promise<boolean> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("messages")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", messageId)
      .select("id")
      .maybeSingle()) as SupabaseRepositoryResult<{ id: string }>;
    const row = unwrapSupabaseResult(result, "messages", "deleteByIdForTenant");

    return row?.id === messageId;
  }

  async findLatestByCustomerIds(
    tenantId: string,
    customerIds: string[]
  ): Promise<Map<string, Message>> {
    assertTenantId(tenantId);

    if (customerIds.length === 0) {
      return new Map();
    }

    const customerIdSet = new Set(customerIds);
    const result = (await this.client
      .from("messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("customer_id", customerIds)
      .order("created_at", { ascending: false })) as SupabaseRepositoryResult<SupabaseMessageRow[]>;
    const rows = unwrapSupabaseResult(result, "messages", "findLatestByCustomerIds") ?? [];
    const latestByCustomerId = new Map<string, Message>();

    for (const row of rows
      .filter((item) => item.tenant_id === tenantId && customerIdSet.has(item.customer_id))
      .sort(compareMessageRowsByCreatedAtDesc)) {
      const message = toMessage(row);

      if (isPendingLineReplyMessage(message)) {
        continue;
      }

      if (!latestByCustomerId.has(row.customer_id)) {
        latestByCustomerId.set(row.customer_id, message);
      }
    }

    return latestByCustomerId;
  }

  async listByCustomer(tenantId: string, customerId: string): Promise<Message[]> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("messages")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true })) as SupabaseRepositoryResult<SupabaseMessageRow[]>;
    const rows = unwrapSupabaseResult(result, "messages", "listByCustomer") ?? [];

    return rows
      .filter((row) => row.tenant_id === tenantId && row.customer_id === customerId)
      .sort(compareMessageRowsByCreatedAtAsc)
      .map(toMessage);
  }
}

function toMessage(row: SupabaseMessageRow): Message {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    customer_id: row.customer_id,
    consultation_id: row.consultation_id,
    line_message_id: row.line_message_id,
    role: row.role,
    message_type: row.message_type,
    body: row.body,
    media_storage_path: row.media_storage_path,
    staff_user_id: row.staff_user_id,
    ai_generated: row.ai_generated,
    sent_to_line_at: row.sent_to_line_at,
    created_at: row.created_at
  };
}

function toMessageRow(message: Message): SupabaseMessageRow {
  return {
    id: message.id,
    tenant_id: message.tenant_id,
    customer_id: message.customer_id,
    consultation_id: message.consultation_id,
    line_message_id: message.line_message_id,
    role: message.role,
    message_type: message.message_type,
    body: message.body,
    media_storage_path: message.media_storage_path,
    staff_user_id: message.staff_user_id,
    ai_generated: message.ai_generated,
    sent_to_line_at: message.sent_to_line_at,
    created_at: message.created_at
  };
}

function compareMessageRowsByCreatedAtAsc(a: SupabaseMessageRow, b: SupabaseMessageRow): number {
  return a.created_at.localeCompare(b.created_at);
}

function compareMessageRowsByCreatedAtDesc(a: SupabaseMessageRow, b: SupabaseMessageRow): number {
  return b.created_at.localeCompare(a.created_at);
}
