import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  alertSeveritySchema,
  alertStatusSchema,
  alertCreateSchema,
  customerCreateSchema,
  knowledgePageSchema,
  messageCreateSchema,
  messageRoleSchema,
  messageTypeSchema,
  responseModeSchema,
  staffMembershipStatusSchema,
  staffRoleSchema,
  staffStatusSchema,
  tenantIdSchema
} from "@amami-line-crm/domain";

const migrationSql = readFileSync(
  new URL("../../packages/db/migrations/0001_initial_schema.sql", import.meta.url),
  "utf8"
);

const seedSql = readFileSync(
  new URL("../../packages/db/seed/tenant_amamihome.sql", import.meta.url),
  "utf8"
);

const majorTables = [
  "tenants",
  "tenant_line_settings",
  "tenant_ai_settings",
  "staff_users",
  "staff_tenant_memberships",
  "customers",
  "messages",
  "consultations",
  "alerts",
  "knowledge_pages",
  "construction_cases",
  "reservations"
] as const;

const tenantScopedTables = majorTables.filter((table) => table !== "tenants");

function tableDefinition(tableName: string): string {
  const match = migrationSql.match(
    new RegExp(`create table if not exists ${tableName} \\(([\\s\\S]*?)\\n\\);`, "i")
  );

  if (!match?.[1]) {
    throw new Error(`Missing table definition for ${tableName}`);
  }

  return match[1];
}

