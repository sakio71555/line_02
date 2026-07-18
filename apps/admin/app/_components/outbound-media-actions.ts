"use server";

import {
  discardAdminOutboundMediaUpload,
  prepareAdminOutboundMediaUpload,
  type AdminOutboundMediaReference
} from "../../src/admin-api";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";

export async function prepareOutboundMediaUploadAction(
  media: Omit<AdminOutboundMediaReference, "media_id">
) {
  return prepareAdminOutboundMediaUpload(
    media,
    await getServerAdminApiRequestOptions()
  );
}

export async function discardOutboundMediaUploadAction(
  media: AdminOutboundMediaReference
): Promise<void> {
  await discardAdminOutboundMediaUpload(
    media,
    await getServerAdminApiRequestOptions()
  );
}
