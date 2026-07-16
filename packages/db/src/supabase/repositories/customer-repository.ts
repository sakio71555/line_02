import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer, CustomerRepository } from "@amami-line-crm/domain";

import { unwrapSupabaseResult, type SupabaseRepositoryResult } from "./errors";

export type SupabaseRepositoryClient = Pick<SupabaseClient, "from" | "rpc">;

interface SupabaseCustomerRow {
  id: string;
  tenant_id: string;
  line_user_id: string | null;
  display_name: string | null;
  picture_url: string | null;
  phone: string | null;
  email: string | null;
  postal_code: string | null;
  address: string | null;
  interest_tags: string[] | null;
  response_mode: Customer["response_mode"];
  status: Customer["status"];
  last_message_at: string | null;
  last_customer_message_at: string | null;
  last_staff_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

type SupabaseCustomerWriteRow = SupabaseCustomerRow;

export class SupabaseCustomerRepository implements CustomerRepository {
  constructor(private readonly client: SupabaseRepositoryClient) {}

  async findByIdForTenant(tenantId: string, customerId: string): Promise<Customer | null> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", customerId)
      .maybeSingle()) as SupabaseRepositoryResult<SupabaseCustomerRow>;
    const row = unwrapSupabaseResult(result, "customers", "findByIdForTenant");

    return row && row.tenant_id === tenantId ? toCustomer(row) : null;
  }

  async findByTenantAndLineUserId(tenantId: string, lineUserId: string): Promise<Customer | null> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("line_user_id", lineUserId)
      .maybeSingle()) as SupabaseRepositoryResult<SupabaseCustomerRow>;
    const row = unwrapSupabaseResult(result, "customers", "findByTenantAndLineUserId");

    return row && row.tenant_id === tenantId ? toCustomer(row) : null;
  }

  async listByTenant(tenantId: string): Promise<Customer[]> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)) as SupabaseRepositoryResult<SupabaseCustomerRow[]>;
    const rows = unwrapSupabaseResult(result, "customers", "listByTenant") ?? [];

    return rows.filter((row) => row.tenant_id === tenantId).map(toCustomer);
  }

  async save(customer: Customer): Promise<Customer> {
    assertTenantId(customer.tenant_id);

    const result = (await this.client
      .from("customers")
      .upsert(toCustomerWriteRow(customer), { onConflict: "id" })
      .select("*")
      .single()) as SupabaseRepositoryResult<SupabaseCustomerRow>;
    const row = unwrapSupabaseResult(result, "customers", "save");

    if (!row || row.tenant_id !== customer.tenant_id) {
      throw new Error("Supabase customers.save returned a row outside the requested tenant scope.");
    }

    return toCustomer(row);
  }
}

function toCustomer(row: SupabaseCustomerRow): Customer {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    line_user_id: row.line_user_id,
    display_name: row.display_name,
    picture_url: row.picture_url,
    phone: row.phone,
    email: row.email,
    postal_code: row.postal_code,
    address: row.address,
    interest_tags: row.interest_tags ?? [],
    response_mode: row.response_mode,
    status: row.status,
    last_message_at: row.last_message_at,
    last_customer_message_at: row.last_customer_message_at,
    last_staff_reply_at: row.last_staff_reply_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function toCustomerWriteRow(customer: Customer): SupabaseCustomerWriteRow {
  return {
    id: customer.id,
    tenant_id: customer.tenant_id,
    line_user_id: customer.line_user_id,
    display_name: customer.display_name,
    picture_url: customer.picture_url,
    phone: customer.phone,
    email: customer.email,
    postal_code: customer.postal_code,
    address: customer.address,
    interest_tags: customer.interest_tags,
    response_mode: customer.response_mode,
    status: customer.status,
    last_message_at: customer.last_message_at,
    last_customer_message_at: customer.last_customer_message_at,
    last_staff_reply_at: customer.last_staff_reply_at,
    created_at: customer.created_at,
    updated_at: customer.updated_at
  };
}

export function assertTenantId(tenantId: string): void {
  if (tenantId.trim().length === 0) {
    throw new Error("tenant_id is required for Supabase repository operations.");
  }
}
