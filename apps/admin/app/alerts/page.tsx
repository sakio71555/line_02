import { AlertsPageView, type AlertsPageLoadResult } from "./alerts-page-view";
import { getAdminApiConfig, listAlerts } from "../../src/admin-api";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const config = getAdminApiConfig();
  const alerts = await loadAlerts();

  return <AlertsPageView alerts={alerts} config={config} />;
}

async function loadAlerts(): Promise<AlertsPageLoadResult> {
  try {
    const response = await listAlerts();

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
