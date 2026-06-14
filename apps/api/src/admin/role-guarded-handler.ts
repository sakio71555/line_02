import type { AdminAction } from "@amami-line-crm/domain";

import {
  mapAdminAuthErrorToHttp,
  type AdminAuthErrorHttpResponse
} from "./auth-error-response";
import {
  evaluateAdminRoleGuard,
  mapAdminRoleGuardFailureToAuthError,
  type AuthenticatedStaffRoleGuardContext
} from "./role-guard";
import type { AdminTenantContext } from "./tenant-context";

export interface AdminRoleGuardedHandlerInput<TBody> {
  context: AdminTenantContext;
  action: AdminAction;
  handler: (context: AuthenticatedStaffRoleGuardContext) => TBody | Promise<TBody>;
}

export type AdminRoleGuardedHandlerResult<TBody> =
  | {
      ok: true;
      status: 200;
      body: TBody;
      action: AdminAction;
      context: AuthenticatedStaffRoleGuardContext;
    }
  | {
      ok: false;
      status: AdminAuthErrorHttpResponse["status"];
      body: AdminAuthErrorHttpResponse["body"];
      placeholderRoute: AdminAuthErrorHttpResponse["placeholderRoute"];
    };

export async function runRoleGuardedAdminHandler<TBody>(
  input: AdminRoleGuardedHandlerInput<TBody>
): Promise<AdminRoleGuardedHandlerResult<TBody>> {
  const guard = evaluateAdminRoleGuard({
    context: input.context,
    action: input.action
  });

  if (!guard.ok) {
    const response = mapAdminAuthErrorToHttp(mapAdminRoleGuardFailureToAuthError(guard));

    return {
      ok: false,
      status: response.status,
      body: response.body,
      placeholderRoute: response.placeholderRoute
    };
  }

  const body = await input.handler(guard.context);

  return {
    ok: true,
    status: 200,
    body,
    action: guard.action,
    context: guard.context
  };
}
