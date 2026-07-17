import { AlertsPageView, type AlertsPageLoadResult } from "./alerts-page-view";
import {
  getAdminCustomers,
  listAlerts,
  type AdminApiRequestOptions,
  type AdminCustomerListItem
} from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const requestOptions = await getServerAdminApiRequestOptions();
  const [alerts, customers] = await Promise.all([
    loadAlerts(requestOptions),
    loadCustomers(requestOptions)
  ]);

  return <AlertsPageView alerts={alerts} customers={customers} />;
}

async function loadAlerts(options: AdminApiRequestOptions): Promise<AlertsPageLoadResult> {
  try {
    const response = await listAlerts(undefined, options);

    return {
      status: "ok",
      alerts: response.alerts
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

async function loadCustomers(
  options: AdminApiRequestOptions
): Promise<AdminCustomerListItem[]> {
  try {
    const response = await getAdminCustomers(options);
    return response.customers;
  } catch {
    return [];
  }
}
