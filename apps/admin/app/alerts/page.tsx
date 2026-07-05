import { AlertsPageView, type AlertsPageLoadResult } from "./alerts-page-view";
import { listAlerts, type AdminApiRequestOptions } from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const requestOptions = await getServerAdminApiRequestOptions();
  const alerts = await loadAlerts(requestOptions);

  return <AlertsPageView alerts={alerts} />;
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
