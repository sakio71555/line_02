import type {
  AuditEvent,
  InternalNote,
  OperationsRepository,
  OperationsSearchResult,
  OperationsStaffMember,
  ReplyTemplate,
  Reservation,
  WorkspaceSettings
} from "@amami-line-crm/domain";

import { assertTenantId, type SupabaseRepositoryClient } from "./customer-repository";
import { unwrapSupabaseResult, type SupabaseRepositoryResult } from "./errors";

type StaffRow = OperationsStaffMember;
type NoteRow = InternalNote;
type TemplateRow = ReplyTemplate;
type ReservationRow = Reservation;
type SettingsRow = WorkspaceSettings;
type AuditRow = AuditEvent;

export class SupabaseOperationsRepository implements OperationsRepository {
  constructor(private readonly client: SupabaseRepositoryClient) {}

  async listStaffMembers(tenantId: string): Promise<OperationsStaffMember[]> {
    assertTenantId(tenantId);
    const result = (await this.client.rpc("list_operations_staff_members", {
      target_tenant_id: tenantId
    })) as SupabaseRepositoryResult<StaffRow[]>;
    return (
      unwrapSupabaseResult(result, "list_operations_staff_members", "listStaffMembers") ?? []
    ).filter((row) => row.tenant_id === tenantId && row.is_active);
  }

  async searchWorkspace(tenantId: string, query: string): Promise<OperationsSearchResult> {
    assertTenantId(tenantId);
    const result = (await this.client.rpc("search_operations_workspace", {
      target_tenant_id: tenantId,
      search_query: query
    })) as SupabaseRepositoryResult<OperationsSearchResult>;
    const value = unwrapSupabaseResult(result, "search_operations_workspace", "searchWorkspace");

    return {
      customers: (value?.customers ?? []).filter((customer) => customer.tenant_id === tenantId),
      messages: (value?.messages ?? []).filter(
        (hit) => hit.customer_id === hit.message.customer_id && hit.message.tenant_id === tenantId
      ),
      notes: (value?.notes ?? []).filter(
        (hit) => hit.customer_id === hit.note.customer_id && hit.note.tenant_id === tenantId
      ),
      alerts: (value?.alerts ?? []).filter((alert) => alert.tenant_id === tenantId)
    };
  }

  async listInternalNotes(tenantId: string, customerId: string): Promise<InternalNote[]> {
    assertTenantId(tenantId);
    const result = (await this.client
      .from("internal_notes")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })) as SupabaseRepositoryResult<NoteRow[]>;
    return (unwrapSupabaseResult(result, "internal_notes", "listInternalNotes") ?? []).filter(
      (row) => row.tenant_id === tenantId && row.customer_id === customerId
    );
  }

  async saveInternalNote(note: InternalNote): Promise<InternalNote> {
    assertTenantId(note.tenant_id);
    return this.upsertSingle("internal_notes", note, "saveInternalNote");
  }

  async listReplyTemplates(tenantId: string): Promise<ReplyTemplate[]> {
    assertTenantId(tenantId);
    const result = (await this.client
      .from("reply_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("title", { ascending: true })) as SupabaseRepositoryResult<TemplateRow[]>;
    return (unwrapSupabaseResult(result, "reply_templates", "listReplyTemplates") ?? []).filter(
      (row) => row.tenant_id === tenantId && row.is_active
    );
  }

  async saveReplyTemplate(template: ReplyTemplate): Promise<ReplyTemplate> {
    assertTenantId(template.tenant_id);
    return this.upsertSingle("reply_templates", template, "saveReplyTemplate");
  }

  async listReservations(tenantId: string): Promise<Reservation[]> {
    assertTenantId(tenantId);
    const result = (await this.client
      .from("reservations")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("confirmed_start_at", { ascending: true })) as SupabaseRepositoryResult<
      ReservationRow[]
    >;
    return (unwrapSupabaseResult(result, "reservations", "listReservations") ?? []).filter(
      (row) => row.tenant_id === tenantId
    );
  }

  async saveReservation(reservation: Reservation): Promise<Reservation> {
    assertTenantId(reservation.tenant_id);
    return this.upsertSingle("reservations", reservation, "saveReservation");
  }

  async getWorkspaceSettings(tenantId: string): Promise<WorkspaceSettings | null> {
    assertTenantId(tenantId);
    const result = (await this.client
      .from("tenant_workspace_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle()) as SupabaseRepositoryResult<SettingsRow>;
    const row = unwrapSupabaseResult(result, "tenant_workspace_settings", "getWorkspaceSettings");
    return row?.tenant_id === tenantId ? row : null;
  }

  async saveWorkspaceSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    assertTenantId(settings.tenant_id);
    return this.upsertSingle("tenant_workspace_settings", settings, "saveWorkspaceSettings");
  }

  async listAuditEvents(tenantId: string, limit = 100): Promise<AuditEvent[]> {
    assertTenantId(tenantId);
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const result = (await this.client
      .from("audit_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(safeLimit)) as SupabaseRepositoryResult<AuditRow[]>;
    return (unwrapSupabaseResult(result, "audit_events", "listAuditEvents") ?? []).filter(
      (row) => row.tenant_id === tenantId
    );
  }

  async recordAuditEvent(event: AuditEvent): Promise<AuditEvent> {
    assertTenantId(event.tenant_id);
    return this.upsertSingle("audit_events", event, "recordAuditEvent");
  }

  private async upsertSingle<T extends { tenant_id: string }>(
    table: string,
    value: T,
    operation: string
  ): Promise<T> {
    const result = (await this.client
      .from(table)
      .upsert(value)
      .select("*")
      .single()) as SupabaseRepositoryResult<T>;
    const row = unwrapSupabaseResult(result, table, operation);
    if (!row || row.tenant_id !== value.tenant_id) {
      throw new Error(`Supabase ${table}.${operation} returned a row outside tenant scope.`);
    }
    return row;
  }
}
