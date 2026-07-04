import type { Alert, AlertRepository, AlertStatus, AlertType } from "@amami-line-crm/domain";

import { assertTenantId, type SupabaseRepositoryClient } from "./customer-repository";
import { unwrapSupabaseResult, type SupabaseRepositoryResult } from "./errors";

interface SupabaseAlertRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  consultation_id: string | null;
  alert_type: Alert["alert_type"];
  status: Alert["status"];
  severity: Alert["severity"];
  message: string;
  triggered_at: string;
  notified_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseAlertStatusUpdateRow {
  status: AlertStatus;
  updated_at: string;
  notified_at?: string | null;
  resolved_at?: string | null;
}

const activeAlertStatuses = ["open", "notified"] as const;

export class SupabaseAlertRepository implements AlertRepository {
  constructor(private readonly client: SupabaseRepositoryClient) {}

  async create(alert: Alert): Promise<Alert> {
    assertTenantId(alert.tenant_id);

    const result = (await this.client
      .from("alerts")
      .insert(toAlertRow(alert))
      .select("*")
      .single()) as SupabaseRepositoryResult<SupabaseAlertRow>;
    const row = unwrapSupabaseResult(result, "alerts", "create");

    if (!row || row.tenant_id !== alert.tenant_id) {
      throw new Error("Supabase alerts.create returned a row outside the requested tenant scope.");
    }

    return toAlert(row);
  }

  async listByTenant(tenantId: string): Promise<Alert[]> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("alerts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })) as SupabaseRepositoryResult<SupabaseAlertRow[]>;
    const rows = unwrapSupabaseResult(result, "alerts", "listByTenant") ?? [];

    return rows
      .filter((row) => row.tenant_id === tenantId)
      .sort(compareAlertRowsByCreatedAtAsc)
      .map(toAlert);
  }

  async listOpenByTenant(tenantId: string): Promise<Alert[]> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("alerts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .order("created_at", { ascending: true })) as SupabaseRepositoryResult<SupabaseAlertRow[]>;
    const rows = unwrapSupabaseResult(result, "alerts", "listOpenByTenant") ?? [];

    return rows
      .filter((row) => row.tenant_id === tenantId && row.status === "open")
      .sort(compareAlertRowsByCreatedAtAsc)
      .map(toAlert);
  }

  async findActiveByCustomerAndType(
    tenantId: string,
    customerId: string,
    alertType: AlertType
  ): Promise<Alert | null> {
    assertTenantId(tenantId);

    const result = (await this.client
      .from("alerts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .eq("alert_type", alertType)
      .in("status", [...activeAlertStatuses])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()) as SupabaseRepositoryResult<SupabaseAlertRow>;
    const row = unwrapSupabaseResult(result, "alerts", "findActiveByCustomerAndType");

    return row &&
      row.tenant_id === tenantId &&
      row.customer_id === customerId &&
      row.alert_type === alertType &&
      isActiveStatus(row.status)
      ? toAlert(row)
      : null;
  }

  async updateStatus(input: {
    tenant_id: string;
    alert_id: string;
    status: AlertStatus;
    notified_at?: string | null;
    resolved_at?: string | null;
    updated_at: string;
  }): Promise<Alert | null> {
    assertTenantId(input.tenant_id);

    const result = (await this.client
      .from("alerts")
      .update(toAlertStatusUpdateRow(input))
      .eq("tenant_id", input.tenant_id)
      .eq("id", input.alert_id)
      .select("*")
      .maybeSingle()) as SupabaseRepositoryResult<SupabaseAlertRow>;
    const row = unwrapSupabaseResult(result, "alerts", "updateStatus");

    return row && row.tenant_id === input.tenant_id ? toAlert(row) : null;
  }
}

function toAlert(row: SupabaseAlertRow): Alert {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    customer_id: row.customer_id,
    consultation_id: row.consultation_id,
    alert_type: row.alert_type,
    status: row.status,
    severity: row.severity,
    message: row.message,
    triggered_at: row.triggered_at,
    notified_at: row.notified_at,
    resolved_at: row.resolved_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function toAlertRow(alert: Alert): SupabaseAlertRow {
  return {
    id: alert.id,
    tenant_id: alert.tenant_id,
    customer_id: alert.customer_id,
    consultation_id: alert.consultation_id,
    alert_type: alert.alert_type,
    status: alert.status,
    severity: alert.severity,
    message: alert.message,
    triggered_at: alert.triggered_at,
    notified_at: alert.notified_at,
    resolved_at: alert.resolved_at,
    created_at: alert.created_at,
    updated_at: alert.updated_at
  };
}

function toAlertStatusUpdateRow(input: {
  status: AlertStatus;
  notified_at?: string | null;
  resolved_at?: string | null;
  updated_at: string;
}): SupabaseAlertStatusUpdateRow {
  const row: SupabaseAlertStatusUpdateRow = {
    status: input.status,
    updated_at: input.updated_at
  };

  if (input.notified_at !== undefined) {
    row.notified_at = input.notified_at;
  }

  if (input.resolved_at !== undefined) {
    row.resolved_at = input.resolved_at;
  }

  return row;
}

function isActiveStatus(status: AlertStatus): boolean {
  return status === "open" || status === "notified";
}

function compareAlertRowsByCreatedAtAsc(a: SupabaseAlertRow, b: SupabaseAlertRow): number {
  return a.created_at.localeCompare(b.created_at);
}
