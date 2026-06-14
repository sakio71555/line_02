export type AdminAuthErrorCode =
  | "missing_tenant_context"
  | "unknown_tenant"
  | "dev_tenant_header_not_allowed"
  | "authenticated_staff_required"
  | "missing_auth_user"
  | "staff_not_found"
  | "staff_inactive"
  | "membership_not_found"
  | "tenant_membership_denied"
  | "tenant_selection_required"
  | "session_expired"
  | "permission_denied";

export type AdminAuthResponseErrorCode =
  | "missing_tenant_id"
  | "unknown_tenant_id"
  | "dev_tenant_header_not_allowed"
  | "authenticated_staff_required"
  | "tenant_membership_denied"
  | "tenant_selection_required"
  | "session_expired"
  | "permission_denied";

export type AdminAuthPlaceholderRoute =
  | "/login"
  | "/select-tenant"
  | "/permission-denied"
  | "/session-expired";

export interface AdminAuthError {
  code: AdminAuthErrorCode;
}

export interface AdminAuthErrorHttpResponse {
  status: 401 | 403 | 409;
  body: {
    ok: false;
    error: AdminAuthResponseErrorCode;
  };
  placeholderRoute: AdminAuthPlaceholderRoute;
}

export function mapAdminAuthErrorToHttp(error: AdminAuthError): AdminAuthErrorHttpResponse {
  switch (error.code) {
    case "missing_tenant_context":
      return legacyAdminAuthResponse(401, "missing_tenant_id", "/login");
    case "unknown_tenant":
      return legacyAdminAuthResponse(403, "unknown_tenant_id", "/permission-denied");
    case "dev_tenant_header_not_allowed":
      return adminAuthResponse(403, "dev_tenant_header_not_allowed", "/permission-denied");
    case "authenticated_staff_required":
    case "missing_auth_user":
    case "staff_not_found":
      return adminAuthResponse(401, "authenticated_staff_required", "/login");
    case "session_expired":
      return adminAuthResponse(401, "session_expired", "/session-expired");
    case "staff_inactive":
    case "membership_not_found":
    case "tenant_membership_denied":
      return adminAuthResponse(403, "tenant_membership_denied", "/permission-denied");
    case "permission_denied":
      return adminAuthResponse(403, "permission_denied", "/permission-denied");
    case "tenant_selection_required":
      return adminAuthResponse(409, "tenant_selection_required", "/select-tenant");
  }
}

function legacyAdminAuthResponse(
  status: AdminAuthErrorHttpResponse["status"],
  error: AdminAuthResponseErrorCode,
  placeholderRoute: AdminAuthPlaceholderRoute
): AdminAuthErrorHttpResponse {
  return adminAuthResponse(status, error, placeholderRoute);
}

function adminAuthResponse(
  status: AdminAuthErrorHttpResponse["status"],
  error: AdminAuthResponseErrorCode,
  placeholderRoute: AdminAuthPlaceholderRoute
): AdminAuthErrorHttpResponse {
  return {
    status,
    body: {
      ok: false,
      error
    },
    placeholderRoute
  };
}
