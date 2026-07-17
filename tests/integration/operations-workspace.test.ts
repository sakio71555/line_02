import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  InMemoryOperationsRepository,
  internalNoteInputSchema,
  workspaceSettingsInputSchema,
  type AuditEvent,
  type InternalNote,
  type ReplyTemplate,
  type Reservation,
  type WorkspaceSettings
} from "@amami-line-crm/domain";

const migrationSql = readFileSync(
  new URL(
    "../../packages/db/migrations/20260717070610_operations_workspace_v1.sql",
    import.meta.url
  ),
  "utf8"
);

describe("operations workspace", () => {
  it("keeps notes, templates, reservations, settings and audit history tenant scoped", async () => {
    const repository = new InMemoryOperationsRepository({
      staff: [
        {
          id: "staff_a",
          tenant_id: "tenant_a",
          display_name: "担当 A",
          email: "a@example.test",
          role: "staff",
          is_active: true
        },
        {
          id: "staff_inactive",
          tenant_id: "tenant_a",
          display_name: "停止中",
          email: "inactive@example.test",
          role: "staff",
          is_active: false
        },
        {
          id: "staff_b",
          tenant_id: "tenant_b",
          display_name: "担当 B",
          email: "b@example.test",
          role: "staff",
          is_active: true
        }
      ]
    });

    await repository.saveInternalNote(createNote({ id: "note_old" }));
    await repository.saveInternalNote(
      createNote({ id: "note_new", created_at: "2026-07-17T02:00:00.000Z" })
    );
    await repository.saveInternalNote(
      createNote({ id: "note_other", tenant_id: "tenant_b", customer_id: "customer_b" })
    );
    await repository.saveReplyTemplate(createTemplate({ id: "template_b", title: "日程確認" }));
    await repository.saveReplyTemplate(createTemplate({ id: "template_a", title: "一次返信" }));
    await repository.saveReplyTemplate(
      createTemplate({ id: "template_inactive", title: "停止中", is_active: false })
    );
    await repository.saveReplyTemplate(
      createTemplate({ id: "template_other", tenant_id: "tenant_b" })
    );
    await repository.saveReservation(createReservation({ id: "reservation_later" }));
    await repository.saveReservation(
      createReservation({
        id: "reservation_earlier",
        confirmed_start_at: "2026-07-18T01:00:00.000Z"
      })
    );
    await repository.saveReservation(
      createReservation({ id: "reservation_other", tenant_id: "tenant_b" })
    );
    await repository.saveWorkspaceSettings(createSettings());
    await repository.saveWorkspaceSettings(createSettings({ tenant_id: "tenant_b" }));
    await repository.recordAuditEvent(createAuditEvent({ id: "audit_old" }));
    await repository.recordAuditEvent(
      createAuditEvent({ id: "audit_new", created_at: "2026-07-17T02:00:00.000Z" })
    );
    await repository.recordAuditEvent(
      createAuditEvent({ id: "audit_other", tenant_id: "tenant_b" })
    );

    await expect(repository.listStaffMembers("tenant_a")).resolves.toMatchObject([
      { id: "staff_a" }
    ]);
    await expect(repository.listInternalNotes("tenant_a", "customer_a")).resolves.toMatchObject([
      { id: "note_new" },
      { id: "note_old" }
    ]);
    await expect(repository.listReplyTemplates("tenant_a")).resolves.toMatchObject([
      { id: "template_a" },
      { id: "template_b" }
    ]);
    await expect(repository.listReservations("tenant_a")).resolves.toMatchObject([
      { id: "reservation_earlier" },
      { id: "reservation_later" }
    ]);
    await expect(repository.getWorkspaceSettings("tenant_a")).resolves.toMatchObject({
      tenant_id: "tenant_a",
      rich_menu_auto_switch_enabled: false,
      customer_status_notifications_enabled: false
    });
    await expect(repository.listAuditEvents("tenant_a", 1)).resolves.toMatchObject([
      { id: "audit_new" }
    ]);
  });

  it("validates safe workspace settings and note input boundaries", () => {
    expect(
      workspaceSettingsInputSchema.safeParse({
        company_name: "Example",
        product_name: "相談CRM",
        accent_preset: "forest",
        sla_minutes: 240,
        rich_menu_auto_switch_enabled: false,
        customer_status_notifications_enabled: false,
        setup_completed: true
      }).success
    ).toBe(true);
    expect(
      workspaceSettingsInputSchema.safeParse({
        company_name: "Example",
        product_name: "相談CRM",
        accent_preset: "unknown",
        sla_minutes: 1,
        rich_menu_auto_switch_enabled: true,
        customer_status_notifications_enabled: true,
        setup_completed: true
      }).success
    ).toBe(false);
    expect(internalNoteInputSchema.safeParse({ body: "", mention_staff_user_ids: [] }).success).toBe(
      false
    );
  });

  it("keeps operations tables protected by private tenant membership checks", () => {
    for (const table of [
      "consultations",
      "reservations",
      "internal_notes",
      "reply_templates",
      "tenant_workspace_settings",
      "audit_events"
    ]) {
      expect(migrationSql).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i")
      );
      expect(migrationSql).toMatch(
        new RegExp(`alter table public\\.${table} force row level security`, "i")
      );
    }

    expect(migrationSql).toContain("create schema if not exists private");
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("set search_path = ''");
    expect(migrationSql).toContain(
      "revoke all on function private.is_active_tenant_staff(text) from public, anon"
    );
    expect(migrationSql).toContain(
      "grant execute on function private.is_active_tenant_staff(text) to authenticated, service_role"
    );
    expect(migrationSql).not.toContain("public.is_active_tenant_staff");
    expect(migrationSql).not.toMatch(/grant\s+(?:all|insert|update|delete)[^;]*audit_events[^;]*authenticated/is);
  });
});