describe("Loop 001 database migration", () => {
  it("contains all major tables", () => {
    for (const table of majorTables) {
      expect(migrationSql).toMatch(new RegExp(`create table if not exists ${table} \\(`, "i"));
    }
  });

  it("keeps tenant_id on every major tenant-owned table", () => {
    expect(tableDefinition("tenants")).not.toMatch(/\btenant_id\b/i);

    for (const table of tenantScopedTables) {
      const definition = tableDefinition(table);
      expect(definition).toMatch(/\btenant_id\b/i);
      expect(definition).toMatch(/references tenants\(id\)/i);
    }
  });

  it("allows nullable LINE IDs while enforcing tenant-scoped uniqueness when present", () => {
    expect(migrationSql).toMatch(
      /create unique index if not exists customers_tenant_line_user_id_unique\s+on customers \(tenant_id, line_user_id\)\s+where line_user_id is not null;/i
    );
    expect(migrationSql).toMatch(
      /create unique index if not exists messages_tenant_line_message_id_unique\s+on messages \(tenant_id, line_message_id\)\s+where line_message_id is not null;/i
    );
  });

  it("has tenant-scoped uniqueness and indexes for common access paths", () => {
    expect(tableDefinition("tenant_line_settings")).toMatch(/\btenant_id text primary key\b/i);
    expect(tableDefinition("tenant_ai_settings")).toMatch(/\btenant_id text primary key\b/i);
    expect(tableDefinition("staff_users")).toMatch(/unique \(tenant_id, email\)/i);
    expect(migrationSql).toMatch(/staff_users_auth_user_id_unique/i);
    expect(migrationSql).toMatch(/staff_users_email_idx/i);
    expect(migrationSql).toMatch(/staff_users_status_idx/i);
    expect(migrationSql).toMatch(/staff_tenant_memberships_tenant_id_idx/i);
    expect(migrationSql).toMatch(/staff_tenant_memberships_staff_user_id_idx/i);
    expect(migrationSql).toMatch(/staff_tenant_memberships_tenant_status_idx/i);
    expect(migrationSql).toMatch(/staff_tenant_memberships_staff_status_idx/i);
    expect(migrationSql).toMatch(/customers_tenant_id_idx/i);
    expect(migrationSql).toMatch(/customers_tenant_response_mode_idx/i);
    expect(migrationSql).toMatch(/messages_tenant_customer_created_at_idx/i);
    expect(migrationSql).toMatch(/messages_tenant_consultation_created_at_idx/i);
    expect(migrationSql).toMatch(/knowledge_pages_tenant_id_idx/i);
    expect(migrationSql).toMatch(/knowledge_pages_tenant_allowed_for_ai_idx/i);
    expect(migrationSql).toMatch(/construction_cases_tenant_id_idx/i);
    expect(migrationSql).toMatch(/construction_cases_tenant_recommendation_idx/i);
    expect(migrationSql).toMatch(/alerts_tenant_status_severity_idx/i);
    expect(migrationSql).toMatch(/reservations_tenant_customer_idx/i);
    expect(migrationSql).toMatch(/reservations_tenant_status_idx/i);
  });

  it("keeps RLS SQL out of the initial migration until the dedicated RLS loop", () => {
    expect(migrationSql).toMatch(/RLS policy definitions are intentionally deferred/i);
    expect(migrationSql).not.toMatch(
      /alter table\s+[\w.]+\s+enable row level security|alter table\s+[\w.]+\s+force row level security|create policy/i
    );
  });

  it("keeps customers aligned with domain timestamp fields", () => {
    const definition = tableDefinition("customers");

    expect(definition).toMatch(/\blast_message_at timestamptz\b/i);
    expect(definition).toMatch(/\blast_customer_message_at timestamptz\b/i);
    expect(definition).toMatch(/\blast_staff_reply_at timestamptz\b/i);
  });

  it("keeps staff auth and membership schema ready for tenant context", () => {
    const staffDefinition = tableDefinition("staff_users");
    const membershipDefinition = tableDefinition("staff_tenant_memberships");

    expect(staffDefinition).toMatch(/\bauth_user_id text\b/i);
    expect(staffDefinition).toMatch(
      /\bstatus text not null default 'active' check \(status in \('active', 'disabled', 'archived'\)\)/i
    );
    expect(staffDefinition).toMatch(/\bdisabled_at timestamptz\b/i);
    expect(staffDefinition).toMatch(/\barchived_at timestamptz\b/i);
    expect(migrationSql).toMatch(
      /create unique index if not exists staff_users_auth_user_id_unique\s+on staff_users \(auth_user_id\)\s+where auth_user_id is not null;/i
    );

    expect(membershipDefinition).toMatch(
      /\btenant_id text not null references tenants\(id\) on delete cascade\b/i
    );
    expect(membershipDefinition).toMatch(
      /\bstaff_user_id text not null references staff_users\(id\) on delete cascade\b/i
    );
    expect(membershipDefinition).toMatch(
      /\brole text not null default 'staff' check \(role in \('owner', 'manager', 'staff'\)\)/i
    );
    expect(membershipDefinition).toMatch(
      /\bstatus text not null default 'active' check \(status in \('invited', 'active', 'disabled', 'archived'\)\)/i
    );
    expect(membershipDefinition).toMatch(/\binvited_at timestamptz\b/i);
    expect(membershipDefinition).toMatch(/\baccepted_at timestamptz\b/i);
    expect(membershipDefinition).toMatch(/\bdisabled_at timestamptz\b/i);
    expect(membershipDefinition).toMatch(/\barchived_at timestamptz\b/i);
    expect(membershipDefinition).toMatch(/unique \(tenant_id, staff_user_id\)/i);

    expect(staffRoleSchema.parse("owner")).toBe("owner");
    expect(staffStatusSchema.parse("disabled")).toBe("disabled");
    expect(staffMembershipStatusSchema.parse("invited")).toBe("invited");
    expect(staffRoleSchema.safeParse("platform_admin").success).toBe(false);
  });

  it("keeps knowledge_pages aligned with tenant-scoped RAG search", () => {
    const definition = tableDefinition("knowledge_pages");

    expect(definition).toMatch(/\btenant_id\b/i);
    expect(definition).toMatch(/\btitle\b/i);
    expect(definition).toMatch(/\burl\b/i);
    expect(definition).toMatch(/\bcategory\b/i);
    expect(definition).toMatch(/\bsource_type\b/i);
    expect(definition).toMatch(/\bcontent\b/i);
    expect(definition).toMatch(/\ballowed_for_ai boolean not null default false\b/i);
    expect(definition).toMatch(/\blast_crawled_at\b/i);
    expect(migrationSql).toMatch(/knowledge_pages_tenant_id_idx/i);
    expect(migrationSql).toMatch(/knowledge_pages_tenant_allowed_for_ai_idx/i);
    expect(
      knowledgePageSchema.parse({
        tenant_id: "tenant_amamihome",
        url: "https://amamihome.net/example",
        category: "相談",
        source_type: "official_site",
        title: "オンライン相談",
        content: "オンライン相談の説明です。",
        allowed_for_ai: true,
        last_crawled_at: "2026-06-13T00:00:00.000Z"
      }).allowed_for_ai
    ).toBe(true);
  });

  it("keeps the unreplied alert type aligned between migration and domain validation", () => {
    expect(tableDefinition("alerts")).toMatch(/\bunreplied_customer_message\b/);
    expect(
      alertCreateSchema.parse({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_1",
        alert_type: "unreplied_customer_message",
        message: "未返信です"
      }).alert_type
    ).toBe("unreplied_customer_message");
  });

  it("validates enum-like values through Zod schemas", () => {
    expect(tenantIdSchema.parse("tenant_amamihome")).toBe("tenant_amamihome");
    expect(tenantIdSchema.safeParse("amamihome").success).toBe(false);

    expect(responseModeSchema.parse("bot_auto")).toBe("bot_auto");
    expect(responseModeSchema.safeParse("random").success).toBe(false);

    expect(messageRoleSchema.parse("staff")).toBe("staff");
    expect(messageRoleSchema.safeParse("operator").success).toBe(false);

    expect(messageTypeSchema.parse("reservation")).toBe("reservation");
    expect(messageTypeSchema.safeParse("voice").success).toBe(false);

    expect(alertStatusSchema.parse("notified")).toBe("notified");
    expect(alertStatusSchema.safeParse("acknowledged").success).toBe(false);

    expect(alertSeveritySchema.parse("critical")).toBe("critical");
    expect(alertSeveritySchema.safeParse("urgent").success).toBe(false);
  });

  it("validates create payloads without connecting to an external database", () => {
    expect(
      customerCreateSchema.parse({
        tenant_id: "tenant_amamihome",
        line_user_id: null,
        display_name: "仮顧客"
      }).response_mode
    ).toBe("bot_auto");

    expect(
      messageCreateSchema.parse({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_1",
        line_message_id: null,
        role: "customer",
        body: "相談したいです"
      }).message_type
    ).toBe("text");

    expect(
      alertCreateSchema.parse({
        tenant_id: "tenant_amamihome",
        customer_id: "customer_1",
        alert_type: "unreplied",
        message: "未返信です"
      }).severity
    ).toBe("medium");
  });

  it("contains the non-secret Amami Home tenant seed", () => {
    expect(seedSql).toContain("tenant_amamihome");
    expect(seedSql).toContain("amamihome");
    expect(seedSql).toContain("amamihome.net");
    expect(seedSql).toContain("アマミホーム");
    expect(seedSql).not.toMatch(/OPENAI_API_KEY|LINE_CHANNEL_ACCESS_TOKEN|service_role/i);
  });
});
