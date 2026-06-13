import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { loadAppConfig } from "@amami-line-crm/config";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  listCustomerListItems,
  logLineWebhookEvents,
  type CustomerRepository,
  type MessageRepository
} from "@amami-line-crm/domain";
import { parseLineWebhookPayload, verifyLineSignature } from "@amami-line-crm/line";

export interface ApiAppDependencies {
  customerRepository?: CustomerRepository;
  messageRepository?: MessageRepository;
  env?: NodeJS.ProcessEnv;
}

const defaultCustomerRepository = new InMemoryCustomerRepository();
const defaultMessageRepository = new InMemoryMessageRepository();

export function createApiApp(dependencies: ApiAppDependencies = {}): Hono {
  const api = new Hono();
  const customerRepository = dependencies.customerRepository ?? defaultCustomerRepository;
  const messageRepository = dependencies.messageRepository ?? defaultMessageRepository;
  const env = dependencies.env ?? process.env;

  api.get("/health", (c) => {
    const config = loadAppConfig(env);
    return c.json({
      ok: true,
      tenant_id: config.tenant.id,
      tenant_slug: config.tenant.slug,
      external_connections: "disabled"
    });
  });

  api.get("/api/admin/customers", async (c) => {
    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status === "missing") {
      return c.json({ ok: false, error: "missing_tenant_id" }, 401);
    }

    if (tenant.status === "unknown") {
      return c.json({ ok: false, error: "unknown_tenant_id" }, 403);
    }

    const customers = await listCustomerListItems({
      tenant_id: tenant.tenantId,
      customerRepository,
      messageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customers
    });
  });

  api.post("/api/line/webhook/:webhookSecret", async (c) => {
    const webhookSecret = c.req.param("webhookSecret");
    const tenant = resolveWebhookTenant(webhookSecret, env);

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
      const logging = await logLineWebhookEvents({
        tenant_id: tenant.tenantId,
        events: payload.events,
        customerRepository,
        messageRepository
      });

      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        tenant_slug: tenant.tenantSlug,
        destination: payload.destination,
        event_count: payload.events.length,
        events: payload.events,
        logging
      });
    } catch {
      return c.json({ ok: false, error: "malformed_line_webhook_body" }, 400);
    }
  });

  return api;
}

export const app = createApiApp();

interface ResolvedWebhookTenant {
  tenantId: string;
  tenantSlug: string;
  channelSecret: string | undefined;
}

type ResolvedAdminTenant =
  | { status: "ok"; tenantId: string }
  | { status: "missing" }
  | { status: "unknown" };

function resolveAdminTenant(
  tenantId: string | undefined,
  env: NodeJS.ProcessEnv
): ResolvedAdminTenant {
  if (!tenantId) {
    return { status: "missing" };
  }

  const config = loadAppConfig(env);

  if (tenantId !== config.tenant.id) {
    return { status: "unknown" };
  }

  return { status: "ok", tenantId };
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
