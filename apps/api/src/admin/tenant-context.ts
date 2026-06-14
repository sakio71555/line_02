import { loadAppConfig } from "@amami-line-crm/config";
import type { StaffRole } from "@amami-line-crm/domain";

import {
  mapAdminAuthErrorToHttp,
  type AdminAuthErrorCode,
  type AdminAuthErrorHttpResponse
} from "./auth-error-response";

export type AdminTenantContextSource = "dev_header" | "authenticated_staff";

export interface AdminTenantContext {
  tenantId: string;
  source: AdminTenantContextSource;
  staffUserId?: string;
  authUserId?: string;
  role?: StaffRole;
}

export type AdminTenantGuardErrorCode = Extract<
  AdminAuthErrorCode,
  | "missing_tenant_context"
  | "unknown_tenant"
  | "dev_tenant_header_not_allowed"
  | "authenticated_staff_required"
  | "tenant_membership_denied"
  | "tenant_selection_required"
>;

export interface AdminTenantGuardError {
  code: AdminTenantGuardErrorCode;
}

export type AdminTenantGuardResult =
  | { status: "ok"; tenantId: string; context: AdminTenantContext }
  | { status: "missing"; error: AdminTenantGuardError }
  | { status: "unknown"; error: AdminTenantGuardError };

export type AdminTenantGuardHttpResponse = AdminAuthErrorHttpResponse;

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
  return mapAdminAuthErrorToHttp(error);
}
