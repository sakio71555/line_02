import { loadAppConfig } from "@amami-line-crm/config";
import type { StaffRole } from "@amami-line-crm/domain";

export type AdminTenantContextSource = "dev_header" | "authenticated_staff";

export interface AdminTenantContext {
  tenantId: string;
  source: AdminTenantContextSource;
  staffUserId?: string;
  authUserId?: string;
  role?: StaffRole;
}

export type AdminTenantGuardErrorCode =
  | "missing_tenant_context"
  | "unknown_tenant"
  | "dev_tenant_header_not_allowed"
  | "authenticated_staff_required"
  | "tenant_membership_denied"
  | "tenant_selection_required";

export interface AdminTenantGuardError {
  code: AdminTenantGuardErrorCode;
}

export type AdminTenantGuardResult =
  | { status: "ok"; tenantId: string; context: AdminTenantContext }
  | { status: "missing"; error: AdminTenantGuardError }
  | { status: "unknown"; error: AdminTenantGuardError };

export type AdminTenantGuardHttpResponse =
  | { status: 401; body: { ok: false; error: "missing_tenant_id" } }
  | { status: 403; body: { ok: false; error: "unknown_tenant_id" } };

export function resolveAdminTenantContext(input: {
  tenantIdHeader: string | undefined;
  env: NodeJS.ProcessEnv;
}): AdminTenantGuardResult {
  const tenantId = input.tenantIdHeader?.trim();

  if (!tenantId) {
    return {
      status: "missing",
      error: { code: "missing_tenant_context" }
    };
  }

  const config = loadAppConfig(input.env);

  if (tenantId !== config.tenant.id) {
    return {
      status: "unknown",
      error: { code: "unknown_tenant" }
    };
  }

  return {
    status: "ok",
    tenantId,
    context: {
      tenantId,
      source: "dev_header"
    }
  };
}

export function mapAdminTenantGuardErrorToHttp(
  error: AdminTenantGuardError
): AdminTenantGuardHttpResponse {
  switch (error.code) {
    case "missing_tenant_context":
    case "authenticated_staff_required":
    case "tenant_selection_required":
      return {
        status: 401,
        body: { ok: false, error: "missing_tenant_id" }
      };
    case "unknown_tenant":
    case "dev_tenant_header_not_allowed":
    case "tenant_membership_denied":
      return {
        status: 403,
        body: { ok: false, error: "unknown_tenant_id" }
      };
  }
}
