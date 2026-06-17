import { cookies } from "next/headers";

import { getAdminApiConfig, type AdminApiRequestOptions } from "../src/admin-api";
import { normalizeSelectedTenantId, SELECTED_TENANT_COOKIE_NAME } from "../src/selected-tenant";

export async function getServerAdminApiRequestOptions(): Promise<AdminApiRequestOptions> {
  const cookieStore = await cookies();
  const selectedTenantId = normalizeSelectedTenantId(
    cookieStore.get(SELECTED_TENANT_COOKIE_NAME)?.value
  );
  const config = getAdminApiConfig();

  return {
    config: selectedTenantId
      ? {
          ...config,
          selectedTenantId
        }
      : config
  };
}
