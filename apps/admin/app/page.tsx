import { getServerAdminApiRequestOptions } from "./admin-api-request-options";
import {
  getAdminCustomers,
  listAlerts,
  type AdminApiRequestOptions
} from "../src/admin-api";
import { AdminHomePageView, type DashboardData } from "./admin-home-page-view";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const options = await getServerAdminApiRequestOptions();
  const data = await loadDashboardData(options);
  return <AdminHomePageView data={data} />;
}

async function loadDashboardData(options: AdminApiRequestOptions): Promise<DashboardData> {
  try {
    const [customerResponse, alertResponse] = await Promise.all([
      getAdminCustomers(options),
      listAlerts(undefined, options)
    ]);
    return { customers: customerResponse.customers, alerts: alertResponse.alerts };
  } catch (error) {
    return {
      customers: [],
      alerts: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
