import { getAdminBroadcastPreview, type AdminApiRequestOptions } from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { BroadcastPageView, type BroadcastPageLoadResult } from "./broadcast-page-view";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const requestOptions = await getServerAdminApiRequestOptions();
  const result = await loadPreview(requestOptions);

  return <BroadcastPageView result={result} />;
}

async function loadPreview(options: AdminApiRequestOptions): Promise<BroadcastPageLoadResult> {
  try {
    return {
      status: "ok",
      preview: await getAdminBroadcastPreview(options)
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}
