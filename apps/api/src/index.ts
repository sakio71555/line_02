import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { loadAppConfig } from "@amami-line-crm/config";
import { parseLineWebhookPayload, verifyLineSignature } from "@amami-line-crm/line";

export const app = new Hono();

app.get("/health", (c) => {
  const config = loadAppConfig();
  return c.json({
    ok: true,
    tenant_id: config.tenant.id,
    tenant_slug: config.tenant.slug,
    external_connections: "disabled"
  });
});

app.post("/api/line/webhook/:webhookSecret", async (c) => {
  const webhookSecret = c.req.param("webhookSecret");
  const tenant = resolveWebhookTenant(webhookSecret, process.env);

  if (!tenant) {
    return c.json({ ok: false, error: "unknown_webhook_path" }, 404);
  }

  if (!tenant.channelSecret) {
    return c.json({ ok: false, error: "line_channel_secret_not_configured" }, 500);
  }

  const rawBody = await c.req.text();
  const signature = c.req.header("x-line-signature") ?? "";
  const signatureValid = verifyLineSignature({
    channelSecret: tenant.channelSecret,
    body: rawBody,
    signature
  });

  if (!signatureValid) {
    return c.json({ ok: false, error: "invalid_line_signature" }, 401);
  }

  try {
    const payload = parseLineWebhookPayload(rawBody);

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      tenant_slug: tenant.tenantSlug,
      destination: payload.destination,
      event_count: payload.events.length,
      events: payload.events
    });
  } catch {
    return c.json({ ok: false, error: "malformed_line_webhook_body" }, 400);
  }
});

interface ResolvedWebhookTenant {
  tenantId: string;
  tenantSlug: string;
  channelSecret: string | undefined;
}

function resolveWebhookTenant(
  webhookSecret: string,
  env: NodeJS.ProcessEnv
): ResolvedWebhookTenant | null {
  const config = loadAppConfig(env);

  if (webhookSecret !== config.line.webhookSecretPath) {
    return null;
  }

  return {
    tenantId: config.tenant.id,
    tenantSlug: config.tenant.slug,
    channelSecret: env.LINE_CHANNEL_SECRET
  };
}

if (process.env.NODE_ENV !== "test") {
  serve(
    {
      fetch: app.fetch,
      port: 4000
    },
    (info) => {
      console.log(`API server listening on http://localhost:${info.port}`);
    }
  );
}