function createNote(overrides: Partial<InternalNote> = {}): InternalNote {
  return {
    id: "note_default",
    tenant_id: "tenant_a",
    customer_id: "customer_a",
    alert_id: null,
    author_staff_user_id: "staff_a",
    body: "引継ぎメモ",
    mention_staff_user_ids: [],
    created_at: "2026-07-17T01:00:00.000Z",
    updated_at: "2026-07-17T01:00:00.000Z",
    ...overrides
  };
}

function createTemplate(overrides: Partial<ReplyTemplate> = {}): ReplyTemplate {
  return {
    id: "template_default",
    tenant_id: "tenant_a",
    title: "一次返信",
    category: "general",
    body: "お問い合わせありがとうございます。",
    is_active: true,
    created_at: "2026-07-17T01:00:00.000Z",
    updated_at: "2026-07-17T01:00:00.000Z",
    ...overrides
  };
}

function createReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "reservation_default",
    tenant_id: "tenant_a",
    customer_id: "customer_a",
    consultation_id: null,
    reservation_type: "meeting",
    preferred_dates: [],
    confirmed_start_at: "2026-07-19T01:00:00.000Z",
    confirmed_end_at: "2026-07-19T02:00:00.000Z",
    status: "confirmed",
    staff_user_id: "staff_a",
    notes: null,
    created_at: "2026-07-17T01:00:00.000Z",
    updated_at: "2026-07-17T01:00:00.000Z",
    ...overrides
  };
}

function createSettings(overrides: Partial<WorkspaceSettings> = {}): WorkspaceSettings {
  return {
    tenant_id: "tenant_a",
    company_name: "Example",
    product_name: "相談CRM",
    accent_preset: "forest",
    sla_minutes: 240,
    rich_menu_auto_switch_enabled: false,
    customer_status_notifications_enabled: false,
    setup_completed: true,
    created_at: "2026-07-17T01:00:00.000Z",
    updated_at: "2026-07-17T01:00:00.000Z",
    ...overrides
  };
}

function createAuditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "audit_default",
    tenant_id: "tenant_a",
    actor_staff_user_id: "staff_a",
    action: "task.updated",
    resource_type: "alert",
    resource_id: "alert_a",
    summary: "対応状況を更新",
    metadata: {},
    created_at: "2026-07-17T01:00:00.000Z",
    ...overrides
  };
}
