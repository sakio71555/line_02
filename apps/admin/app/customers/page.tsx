import { getAdminApiConfig, getAdminCustomers, type AdminApiRequestOptions } from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { CustomersPageView, type CustomersPageLoadResult } from "./customers-page-view";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const requestOptions = await getServerAdminApiRequestOptions();
  const config = requestOptions.config ?? getAdminApiConfig();
  const result = await loadCustomers(requestOptions);

  return <CustomersPageView config={config} result={result} />;
}

async function loadCustomers(options: AdminApiRequestOptions): Promise<CustomersPageLoadResult> {
  try {
    const response = await getAdminCustomers(options);
    return {
      status: "ok",
      customers: response.customers
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}
