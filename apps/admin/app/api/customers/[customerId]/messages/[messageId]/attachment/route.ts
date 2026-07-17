import { getServerAdminApiRequestOptions } from "../../../../../../admin-api-request-options";
import { getAdminCustomerMessageAttachment } from "../../../../../../../src/admin-api";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ customerId: string; messageId: string }> }
): Promise<Response> {
  const { customerId, messageId } = await context.params;

  try {
    const attachment = await getAdminCustomerMessageAttachment(
      customerId,
      messageId,
      await getServerAdminApiRequestOptions()
    );
    const headers = new Headers({
      "cache-control": "private, no-store",
      "content-type": attachment.contentType ?? "application/octet-stream",
      "x-content-type-options": "nosniff"
    });

    if (attachment.contentDisposition) {
      headers.set("content-disposition", attachment.contentDisposition);
    }

    if (attachment.contentLength) {
      headers.set("content-length", attachment.contentLength);
    }

    return new Response(attachment.body, {
      status: 200,
      headers
    });
  } catch {
    return Response.json({ ok: false, error: "attachment_not_found" }, { status: 404 });
  }
}
