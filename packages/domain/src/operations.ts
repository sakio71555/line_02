import { z } from "zod";

import type { Reservation, StaffRole } from "./index";

export const workspaceAccentPresets = ["forest", "ocean", "charcoal", "sunrise"] as const;
export type WorkspaceAccentPreset = (typeof workspaceAccentPresets)[number];

export interface OperationsStaffMember {
  id: string;
  tenant_id: string;
  display_name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
}

export interface InternalNote {
  id: string;
  tenant_id: string;
  customer_id: string;
  alert_id: string | null;
  author_staff_user_id: string | null;
  body: string;
  mention_staff_user_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ReplyTemplate {
  id: string;
  tenant_id: string;
  title: string;
  category: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSettings {
  tenant_id: string;
  company_name: string;
  product_name: string;
  accent_preset: WorkspaceAccentPreset;
  sla_minutes: number;
  rich_menu_auto_switch_enabled: boolean;
  customer_status_notifications_enabled: boolean;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  tenant_id: string;
  actor_staff_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OperationsRepository {
  listStaffMembers(tenantId: string): Promise<OperationsStaffMember[]>;
  listInternalNotes(tenantId: string, customerId: string): Promise<InternalNote[]>;
  saveInternalNote(note: InternalNote): Promise<InternalNote>;
  listReplyTemplates(tenantId: string): Promise<ReplyTemplate[]>;
  saveReplyTemplate(template: ReplyTemplate): Promise<ReplyTemplate>;
  listReservations(tenantId: string): Promise<Reservation[]>;
  saveReservation(reservation: Reservation): Promise<Reservation>;
  getWorkspaceSettings(tenantId: string): Promise<WorkspaceSettings | null>;
  saveWorkspaceSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings>;
  listAuditEvents(tenantId: string, limit?: number): Promise<AuditEvent[]>;
  recordAuditEvent(event: AuditEvent): Promise<AuditEvent>;
}

export const internalNoteInputSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  alert_id: z.string().trim().min(1).nullable().optional(),
  mention_staff_user_ids: z.array(z.string().trim().min(1)).max(20).default([])
});

export const replyTemplateInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(80).default("general"),
  body: z.string().trim().min(1).max(4000),
  is_active: z.boolean().default(true)
});

export const workspaceSettingsInputSchema = z.object({
  company_name: z.string().trim().max(120),
  product_name: z.string().trim().min(1).max(120),
  accent_preset: z.enum(workspaceAccentPresets),
  sla_minutes: z.number().int().min(15).max(43200),
  rich_menu_auto_switch_enabled: z.boolean(),
  customer_status_notifications_enabled: z.boolean(),
  setup_completed: z.boolean()
});

export class InMemoryOperationsRepository implements OperationsRepository {
  private readonly staff: OperationsStaffMember[];
  private readonly notes = new Map<string, InternalNote>();
  private readonly templates = new Map<string, ReplyTemplate>();
  private readonly reservations = new Map<string, Reservation>();
  private readonly settings = new Map<string, WorkspaceSettings>();
  private readonly auditEvents = new Map<string, AuditEvent>();

  constructor(input: { staff?: OperationsStaffMember[] } = {}) {
    this.staff = [...(input.staff ?? [])];
  }

  async listStaffMembers(tenantId: string): Promise<OperationsStaffMember[]> {
    return this.staff.filter((member) => member.tenant_id === tenantId && member.is_active);
  }

  async listInternalNotes(tenantId: string, customerId: string): Promise<InternalNote[]> {
    return [...this.notes.values()]
      .filter((note) => note.tenant_id === tenantId && note.customer_id === customerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async saveInternalNote(note: InternalNote): Promise<InternalNote> {
    this.notes.set(note.id, note);
    return note;
  }

  async listReplyTemplates(tenantId: string): Promise<ReplyTemplate[]> {
    return [...this.templates.values()]
      .filter((template) => template.tenant_id === tenantId && template.is_active)
      .sort((a, b) => a.title.localeCompare(b.title, "ja"));
  }

  async saveReplyTemplate(template: ReplyTemplate): Promise<ReplyTemplate> {
    this.templates.set(template.id, template);
    return template;
  }

  async listReservations(tenantId: string): Promise<Reservation[]> {
    return [...this.reservations.values()]
      .filter((reservation) => reservation.tenant_id === tenantId)
      .sort((a, b) =>
        (a.confirmed_start_at ?? a.created_at).localeCompare(
          b.confirmed_start_at ?? b.created_at
        )
      );
  }

  async saveReservation(reservation: Reservation): Promise<Reservation> {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  async getWorkspaceSettings(tenantId: string): Promise<WorkspaceSettings | null> {
    return this.settings.get(tenantId) ?? null;
  }

  async saveWorkspaceSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    this.settings.set(settings.tenant_id, settings);
    return settings;
  }

  async listAuditEvents(tenantId: string, limit = 100): Promise<AuditEvent[]> {
    return [...this.auditEvents.values()]
      .filter((event) => event.tenant_id === tenantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  async recordAuditEvent(event: AuditEvent): Promise<AuditEvent> {
    this.auditEvents.set(event.id, event);
    return event;
  }
}
