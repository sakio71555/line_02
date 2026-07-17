import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  type AiConversationTurn,
  type AiProvider,
  type AiRagAnswerSource
} from "@amami-line-crm/ai";
import { loadAppConfig } from "@amami-line-crm/config";
import {
  buildCustomerActivityStaffNotificationPayload,
  buildStaffNotificationPayload,
  checkUnrepliedAlerts,
  getCustomerDetail,
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  ensureOpenUnrepliedCustomerMessageAlert,
  formatCustomerRichMenuTypeLabel,
  insertBotTextTimelineMessage,
  insertSystemAlertTimelineMessage,
  isPrivateLineAttachmentMessage,
  listCustomerListItems,
  listCustomerTimeline,
  logLineWebhookEvents,
  MockStaffNotifier,
  notifyOpenAlerts,
  recordCustomerRichMenuSwitchMessage,
  recordAiSummaryMessage,
  recordStaffTextReply,
  type AdminAction,
  type Alert,
  type AlertSeverity,
  type AlertRepository,
  type Customer,
  type CustomerLineStaffNotificationEvent,
  type CustomerNormalChatAiCandidate,
  type CustomerRichMenuType,
  type CustomerRepository,
  type LineReplyInstruction,
  type LineAttachmentStorage,
  type Message,
  type MessageRepository,
  type StaffAuthLookup,
  type StaffNotificationPayload,
  type StaffNotifier,
  isCustomerRichMenuType
} from "@amami-line-crm/domain";
import {
  FetchLineMessagingTransport,
  FetchLineIdTokenVerifier,
  LineIdTokenVerificationError,
  LineMessagingApiError,
  MAX_LINE_MESSAGE_CONTENT_BYTES,
  MockLineClient,
  parseLineWebhookPayload,
  RealLineClient,
  verifyLineSignature,
  type NormalizedLineWebhookEvent,
  type LineClient,
  type LineIdTokenIdentity,
  type LineIdTokenVerifier
} from "@amami-line-crm/line";
import {
  AMAMI_HOME_TENANT_ID,
  createAmamiHomeKnowledgePages,
  InMemoryKnowledgePageRepository,
  isOfficialSiteKnowledgeRefreshLeaseRepository,
  isWritableKnowledgePageRepository,
  searchTenantKnowledge,
  startOfficialSiteKnowledgeRefreshScheduler,
  type KnowledgePage,
  type KnowledgePageRepository
} from "@amami-line-crm/rag";

import {
  mapAdminTenantGuardErrorToHttp,
  resolveAdminTenantContext
} from "./admin/tenant-context";
import {
  mapAdminAuthErrorToHttp,
  type AdminAuthErrorCode,
  type AdminAuthErrorHttpResponse
} from "./admin/auth-error-response";
import {
  resolveAuthenticatedAdminRuntimeContext,
  type AuthenticatedAdminRuntimeDependencies,
  type AuthenticatedAdminRuntimeInput
} from "./admin/authenticated-runtime";
import {
  adminRouteActions,
  evaluateAdminRouteRoleGuardCompatibility
} from "./admin/role-guarded-handler";
import {
  evaluateAdminBroadcastGate,
  isAdminBroadcastAvailable,
  resolveAdminBroadcastMaxRecipients
} from "./admin/broadcast-gate";
import {
  evaluateStaffReplyLinePushGate,
  inferLineClientMode,
  InMemoryLinePushIdempotencyStore,
  isLineRealPushAdminContextAllowed,
  type LineClientMode,
  type LinePushIdempotencyStore,
  type StaffReplyLinePushRequest
} from "./admin/line-real-push-gate";
import {
  createProductionAdminAuthRuntimeDependencies,
  type ProductionAdminAuthRuntimeFactory,
  type ProductionAuthRuntimeFetch
} from "./admin/production-auth-runtime-gate";
import { resolveSelectedTenantIdTransport } from "./admin/selected-tenant-transport";
import type { SupabaseAuthClientLike } from "./admin/supabase-auth-session-verifier";
import type { AdminTenantContext } from "./admin/tenant-context";
import {
  createRuntimeAiProvider,
  createRuntimeLineClient,
  createRuntimeRepositories
} from "./runtime-wiring";

export interface ApiAppDependencies {
  alertRepository?: AlertRepository;
  customerMessageRepositories?: CustomerMessageRepositoryRuntimeBundle;
  customerRepository?: CustomerRepository;
  messageRepository?: MessageRepository;
  lineClient?: LineClient;
  staffLineClient?: LineClient;
  staffNotifier?: StaffNotifier;
  aiProvider?: AiProvider;
  knowledgePageRepository?: KnowledgePageRepository;
  adminAuthRuntime?: AuthenticatedAdminRuntimeDependencies;
  supabaseAuthClient?: SupabaseAuthClientLike;
  staffAuthLookup?: StaffAuthLookup;
  productionAuthRuntimeFactory?: ProductionAdminAuthRuntimeFactory;
  productionAuthRuntimeFetch?: ProductionAuthRuntimeFetch;
  authenticatedSelectedTenantId?: string | null;
  lineClientMode?: LineClientMode;
  linePushIdempotencyStore?: LinePushIdempotencyStore;
  lineIdTokenVerifier?: LineIdTokenVerifier;
  lineAttachmentStorage?: LineAttachmentStorage;
  startOfficialSiteKnowledgeSync?: boolean;
  now?: () => string;
  env?: NodeJS.ProcessEnv;
}

export type CustomerMessageRepositoryRuntimeMode = "in_memory" | "supabase";

export interface CustomerMessageRepositoryRuntimeBundle {
  runtime_mode?: CustomerMessageRepositoryRuntimeMode;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  alertRepository?: AlertRepository;
  knowledgePageRepository?: KnowledgePageRepository;
  lineAttachmentStorage?: LineAttachmentStorage;
}

const defaultAlertRepository = new InMemoryAlertRepository();
const defaultCustomerRepository = new InMemoryCustomerRepository();
const defaultMessageRepository = new InMemoryMessageRepository();
const defaultLineClient = new MockLineClient();
const defaultStaffNotifier = new MockStaffNotifier();
const defaultKnowledgePageRepository = new InMemoryKnowledgePageRepository(
  createAmamiHomeKnowledgePages()
);
const staticAmamiHomeKnowledgeFallbackRepository = new InMemoryKnowledgePageRepository(
  createAmamiHomeKnowledgePages()
);
const defaultLineIdTokenVerifier = new FetchLineIdTokenVerifier();
const PRODUCTION_STAFF_NOTIFICATION_ADMIN_BASE_URL = "https://admin.taiyolabel.site";

function shouldCreateRuntimeRepositories(dependencies: ApiAppDependencies): boolean {
  return (
    !dependencies.customerRepository &&
    !dependencies.messageRepository &&
    !dependencies.alertRepository &&
    !dependencies.knowledgePageRepository
  );
}

export function createApiApp(dependencies: ApiAppDependencies = {}): Hono {
  const api = new Hono();
  const env = dependencies.env ?? process.env;
  const config = loadAppConfig(env);
  const runtimeRepositories = dependencies.customerMessageRepositories
    ? dependencies.customerMessageRepositories
    : shouldCreateRuntimeRepositories(dependencies)
      ? createRuntimeRepositories({
          config,
          env
        })
      : undefined;
  const runtimeLineClient =
    dependencies.lineClientMode === undefined
      ? createRuntimeLineClient({
          config,
          env
        })
      : undefined;
  const alertRepository =
    dependencies.alertRepository ??
    runtimeRepositories?.alertRepository ??
    defaultAlertRepository;
  const customerRepository =
    dependencies.customerRepository ??
    runtimeRepositories?.customerRepository ??
    defaultCustomerRepository;
  const messageRepository =
    dependencies.messageRepository ??
    runtimeRepositories?.messageRepository ??
    defaultMessageRepository;
  const lineAttachmentStorage =
    dependencies.lineAttachmentStorage ?? runtimeRepositories?.lineAttachmentStorage;
  const lineClient = dependencies.lineClient ?? runtimeLineClient?.lineClient ?? defaultLineClient;
  const staffLineClient = dependencies.staffLineClient ?? createRuntimeStaffLineClient(env);
  const staffNotifier =
    dependencies.staffNotifier ?? createRuntimeStaffNotifier(env, staffLineClient);
  const aiProvider =
    dependencies.aiProvider ??
    createRuntimeAiProvider({
      config,
      env
    });
  const knowledgePageRepository =
    dependencies.knowledgePageRepository ??
    runtimeRepositories?.knowledgePageRepository ??
    defaultKnowledgePageRepository;
  const authenticatedSelectedTenantId = dependencies.authenticatedSelectedTenantId;
  const now = dependencies.now;
  const lineClientMode =
    dependencies.lineClientMode ?? runtimeLineClient?.lineClientMode ?? inferLineClientMode(env);
  const linePushIdempotencyStore =
    dependencies.linePushIdempotencyStore ?? new InMemoryLinePushIdempotencyStore();
  const lineIdTokenVerifier = dependencies.lineIdTokenVerifier ?? defaultLineIdTokenVerifier;
  const adminAuthRuntime =
    dependencies.adminAuthRuntime ??
    (isProductionRuntime(env)
      ? createProductionAdminAuthRuntimeDependencies({
          env,
          supabaseAuthClient: dependencies.supabaseAuthClient,
          staffAuthLookup: dependencies.staffAuthLookup,
          productionAuthRuntimeFactory: dependencies.productionAuthRuntimeFactory,
          fetch: dependencies.productionAuthRuntimeFetch
        })
      : undefined);
  const staffNotificationAdminBaseUrl = resolveStaffNotificationAdminBaseUrl(
    env,
    config.urls.appBaseUrl
  );

  if (
    dependencies.startOfficialSiteKnowledgeSync === true &&
    env.OFFICIAL_SITE_KNOWLEDGE_SYNC_ENABLED !== "false" &&
    isWritableKnowledgePageRepository(knowledgePageRepository) &&
    isOfficialSiteKnowledgeRefreshLeaseRepository(knowledgePageRepository)
  ) {
    startOfficialSiteKnowledgeRefreshScheduler({
      tenant_id: AMAMI_HOME_TENANT_ID,
      sources: createAmamiHomeKnowledgePages(),
      repository: knowledgePageRepository,
      leaseRepository: knowledgePageRepository,
      onResult(result) {
        console.info(
          `[official-site-knowledge-sync] requested=${result.requested} refreshed=${result.refreshed} failed=${result.failed}`
        );
      },
      onError() {
        console.error("[official-site-knowledge-sync] refresh_failed");
      }
    });
  }

  api.get("/health", (c) => {
    return c.json({
      ok: true,
      tenant_id: config.tenant.id,
      tenant_slug: config.tenant.slug,
      runtime: {
        data_backend: config.runtime.dataBackend,
        ai_provider: config.runtime.aiProvider,
        line_real_push_enabled: config.line.realPushEnabled
      },
      external_connections: "disabled"
    });
  });

  api.get("/api/liff/runtime-config", (c) => {
    const liffId = resolveLiffId(env);

    return c.json({
      ok: true,
      liff_id: liffId,
      liff_id_configured: Boolean(liffId)
    });
  });

  api.post("/api/liff/customer-profile", async (c) => {
    const requestBody = await readLiffCustomerProfileBody(c.req.raw);

    if (!requestBody) {
      return c.json({ ok: false, error: "invalid_liff_customer_profile_body" }, 400);
    }

    const lineIdTokenChannelId = resolveLineIdTokenChannelId(env, config.line.channelId);

    if (!lineIdTokenChannelId) {
      return c.json({ ok: false, error: "line_liff_channel_id_not_configured" }, 500);
    }

    let identity: LineIdTokenIdentity;

    try {
      identity = await lineIdTokenVerifier.verify({
        idToken: requestBody.idToken,
        channelId: lineIdTokenChannelId
      });
    } catch (error) {
      if (error instanceof LineIdTokenVerificationError) {
        return c.json({ ok: false, error: "invalid_line_id_token" }, 401);
      }

      return c.json({ ok: false, error: "line_id_token_verification_failed" }, 502);
    }

    const nowIso = now?.() ?? new Date().toISOString();
    const existing = await customerRepository.findByTenantAndLineUserId(
      config.tenant.id,
      identity.userId
    );
    const savedCustomer = await customerRepository.save(
      buildLiffCustomerProfileUpsert({
        existing,
        identity,
        input: requestBody,
        tenantId: config.tenant.id,
        now: nowIso
      })
    );
    const message = await messageRepository.insert(
      buildLiffCustomerProfileTimelineMessage({
        customer: savedCustomer,
        input: requestBody,
        now: nowIso
      })
    );
    const alertResult = await ensureOpenUnrepliedCustomerMessageAlert({
      tenant_id: config.tenant.id,
      customer: savedCustomer,
      alertRepository,
      now: () => nowIso
    });
    const staffNotifications = await notifyNewAlertsForProduction({
      env,
      tenantId: config.tenant.id,
      alertCount: alertResult.notification_required ? 1 : 0,
      alertRepository,
      customerRepository,
      staffNotifier,
      adminBaseUrl: staffNotificationAdminBaseUrl,
      ...(now ? { now } : {})
    });

    return c.json({
      ok: true,
      tenant_id: config.tenant.id,
      customer_id: savedCustomer.id,
      customer: {
        id: savedCustomer.id,
        tenant_id: savedCustomer.tenant_id,
        line_display_name: savedCustomer.display_name,
        phone: savedCustomer.phone,
        email: savedCustomer.email,
        postal_code: savedCustomer.postal_code,
        address: savedCustomer.address,
        tags: savedCustomer.interest_tags,
        updated_at: savedCustomer.updated_at
      },
      timeline_message: {
        id: message.id,
        role: message.role,
        message_type: message.message_type,
        created_at: message.created_at
      },
      alert_created: alertResult.created,
      staff_notifications: staffNotifications,
      verified_line_identity: true,
      line_user_id_recorded: false
    });
  });

  api.post("/api/dev/seed-demo-data", async (c) => {
    if (isProductionRuntime(env)) {
      return c.json({ ok: false, error: "dev_route_not_allowed" }, 403);
    }

    const tenantId = c.req.header("x-tenant-id");
    const tenant = resolveAdminTenant(tenantId, env);

    if (tenant.status !== "ok") {
      return c.json(tenant.httpResponse.body, tenant.httpResponse.status);
    }

    const seeded = await seedDemoData({
      tenant_id: tenant.tenantId,
      customerRepository,
      messageRepository,
      knowledgePageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer_ids: seeded.customers.map((customer) => customer.id),
      customers: seeded.customers.map((customer) => ({
        id: customer.id,
        tenant_id: customer.tenant_id,
        line_user_id: customer.line_user_id,
        display_name: customer.display_name,
        response_mode: customer.response_mode,
        last_customer_message_at: customer.last_customer_message_at,
        last_staff_reply_at: customer.last_staff_reply_at
      })),
      message_count: seeded.messages.length,
      knowledge_page_count: seeded.knowledge_pages_seeded
    });
  });

  api.get("/api/admin/customers", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.listCustomers,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
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

  api.get("/api/admin/broadcast/preview", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.previewBroadcast,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const customers = await customerRepository.listByTenant(tenant.tenantId);
    const selection = selectAdminBroadcastRecipients(customers);

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      total_customers: customers.length,
      eligible_recipients: selection.recipients.length,
      excluded_archived: customers.filter((customer) => customer.status === "archived").length,
      excluded_without_line: customers.filter(
        (customer) => customer.status !== "archived" && !customer.line_user_id?.trim()
      ).length,
      excluded_duplicate_line: selection.excludedDuplicateLine,
      broadcast_enabled: isAdminBroadcastAvailable({
        env,
        lineClientMode,
        tenantContext: tenant.context,
        selectedTenantId: tenant.selectedTenantId
      }),
      max_recipients: resolveAdminBroadcastMaxRecipients(env)
    });
  });

  api.post("/api/admin/broadcast/send", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.sendBroadcast,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const request = await readAdminBroadcastBody(c.req.raw);
    if (!request) {
      return c.json({ ok: false, error: "invalid_broadcast_body" }, 400);
    }

    const customers = await customerRepository.listByTenant(tenant.tenantId);
    const selection = selectAdminBroadcastRecipients(customers);
    const recipients = selection.recipients;
    const gate = evaluateAdminBroadcastGate({
      env,
      lineClientMode,
      tenantContext: tenant.context,
      selectedTenantId: tenant.selectedTenantId,
      recipientCount: recipients.length,
      body: request.body,
      confirmed: request.confirmed,
      confirmation: request.confirmation,
      idempotencyKey: request.idempotencyKey
    });

    if (!gate.ok) {
      return c.json({ ok: false, error: gate.error }, gate.status);
    }

    const idempotencyScope = `${tenant.tenantId}:broadcast:${request.idempotencyKey}`;
    if (!linePushIdempotencyStore.reserve(idempotencyScope)) {
      return c.json({ ok: false, error: "broadcast_duplicate" }, 409);
    }

    const staffUserId = readStaffReplyStaffUserId({
      env,
      staffUserIdHeader: c.req.header("x-staff-id")
    });
    let sentCount = 0;
    let failedCount = 0;
    let historyRecordFailedCount = 0;

    for (const customer of recipients) {
      const lineUserId = customer.line_user_id?.trim();
      if (!lineUserId) {
        continue;
      }

      try {
        await lineClient.pushMessage(lineUserId, [{ type: "text", text: request.body }]);
        sentCount += 1;
      } catch {
        failedCount += 1;
        continue;
      }

      const timestamp = now?.() ?? new Date().toISOString();
      try {
        await messageRepository.insert({
          id: globalThis.crypto.randomUUID(),
          tenant_id: tenant.tenantId,
          customer_id: customer.id,
          consultation_id: null,
          line_message_id: null,
          role: "staff",
          message_type: "text",
          body: request.body,
          media_storage_path: null,
          staff_user_id: staffUserId,
          ai_generated: false,
          sent_to_line_at: timestamp,
          created_at: timestamp
        });
        await customerRepository.save({
          ...customer,
          last_message_at: timestamp,
          updated_at: timestamp
        });
      } catch {
        historyRecordFailedCount += 1;
      }
    }

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      intended_recipients: recipients.length,
      sent_count: sentCount,
      failed_count: failedCount,
      history_record_failed_count: historyRecordFailedCount,
      retry_allowed: false
    });
  });

  api.get("/api/admin/customers/:customerId", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.getCustomerDetail,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const customer = await getCustomerDetail({
      tenant_id: tenant.tenantId,
      customer_id: c.req.param("customerId"),
      customerRepository
    });

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer
    });
  });

  api.post("/api/admin/customers/:customerId/archive", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.archiveCustomer,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const archiveRequest = await readCustomerArchiveBody(c.req.raw);
    if (!archiveRequest?.confirmed) {
      return c.json({ ok: false, error: "customer_archive_confirmation_required" }, 400);
    }

    const customer = await customerRepository.findByIdForTenant(
      tenant.tenantId,
      c.req.param("customerId")
    );
    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    const timestamp = now?.() ?? new Date().toISOString();
    const archivedCustomer =
      customer.status === "archived"
        ? customer
        : await customerRepository.save({
            ...customer,
            status: "archived",
            updated_at: timestamp
          });

    const alerts = await alertRepository.listByTenant(tenant.tenantId);
    await Promise.all(
      alerts
        .filter(
          (alert) =>
            alert.customer_id === customer.id &&
            (alert.status === "open" || alert.status === "notified")
        )
        .map((alert) =>
          alertRepository.updateStatus({
            tenant_id: tenant.tenantId,
            alert_id: alert.id,
            status: "resolved",
            resolved_at: timestamp,
            updated_at: timestamp
          })
        )
    );

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer_id: archivedCustomer.id,
      status: archivedCustomer.status
    });
  });

  api.post("/api/admin/customers/:customerId/restore", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.restoreCustomer,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const customer = await customerRepository.findByIdForTenant(
      tenant.tenantId,
      c.req.param("customerId")
    );
    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    const restoredCustomer = await customerRepository.save({
      ...customer,
      status: "active",
      updated_at: now?.() ?? new Date().toISOString()
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer_id: restoredCustomer.id,
      status: restoredCustomer.status
    });
  });

  api.get("/api/admin/customers/:customerId/timeline", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.getCustomerTimeline,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const customerId = c.req.param("customerId");
    const customer = await getCustomerDetail({
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      customerRepository
    });

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    const messages = await listCustomerTimeline({
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      messageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      messages
    });
  });

  api.get("/api/admin/customers/:customerId/messages/:messageId/attachment", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.getCustomerTimeline,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    if (!lineAttachmentStorage) {
      return c.json({ ok: false, error: "attachment_storage_unavailable" }, 503);
    }

    const customerId = c.req.param("customerId");
    const customer = await getCustomerDetail({
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      customerRepository
    });

    if (!customer) {
      return c.json({ ok: false, error: "attachment_not_found" }, 404);
    }

    const messages = await messageRepository.listByCustomer(tenant.tenantId, customerId);
    const message = messages.find((item) => item.id === c.req.param("messageId"));

    if (!message || !isPrivateLineAttachmentMessage(message) || !message.media_storage_path) {
      return c.json({ ok: false, error: "attachment_not_found" }, 404);
    }

    try {
      const attachment = await lineAttachmentStorage.download({
        tenant_id: tenant.tenantId,
        customer_id: customerId,
        media_storage_path: message.media_storage_path
      });

      if (attachment.data.size > MAX_LINE_MESSAGE_CONTENT_BYTES) {
        return c.json({ ok: false, error: "attachment_not_found" }, 404);
      }

      const contentType = resolveSafeAttachmentContentType(attachment.content_type);
      const disposition = isInlineAttachmentContentType(contentType) ? "inline" : "attachment";
      const fileName = buildSafeAttachmentFileName(message, message.media_storage_path);

      return new Response(attachment.data, {
        status: 200,
        headers: {
          "cache-control": "private, no-store",
          "content-disposition": `${disposition}; filename="${fileName}"`,
          "content-length": String(attachment.data.size),
          "content-type": contentType,
          "x-content-type-options": "nosniff"
        }
      });
    } catch {
      return c.json({ ok: false, error: "attachment_not_found" }, 404);
    }
  });

  api.get("/api/admin/runtime/line-real-send-capability", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.sendStaffReply,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const lineRealSendWindowOpen =
      isLineRealSendWindowOpen({ env, lineClientMode }) &&
      isLineRealPushAdminContextAllowed({ env, tenantContext: tenant.context });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      line_real_send_window_open: lineRealSendWindowOpen,
      real_send_action_visible: lineRealSendWindowOpen,
      delivery_mode_required: "real_line_push",
      explicit_confirmation_required: true,
      single_send_only: true,
      retry_allowed: false,
      bulk_multicast_broadcast_allowed: false
    });
  });

  api.post("/api/admin/customers/:customerId/rich-menu", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.sendStaffReply,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const customer = await customerRepository.findByIdForTenant(
      tenant.tenantId,
      c.req.param("customerId")
    );

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    if (customer.status === "archived") {
      return c.json({ ok: false, error: "customer_archived" }, 409);
    }

    const switchRequest = await readCustomerRichMenuSwitchBody(c.req.raw);

    if (!switchRequest) {
      return c.json({ ok: false, error: "invalid_rich_menu_switch_body" }, 400);
    }

    const lineUserId = customer.line_user_id?.trim();

    if (!lineUserId) {
      return c.json({ ok: false, error: "cannot_switch_rich_menu_without_line_user_id" }, 409);
    }

    const richMenuId = readCustomerRichMenuIdFromEnv(env, switchRequest.menuType);

    if (!richMenuId) {
      return c.json({ ok: false, error: "rich_menu_id_not_configured" }, 409);
    }

    if (!lineClient.linkRichMenuToUser) {
      return c.json({ ok: false, error: "line_rich_menu_link_not_configured" }, 501);
    }

    try {
      await lineClient.linkRichMenuToUser(lineUserId, richMenuId);
    } catch {
      return c.json({ ok: false, error: "line_rich_menu_switch_failed" }, 502);
    }

    const message = await recordCustomerRichMenuSwitchMessage(messageRepository, {
      tenant_id: tenant.tenantId,
      customer_id: customer.id,
      menu_type: switchRequest.menuType,
      created_at: now?.() ?? new Date().toISOString()
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer_id: customer.id,
      menu_type: switchRequest.menuType,
      menu_label: formatCustomerRichMenuTypeLabel(switchRequest.menuType),
      rich_menu_linked: true,
      line_message_sent: false,
      rich_menu_id_recorded: false,
      message: toAdminTimelineMessage(message)
    });
  });

  api.post("/api/admin/customers/:customerId/ai-summary", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.createAiSummary,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const customerId = c.req.param("customerId");
    const customer = await customerRepository.findByIdForTenant(tenant.tenantId, customerId);

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    const timelineMessages = await listCustomerTimeline({
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      messageRepository
    });
    const conversation = toAiConversationTurns(timelineMessages);

    if (conversation.length === 0) {
      return c.json({ ok: false, error: "cannot_summarize_empty_timeline" }, 409);
    }

    try {
      const summary = await aiProvider.summarizeConversation({
        tenant_id: tenant.tenantId,
        customer_id: customer.id,
        conversation
      });
      const message = await recordAiSummaryMessage({
        tenant_id: tenant.tenantId,
        customer,
        body: JSON.stringify(summary),
        messageRepository,
        ...(now ? { now } : {})
      });

      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        customer_id: customer.id,
        summary,
        message: toAdminTimelineMessage(message)
      });
    } catch {
      return c.json({ ok: false, error: "ai_summary_failed" }, 502);
    }
  });

  api.post("/api/admin/customers/:customerId/ai-reply-draft", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.createAiReplyDraft,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const customerId = c.req.param("customerId");
    const customer = await customerRepository.findByIdForTenant(tenant.tenantId, customerId);

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    const timelineMessages = await listCustomerTimeline({
      tenant_id: tenant.tenantId,
      customer_id: customerId,
      messageRepository
    });
    const conversation = toAiConversationTurns(timelineMessages);

    if (conversation.length === 0) {
      return c.json({ ok: false, error: "cannot_draft_reply_empty_timeline" }, 409);
    }

    try {
      const draft = await aiProvider.draftReply({
        tenant_id: tenant.tenantId,
        customer_id: customer.id,
        conversation
      });

      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        customer_id: customer.id,
        draft_body: draft.draft_body,
        next_questions: draft.next_questions,
        risk_flags: draft.risk_flags,
        recommended_response_mode: draft.recommended_response_mode,
        should_handoff: draft.should_handoff,
        provider: draft.provider
      });
    } catch {
      return c.json({ ok: false, error: "ai_reply_draft_failed" }, 502);
    }
  });

  api.post("/api/admin/rag/search", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.searchRag,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const searchBody = await readRagSearchBody(c.req.raw);

    if (!searchBody) {
      return c.json({ ok: false, error: "invalid_rag_search_request" }, 400);
    }

    const results = await searchTenantKnowledge({
      tenant_id: tenant.tenantId,
      query: searchBody.query,
      limit: searchBody.limit,
      repository: knowledgePageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      query: searchBody.query,
      limit: searchBody.limit,
      results
    });
  });

  api.post("/api/admin/rag/answer-draft", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.createRagAnswerDraft,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const searchBody = await readRagSearchBody(c.req.raw);

    if (!searchBody) {
      return c.json({ ok: false, error: "invalid_rag_answer_draft_request" }, 400);
    }

    const results = await searchTenantKnowledge({
      tenant_id: tenant.tenantId,
      query: searchBody.query,
      limit: searchBody.limit,
      repository: knowledgePageRepository
    });
    const sources = toAiRagAnswerSources(results);

    if (sources.length === 0) {
      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        query: searchBody.query,
        can_answer: false,
        answer_body: "公式情報では確認できません。担当者が確認します。",
        sources: [],
        risk_flags: ["no_source"],
        handoff_required: true,
        recommended_response_mode: "human_required"
      });
    }

    try {
      const draft = await aiProvider.draftRagAnswer({
        tenant_id: tenant.tenantId,
        query: searchBody.query,
        sources
      });

      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        query: searchBody.query,
        can_answer: draft.can_answer,
        answer_body: draft.answer_body,
        sources: draft.sources,
        risk_flags: draft.risk_flags,
        handoff_required: draft.handoff_required,
        recommended_response_mode: draft.recommended_response_mode,
        provider: draft.provider
      });
    } catch {
      return c.json({ ok: false, error: "rag_answer_draft_failed" }, 502);
    }
  });

  api.post("/api/admin/customers/:customerId/reply", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.sendStaffReply,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const customer = await customerRepository.findByIdForTenant(
      tenant.tenantId,
      c.req.param("customerId")
    );

    if (!customer) {
      return c.json({ ok: false, error: "customer_not_found" }, 404);
    }

    if (customer.status === "archived") {
      return c.json({ ok: false, error: "customer_archived" }, 409);
    }

    const replyRequest = await readStaffReplyBody(c.req.raw);

    if (!replyRequest) {
      return c.json({ ok: false, error: "invalid_reply_body" }, 400);
    }

    const isDemoSave = replyRequest.deliveryMode === "demo_save";

    if (!isDemoSave) {
      const lineUserId = customer.line_user_id;

      if (!lineUserId) {
        return c.json({ ok: false, error: "cannot_reply_without_line_user_id" }, 409);
      }

      const linePushGate = evaluateStaffReplyLinePushGate({
        env,
        lineClientMode,
        tenantContext: tenant.context,
        selectedTenantId: tenant.selectedTenantId,
        customer,
        request: replyRequest
      });

      if (!linePushGate.ok) {
        return c.json({ ok: false, error: linePushGate.error }, linePushGate.status);
      }

      if (
        linePushGate.idempotencyScope &&
        !linePushIdempotencyStore.reserve(linePushGate.idempotencyScope)
      ) {
        return c.json({ ok: false, error: "real_push_duplicate" }, 409);
      }

      try {
        await lineClient.pushMessage(lineUserId, [{ type: "text", text: replyRequest.body }]);
      } catch {
        if (linePushGate.idempotencyScope) {
          linePushIdempotencyStore.release(linePushGate.idempotencyScope);
        }

        return c.json({ ok: false, error: "line_send_failed" }, 502);
      }
    }

    const result = await recordStaffTextReply({
      tenant_id: tenant.tenantId,
      customer,
      body: replyRequest.body,
      staff_user_id: readStaffReplyStaffUserId({
        env,
        staffUserIdHeader: c.req.header("x-staff-id")
      }),
      customerRepository,
      messageRepository
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      customer_id: customer.id,
      message: {
        id: result.message.id,
        tenant_id: result.message.tenant_id,
        customer_id: result.message.customer_id,
        role: result.message.role,
        message_type: result.message.message_type,
        body: result.message.body,
        line_message_id: result.message.line_message_id,
        source_url: result.message.media_storage_path,
        created_at: result.message.created_at
      },
      customer: {
        id: result.customer.id,
        tenant_id: result.customer.tenant_id,
        response_mode: result.customer.response_mode,
        last_staff_reply_at: result.customer.last_staff_reply_at
      }
    });
  });

  api.get("/api/admin/alerts", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.listAlerts,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const status = c.req.query("status");
    const alerts = await alertRepository.listByTenant(tenant.tenantId);
    const filteredAlerts = status
      ? alerts.filter((alert) => alert.status === status)
      : alerts;

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      alerts: filteredAlerts.map(toAdminAlert)
    });
  });

  api.post("/api/admin/alerts/check-unreplied", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.checkUnrepliedAlerts,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const result = await checkUnrepliedAlerts({
      tenant_id: tenant.tenantId,
      customerRepository,
      alertRepository,
      ...(now ? { now } : {})
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      checked_customers: result.checked_customers,
      alerts_created: result.alerts_created,
      alerts: result.alerts.map((alert) => ({
        ...alert,
        type: alert.alert_type
      }))
    });
  });

  api.post("/api/admin/alerts/notify-open", async (c) => {
    const tenant = await resolveTenantScopedAdminRouteTenant({
      authorizationHeader: c.req.header("authorization"),
      selectedTenantIdHeader: c.req.header("x-selected-tenant-id"),
      tenantIdHeader: c.req.header("x-tenant-id"),
      action: adminRouteActions.notifyOpenAlerts,
      adminAuthRuntime,
      authenticatedSelectedTenantId,
      env
    });

    if (!tenant.ok) {
      return c.json(tenant.body, tenant.status);
    }

    const result = await notifyOpenAlerts({
      tenant_id: tenant.tenantId,
      alertRepository,
      customerRepository,
      staffNotifier,
      adminBaseUrl: staffNotificationAdminBaseUrl,
      ...(now ? { now } : {})
    });

    return c.json({
      ok: true,
      tenant_id: tenant.tenantId,
      notified: result.notified,
      failed: result.failed,
      skipped: result.skipped,
      notified_alerts: result.notified_alerts,
      failed_alerts: result.failed_alerts
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

    let payload: ReturnType<typeof parseLineWebhookPayload>;

    try {
      payload = parseLineWebhookPayload(rawBody);
    } catch {
      return c.json({ ok: false, error: "malformed_line_webhook_body" }, 400);
    }

    try {
      const customerLineStaffNotificationSetup =
        await setupStaffLineNotificationTargetFromCustomerLine({
          events: payload.events,
          env,
          lineClient
        });
      const customerLoggingEvents = customerLineStaffNotificationSetup.enabled
        ? payload.events.filter((event) => !isStaffLineSetupTriggerEvent(event))
        : payload.events;
      const logging = await logLineWebhookEvents({
        tenant_id: tenant.tenantId,
        events: customerLoggingEvents,
        customerRepository,
        messageRepository,
        alertRepository,
        getLineDisplayName: (lineUserId) =>
          getLineDisplayNameFromLineProfile(lineClient, lineUserId),
        ...(lineClient.getMessageContent && lineAttachmentStorage
          ? {
              storeLineAttachment: async (attachment: {
                tenant_id: string;
                customer_id: string;
                line_message_id: string;
                message_type: "image" | "video" | "audio" | "file";
                file_name: string | null;
              }) => {
                const content = await lineClient.getMessageContent!(attachment.line_message_id);
                return lineAttachmentStorage.store({
                  ...attachment,
                  content_type: content.contentType,
                  data: content.data
                });
              }
            }
          : {})
      });
      const {
        line_reply_instructions: lineReplyInstructions,
        normal_chat_ai_candidates: normalChatAiCandidates,
        staff_notification_alerts: staffNotificationAlerts,
        staff_notification_events: staffNotificationEvents
      } = logging;
      const structuredLineReplies = await replyToLineReplyInstructions({
        tenant_id: tenant.tenantId,
        instructions: lineReplyInstructions,
        lineClient,
        customerRepository,
        messageRepository,
        alertRepository,
        ...(now ? { now } : {})
      });
      const normalChatAiReplies = await replyToNormalChatAiCandidates({
        tenant_id: tenant.tenantId,
        candidates: normalChatAiCandidates,
        aiProvider,
        knowledgePageRepository,
        lineClient,
        messageRepository,
        alertRepository
      });
      await notifySpecificAlertsForProduction({
        env,
        alerts: [
          ...staffNotificationAlerts,
          ...structuredLineReplies.staff_notification_alerts,
          ...normalChatAiReplies.staff_notification_alerts
        ],
        staffNotifier,
        customerRepository,
        adminBaseUrl: staffNotificationAdminBaseUrl,
        alertRepository,
        ...(now ? { now } : {})
      });
      await notifyCustomerActivitiesForProduction({
        env,
        events: staffNotificationEvents,
        staffNotifier,
        adminBaseUrl: staffNotificationAdminBaseUrl
      });

      return c.json({
        ok: true,
        event_count: payload.events.length
      });
    } catch {
      return c.json({ ok: false, error: "line_webhook_processing_failed" }, 500);
    }
  });

  api.post("/api/staff-line/webhook/:webhookSecret", async (c) => {
    const webhookSecret = c.req.param("webhookSecret");
    const staffLineWebhook = resolveStaffLineWebhook(webhookSecret, env);

    if (!staffLineWebhook) {
      return c.json({ ok: false, error: "unknown_staff_line_webhook_path" }, 404);
    }

    if (!staffLineWebhook.channelSecret) {
      return c.json({ ok: false, error: "staff_line_channel_secret_not_configured" }, 500);
    }

    const rawBody = await c.req.text();
    const signature = c.req.header("x-line-signature") ?? "";
    const signatureValid = verifyLineSignature({
      channelSecret: staffLineWebhook.channelSecret,
      body: rawBody,
      signature
    });

    if (!signatureValid) {
      return c.json({ ok: false, error: "invalid_staff_line_signature" }, 401);
    }

    let payload: ReturnType<typeof parseLineWebhookPayload>;

    try {
      payload = parseLineWebhookPayload(rawBody);
    } catch {
      return c.json({ ok: false, error: "malformed_staff_line_webhook_body" }, 400);
    }

    try {
      const sanitizedSummary = summarizeStaffLineWebhookEvents(payload.events);
      const customerChannelFallbackEnabled =
        isStaffLineCustomerChannelNotificationFallbackEnabled(env);
      const notificationTargetCapture = customerChannelFallbackEnabled
        ? skippedStaffLineNotificationTargetCapture(env, "customer_channel_fallback_enabled")
        : captureStaffLineNotificationTarget(payload.events, env);
      const setupReply = customerChannelFallbackEnabled
        ? skippedStaffLineSetupReply("customer_channel_fallback_enabled")
        : await replyToStaffLineTargetSetupEvents({
            events: payload.events,
            env,
            lineClient: staffLineClient,
            notificationTargetCapture
          });
      logStaffLineWebhookProcessingResult({
        env,
        eventCount: payload.events.length,
        sanitizedSummary,
        notificationTargetCapture,
        setupReply
      });

      return c.json({
        ok: true,
        tenant_id: staffLineWebhook.tenantId,
        tenant_slug: staffLineWebhook.tenantSlug,
        destination_present: Boolean(payload.destination),
        event_count: payload.events.length,
        staff_line_logging: sanitizedSummary,
        notification_target_capture: notificationTargetCapture,
        setup_reply: setupReply,
        staff_linking_executed: false,
        staff_notification_send_executed: false
      });
    } catch {
      return c.json({ ok: false, error: "staff_line_webhook_processing_failed" }, 500);
    }
  });

  return api;
}

async function replyToLineReplyInstructions(input: {
  tenant_id: string;
  instructions: LineReplyInstruction[];
  lineClient: LineClient;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  alertRepository: AlertRepository;
  now?: () => string;
}): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  confirmation_failed: number;
  staff_notification_alerts: Alert[];
}> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let confirmationFailed = 0;
  const staffNotificationAlerts: Alert[] = [];

  for (const instruction of input.instructions) {
    if (!instruction.customer_id || !instruction.reply_token) {
      if (instruction.pending_message_id) {
        await deletePendingLineReplyMessage(
          input.messageRepository,
          input.tenant_id,
          instruction.pending_message_id
        );
      }

      if (instruction.customer_id) {
        const failure = await recordLineReplyDeliveryFailure({
          tenant_id: input.tenant_id,
          customer_id: instruction.customer_id,
          body: "LINE自動返信を送信できませんでした。担当者の確認が必要です。",
          customerRepository: input.customerRepository,
          messageRepository: input.messageRepository,
          alertRepository: input.alertRepository,
          ...(input.now ? { now: input.now } : {})
        });
        if (failure.notification_required && failure.alert) {
          staffNotificationAlerts.push(failure.alert);
        }
      }

      if (!instruction.reply_token) {
        skipped += 1;
      } else {
        failed += 1;
      }
      continue;
    }

    try {
      await input.lineClient.replyMessage(instruction.reply_token, [
        {
          type: "text",
          text: instruction.text,
          ...(instruction.quick_reply_texts && instruction.quick_reply_texts.length > 0
            ? {
                quickReply: {
                  items: instruction.quick_reply_texts.map((text) => ({
                    type: "action" as const,
                    action: {
                      type: "message" as const,
                      label: text,
                      text
                    }
                  }))
                }
              }
            : {})
        }
      ]);
    } catch {
      await deletePendingLineReplyMessage(
        input.messageRepository,
        input.tenant_id,
        instruction.pending_message_id
      );
      const failure = await recordLineReplyDeliveryFailure({
        tenant_id: input.tenant_id,
        customer_id: instruction.customer_id,
        body: "LINE自動返信の送信に失敗しました。担当者の確認が必要です。",
        customerRepository: input.customerRepository,
        messageRepository: input.messageRepository,
        alertRepository: input.alertRepository,
        ...(input.now ? { now: input.now } : {})
      });
      if (failure.notification_required && failure.alert) {
        staffNotificationAlerts.push(failure.alert);
      }
      failed += 1;
      continue;
    }

    try {
      const confirmedMessage = await input.messageRepository.updateSentToLineAt({
        tenant_id: input.tenant_id,
        message_id: instruction.pending_message_id,
        sent_to_line_at: input.now?.() ?? new Date().toISOString()
      });

      if (!confirmedMessage) {
        throw new Error("line_reply_delivery_confirmation_missing");
      }
      sent += 1;
    } catch {
      const failure = await recordLineReplyDeliveryFailure({
        tenant_id: input.tenant_id,
        customer_id: instruction.customer_id,
        body:
          "LINE自動返信は送信されましたが、送信記録の更新に失敗しました。再送せず担当者が確認してください。",
        customerRepository: input.customerRepository,
        messageRepository: input.messageRepository,
        alertRepository: input.alertRepository,
        ...(input.now ? { now: input.now } : {})
      });
      if (failure.notification_required && failure.alert) {
        staffNotificationAlerts.push(failure.alert);
      }
      confirmationFailed += 1;
    }
  }

  return {
    sent,
    failed,
    skipped,
    confirmation_failed: confirmationFailed,
    staff_notification_alerts: staffNotificationAlerts
  };
}

async function deletePendingLineReplyMessage(
  messageRepository: MessageRepository,
  tenantId: string,
  messageId: string
): Promise<void> {
  try {
    await messageRepository.deleteByIdForTenant(tenantId, messageId);
  } catch {
    // Pending LINE replies remain hidden from Admin even when cleanup is unavailable.
  }
}

async function recordLineReplyDeliveryFailure(input: {
  tenant_id: string;
  customer_id: string;
  body: string;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  alertRepository: AlertRepository;
  now?: () => string;
}): Promise<{ alert: Alert | null; created: boolean; notification_required: boolean }> {
  const customer = await input.customerRepository.findByIdForTenant(
    input.tenant_id,
    input.customer_id
  );

  if (!customer) {
    return { alert: null, created: false, notification_required: false };
  }

  const occurredAt = input.now?.() ?? new Date().toISOString();
  const alertResult = await ensureOpenUnrepliedCustomerMessageAlert({
    tenant_id: input.tenant_id,
    customer,
    alertRepository: input.alertRepository,
    message: input.body,
    severity: "high",
    now: () => occurredAt
  });

  try {
    await insertSystemAlertTimelineMessage(input.messageRepository, {
      tenant_id: input.tenant_id,
      customer_id: input.customer_id,
      body: input.body,
      created_at: occurredAt
    });
  } catch {
    // The durable staff alert is the primary escalation path.
  }

  return {
    alert: alertResult.alert,
    created: alertResult.created,
    notification_required: alertResult.notification_required
  };
}

async function replyToNormalChatAiCandidates(input: {
  tenant_id: string;
  candidates: CustomerNormalChatAiCandidate[];
  aiProvider: AiProvider;
  knowledgePageRepository: KnowledgePageRepository;
  lineClient: LineClient;
  messageRepository: MessageRepository;
  alertRepository: AlertRepository;
}): Promise<{
  attempted: number;
  answered: number;
  handoff_required: number;
  out_of_scope: number;
  messages_logged: number;
  alerts_created: number;
  alerts_notification_required: number;
  staff_notification_alerts: Alert[];
  line_replies: { sent: number; failed: number; skipped: number };
}> {
  let attempted = 0;
  let answered = 0;
  let handoffRequired = 0;
  let outOfScope = 0;
  let messagesLogged = 0;
  let alertsCreated = 0;
  let alertsNotificationRequired = 0;
  const staffNotificationAlerts: Alert[] = [];
  const lineReplies = { sent: 0, failed: 0, skipped: 0 };

  for (const candidate of input.candidates) {
    attempted += 1;
    const text = candidate.text.trim();

    if (!text) {
      lineReplies.skipped += 1;
      continue;
    }

    const staffRequired = requiresStaffForNormalChat(text);

    if (shouldDeferNormalChatBeforeKnowledgeSearch(candidate.customer_response_mode)) {
      const alertResult = await createNormalChatHandoffAlert({
        candidate,
        alertRepository: input.alertRepository,
        message: text
      });
      alertsCreated += alertResult.created ? 1 : 0;
      alertsNotificationRequired += alertResult.notification_required ? 1 : 0;
      if (alertResult.notification_required && alertResult.alert) {
        staffNotificationAlerts.push(alertResult.alert);
      }
      handoffRequired += 1;
      lineReplies.skipped += 1;
      continue;
    }

    if (staffRequired) {
      const replyText = buildNormalChatStaffHandoffReply();
      const replied = await replyAndLogNormalChatBotMessage({
        candidate,
        replyText,
        lineClient: input.lineClient,
        messageRepository: input.messageRepository
      });
      lineReplies.sent += replied.sent ? 1 : 0;
      lineReplies.failed += replied.failed ? 1 : 0;
      lineReplies.skipped += replied.skipped ? 1 : 0;
      messagesLogged += replied.message_logged ? 1 : 0;

      if (replied.failed) {
        const failureResult = await recordNormalChatReplyFailure({
          candidate,
          messageRepository: input.messageRepository,
          alertRepository: input.alertRepository,
          ...(replied.failure_message ? { message: replied.failure_message } : {})
        });
        messagesLogged += failureResult.message_logged ? 1 : 0;
        alertsCreated += failureResult.created ? 1 : 0;
        alertsNotificationRequired += failureResult.notification_required ? 1 : 0;
        if (failureResult.notification_required && failureResult.alert) {
          staffNotificationAlerts.push(failureResult.alert);
        }
        handoffRequired += 1;
        continue;
      }

      const alertResult = await createNormalChatHandoffAlert({
        candidate,
        alertRepository: input.alertRepository,
        message: text
      });
      alertsCreated += alertResult.created ? 1 : 0;
      alertsNotificationRequired += alertResult.notification_required ? 1 : 0;
      if (alertResult.notification_required && alertResult.alert) {
        staffNotificationAlerts.push(alertResult.alert);
      }
      handoffRequired += 1;
      continue;
    }

    const results = await searchTenantKnowledgeWithStaticFallback({
      tenant_id: input.tenant_id,
      query: text,
      limit: 3,
      repository: input.knowledgePageRepository
    });

    if (results.length > 0) {
      const replyText = await buildNormalChatKnowledgeReply({
        tenant_id: input.tenant_id,
        text,
        sources: toAiRagAnswerSources(results),
        aiProvider: input.aiProvider
      });
      const replied = await replyAndLogNormalChatBotMessage({
        candidate,
        replyText,
        lineClient: input.lineClient,
        messageRepository: input.messageRepository
      });
      lineReplies.sent += replied.sent ? 1 : 0;
      lineReplies.failed += replied.failed ? 1 : 0;
      lineReplies.skipped += replied.skipped ? 1 : 0;
      messagesLogged += replied.message_logged ? 1 : 0;
      if (replied.failed) {
        const failureResult = await recordNormalChatReplyFailure({
          candidate,
          messageRepository: input.messageRepository,
          alertRepository: input.alertRepository,
          ...(replied.failure_message ? { message: replied.failure_message } : {})
        });
        messagesLogged += failureResult.message_logged ? 1 : 0;
        alertsCreated += failureResult.created ? 1 : 0;
        alertsNotificationRequired += failureResult.notification_required ? 1 : 0;
        if (failureResult.notification_required && failureResult.alert) {
          staffNotificationAlerts.push(failureResult.alert);
        }
        handoffRequired += 1;
        continue;
      }
      answered += replied.sent ? 1 : 0;
      continue;
    }

    if (isAmamiHomeRelatedNormalChat(text)) {
      const replyText = buildNormalChatStaffHandoffReply();
      const replied = await replyAndLogNormalChatBotMessage({
        candidate,
        replyText,
        lineClient: input.lineClient,
        messageRepository: input.messageRepository
      });
      lineReplies.sent += replied.sent ? 1 : 0;
      lineReplies.failed += replied.failed ? 1 : 0;
      lineReplies.skipped += replied.skipped ? 1 : 0;
      messagesLogged += replied.message_logged ? 1 : 0;

      if (replied.failed) {
        const failureResult = await recordNormalChatReplyFailure({
          candidate,
          messageRepository: input.messageRepository,
          alertRepository: input.alertRepository,
          ...(replied.failure_message ? { message: replied.failure_message } : {})
        });
        messagesLogged += failureResult.message_logged ? 1 : 0;
        alertsCreated += failureResult.created ? 1 : 0;
        alertsNotificationRequired += failureResult.notification_required ? 1 : 0;
        if (failureResult.notification_required && failureResult.alert) {
          staffNotificationAlerts.push(failureResult.alert);
        }
        handoffRequired += 1;
        continue;
      }

      const alertResult = await createNormalChatHandoffAlert({
        candidate,
        alertRepository: input.alertRepository,
        message: text
      });
      alertsCreated += alertResult.created ? 1 : 0;
      alertsNotificationRequired += alertResult.notification_required ? 1 : 0;
      if (alertResult.notification_required && alertResult.alert) {
        staffNotificationAlerts.push(alertResult.alert);
      }
      handoffRequired += 1;
      continue;
    }

    const replyText = buildNormalChatOutOfScopeReply();
    const replied = await replyAndLogNormalChatBotMessage({
      candidate,
      replyText,
      lineClient: input.lineClient,
      messageRepository: input.messageRepository
    });
    lineReplies.sent += replied.sent ? 1 : 0;
    lineReplies.failed += replied.failed ? 1 : 0;
    lineReplies.skipped += replied.skipped ? 1 : 0;
    messagesLogged += replied.message_logged ? 1 : 0;
    outOfScope += 1;
    if (replied.failed) {
      const failureResult = await recordNormalChatReplyFailure({
        candidate,
        messageRepository: input.messageRepository,
        alertRepository: input.alertRepository,
        ...(replied.failure_message ? { message: replied.failure_message } : {})
      });
      messagesLogged += failureResult.message_logged ? 1 : 0;
      alertsCreated += failureResult.created ? 1 : 0;
      alertsNotificationRequired += failureResult.notification_required ? 1 : 0;
      if (failureResult.notification_required && failureResult.alert) {
        staffNotificationAlerts.push(failureResult.alert);
      }
      handoffRequired += 1;
    }
  }

  return {
    attempted,
    answered,
    handoff_required: handoffRequired,
    out_of_scope: outOfScope,
    messages_logged: messagesLogged,
    alerts_created: alertsCreated,
    alerts_notification_required: alertsNotificationRequired,
    staff_notification_alerts: staffNotificationAlerts,
    line_replies: lineReplies
  };
}

async function searchTenantKnowledgeWithStaticFallback(input: {
  tenant_id: string;
  query: string;
  limit: number;
  repository: KnowledgePageRepository;
}) {
  const results = await searchTenantKnowledge(input);

  if (isFreshnessSensitiveNormalChat(input.query)) {
    return results.filter(isRecentlyCrawledKnowledgeResult);
  }

  if (results.length > 0 || input.tenant_id !== AMAMI_HOME_TENANT_ID) {
    return results;
  }

  return searchTenantKnowledge({
    ...input,
    repository: staticAmamiHomeKnowledgeFallbackRepository
  });
}

async function replyAndLogNormalChatBotMessage(input: {
  candidate: CustomerNormalChatAiCandidate;
  replyText: string;
  lineClient: LineClient;
  messageRepository: MessageRepository;
}): Promise<{
  sent: boolean;
  failed: boolean;
  skipped: boolean;
  message_logged: boolean;
  failure_message?: string;
}> {
  if (!input.candidate.reply_token) {
    return { sent: false, failed: false, skipped: true, message_logged: false };
  }

  let pendingMessage: Message;

  try {
    pendingMessage = await insertBotTextTimelineMessage(input.messageRepository, {
      tenant_id: input.candidate.tenant_id,
      customer_id: input.candidate.customer_id,
      body: input.replyText,
      created_at: input.candidate.occurred_at
    });
  } catch {
    return {
      sent: false,
      failed: true,
      skipped: false,
      message_logged: false,
      failure_message: "自動応答の送信準備に失敗しました。担当者の確認が必要です。"
    };
  }

  try {
    await input.lineClient.replyMessage(input.candidate.reply_token, [
      {
        type: "text",
        text: input.replyText
      }
    ]);
  } catch {
    try {
      await input.messageRepository.deleteByIdForTenant(
        input.candidate.tenant_id,
        pendingMessage.id
      );
    } catch {
      // Failure escalation must continue even when pending-message cleanup is unavailable.
    }

    return {
      sent: false,
      failed: true,
      skipped: false,
      message_logged: false,
      failure_message: "自動応答のLINE送信に失敗しました。担当者の確認が必要です。"
    };
  }

  try {
    const sentMessage = await input.messageRepository.updateSentToLineAt({
      tenant_id: input.candidate.tenant_id,
      message_id: pendingMessage.id,
      sent_to_line_at: new Date().toISOString()
    });

    if (!sentMessage) {
      throw new Error("line_reply_delivery_confirmation_missing");
    }
  } catch {
    return {
      sent: false,
      failed: true,
      skipped: false,
      message_logged: false,
      failure_message:
        "自動応答はLINEへ送信されましたが、送信記録の更新に失敗しました。再送せず担当者が確認してください。"
    };
  }

  return { sent: true, failed: false, skipped: false, message_logged: true };
}

async function createNormalChatHandoffAlert(input: {
  candidate: CustomerNormalChatAiCandidate;
  alertRepository: AlertRepository;
  message: string;
  severity?: AlertSeverity;
}): Promise<{ alert: Alert | null; created: boolean; notification_required: boolean }> {
  const customer: Customer = {
    id: input.candidate.customer_id,
    tenant_id: input.candidate.tenant_id,
    line_user_id: "",
    display_name: input.candidate.customer_display_name,
    picture_url: null,
    phone: input.candidate.customer_phone,
    email: input.candidate.customer_email,
    postal_code: null,
    address: input.candidate.customer_address,
    interest_tags: [],
    response_mode: input.candidate.customer_response_mode,
    status: "new",
    last_message_at: input.candidate.occurred_at,
    last_customer_message_at: input.candidate.occurred_at,
    last_staff_reply_at: null,
    created_at: input.candidate.occurred_at,
    updated_at: input.candidate.occurred_at
  };
  const alertResult = await ensureOpenUnrepliedCustomerMessageAlert({
    tenant_id: input.candidate.tenant_id,
    customer,
    alertRepository: input.alertRepository,
    message: input.message,
    ...(input.severity ? { severity: input.severity } : {}),
    now: () => input.candidate.occurred_at
  });

  return {
    alert: alertResult.alert,
    created: alertResult.created,
    notification_required: alertResult.notification_required
  };
}

async function recordNormalChatReplyFailure(input: {
  candidate: CustomerNormalChatAiCandidate;
  messageRepository: MessageRepository;
  alertRepository: AlertRepository;
  message?: string;
}): Promise<{
  alert: Alert | null;
  created: boolean;
  notification_required: boolean;
  message_logged: boolean;
}> {
  const message =
    input.message ?? "自動応答のLINE送信に失敗しました。担当者の確認が必要です。";
  const alertResult = await createNormalChatHandoffAlert({
    candidate: input.candidate,
    alertRepository: input.alertRepository,
    message,
    severity: "high"
  });

  let messageLogged = false;

  try {
    await insertSystemAlertTimelineMessage(input.messageRepository, {
      tenant_id: input.candidate.tenant_id,
      customer_id: input.candidate.customer_id,
      body: message,
      created_at: input.candidate.occurred_at
    });
    messageLogged = true;
  } catch {
    // The alert is created first so staff escalation survives timeline failures.
  }

  return { ...alertResult, message_logged: messageLogged };
}

async function buildNormalChatKnowledgeReply(input: {
  tenant_id: string;
  text: string;
  sources: AiRagAnswerSource[];
  aiProvider: AiProvider;
}): Promise<string> {
  try {
    const draft = await input.aiProvider.draftRagAnswer({
      tenant_id: input.tenant_id,
      query: input.text,
      sources: input.sources
    });

    if (
      draft.can_answer &&
      !draft.handoff_required &&
      draft.recommended_response_mode === "bot_auto" &&
      draft.answer_body.trim().length > 0
    ) {
      return draft.answer_body.trim();
    }
  } catch {
    // Fall back to a deterministic official-site answer when the AI provider is unavailable.
  }

  const primarySource = input.sources[0];

  if (!primarySource) {
    return buildNormalChatStaffHandoffReply();
  }

  return `${primarySource.title}については、公式ページで確認できます。\n${primarySource.url}\n\n個別の確認が必要な内容は、担当者が確認します。`;
}

function buildNormalChatStaffHandoffReply(): string {
  return "詳しい確認が必要な内容のため、担当者へおつなぎします。\n相談内容を保存しました。担当者よりご連絡いたします。";
}

function buildNormalChatOutOfScopeReply(): string {
  return "アマミホームの家づくり、モデルハウス、施工事例、資料請求などについてお答えできます。\n関係のない内容にはお答えできません。";
}

function requiresStaffForNormalChat(text: string): boolean {
  return normalChatStaffRequiredKeywords.some((keyword) => text.includes(keyword));
}

function shouldDeferNormalChatBeforeKnowledgeSearch(
  responseMode: CustomerNormalChatAiCandidate["customer_response_mode"]
): boolean {
  return responseMode !== "bot_auto";
}

function isAmamiHomeRelatedNormalChat(text: string): boolean {
  return normalChatRelatedKeywords.some((keyword) => text.includes(keyword));
}

function isFreshnessSensitiveNormalChat(text: string): boolean {
  return normalChatFreshnessSensitiveKeywords.some((keyword) => text.includes(keyword));
}

function isRecentlyCrawledKnowledgeResult(result: {
  last_crawled_at: string | null;
}): boolean {
  if (!result.last_crawled_at) {
    return false;
  }

  const crawledAt = Date.parse(result.last_crawled_at);
  const age = Date.now() - crawledAt;
  return Number.isFinite(crawledAt) && age >= 0 && age <= 7 * 24 * 60 * 60 * 1000;
}

const normalChatFreshnessSensitiveKeywords = [
  "営業時間",
  "営業日",
  "定休日",
  "休業",
  "住所",
  "所在地",
  "電話",
  "連絡先",
  "イベント",
  "空き状況"
];

const normalChatStaffRequiredKeywords = [
  "見積",
  "金額",
  "価格",
  "費用",
  "予算",
  "ローン",
  "補助金",
  "契約",
  "土地",
  "保証",
  "メンテナンス",
  "修理",
  "点検",
  "不具合",
  "クレーム",
  "急ぎ",
  "緊急",
  "担当者",
  "相談したい",
  "相談できますか",
  "個別相談",
  "予約変更",
  "予約を変更",
  "日時変更",
  "打合せ",
  "打ち合わせ",
  "変更",
  "キャンセル",
  "個別",
  "住所",
  "電話番号",
  "連絡先"
] as const;

const normalChatRelatedKeywords = [
  "アマミホーム",
  "家づくり",
  "家作り",
  "住宅",
  "新築",
  "モデルハウス",
  "見学",
  "施工事例",
  "資料",
  "カタログ",
  "営業時間",
  "会社",
  "所在地",
  "アクセス",
  "来場",
  "イベント",
  "ホームページ",
  "ページ",
  "URL"
] as const;

function summarizeStaffLineWebhookEvents(events: NormalizedLineWebhookEvent[]): {
  message_events: number;
  text_message_events: number;
  follow_events: number;
  unfollow_events: number;
  source_user_events: number;
  source_group_events: number;
  source_room_events: number;
  unsupported_events: number;
  staff_linking_code_processing_executed: false;
  raw_event_content_recorded: false;
} {
  let messageEvents = 0;
  let textMessageEvents = 0;
  let followEvents = 0;
  let unfollowEvents = 0;
  let sourceUserEvents = 0;
  let sourceGroupEvents = 0;
  let sourceRoomEvents = 0;
  let unsupportedEvents = 0;

  for (const event of events) {
    if (event.type === "message") {
      messageEvents += 1;

      if (event.message_type === "text") {
        textMessageEvents += 1;
      }
    } else if (event.type === "follow") {
      followEvents += 1;
    } else if (event.type === "unfollow") {
      unfollowEvents += 1;
    } else {
      unsupportedEvents += 1;
    }

    if (event.source_type === "user") {
      sourceUserEvents += 1;
    } else if (event.source_type === "group") {
      sourceGroupEvents += 1;
    } else if (event.source_type === "room") {
      sourceRoomEvents += 1;
    }
  }

  return {
    message_events: messageEvents,
    text_message_events: textMessageEvents,
    follow_events: followEvents,
    unfollow_events: unfollowEvents,
    source_user_events: sourceUserEvents,
    source_group_events: sourceGroupEvents,
    source_room_events: sourceRoomEvents,
    unsupported_events: unsupportedEvents,
    staff_linking_code_processing_executed: false,
    raw_event_content_recorded: false
  };
}

type StaffLineNotificationTargetSourceType = "user" | "group" | "room";

const DEFAULT_STAFF_LINE_TARGET_RUNTIME_FILE = "/etc/amami-line-crm/staff-line-target.env";

type StaffLineTargetRuntimeFileWriteResult = {
  attempted: boolean;
  written: boolean;
  skipped_reason: string | null;
  error_category: string | null;
  target_id_value_output: false;
  target_file_path_output: false;
  raw_event_content_recorded: false;
};

type StaffLineNotificationTargetCaptureResult = {
  attempted: boolean;
  captured: boolean;
  skipped_reason: string | null;
  source_type: StaffLineNotificationTargetSourceType | null;
  runtime_target_present_before: boolean;
  runtime_target_present_after: boolean;
  runtime_file_persistence: StaffLineTargetRuntimeFileWriteResult;
  target_id_value_output: false;
  target_id_committed: false;
  raw_event_content_recorded: false;
};

async function setupStaffLineNotificationTargetFromCustomerLine(input: {
  events: NormalizedLineWebhookEvent[];
  env: NodeJS.ProcessEnv;
  lineClient: LineClient;
}): Promise<{
  enabled: boolean;
  attempted: boolean;
  setup_trigger_events: number;
  notification_target_capture: StaffLineNotificationTargetCaptureResult | null;
  setup_reply: Awaited<ReturnType<typeof replyToStaffLineTargetSetupEvents>> | null;
  customer_event_logging_skipped: boolean;
  target_id_value_output: false;
  raw_event_content_recorded: false;
}> {
  const enabled = isStaffLineCustomerChannelNotificationFallbackEnabled(input.env);
  const setupTriggerEvents = input.events.filter(isStaffLineSetupTriggerEvent);

  if (!enabled || setupTriggerEvents.length === 0) {
    return {
      enabled,
      attempted: false,
      setup_trigger_events: setupTriggerEvents.length,
      notification_target_capture: null,
      setup_reply: null,
      customer_event_logging_skipped: false,
      target_id_value_output: false,
      raw_event_content_recorded: false
    };
  }

  const notificationTargetCapture = captureStaffLineNotificationTarget(
    setupTriggerEvents,
    input.env
  );
  const setupReply = await replyToStaffLineTargetSetupEvents({
    events: setupTriggerEvents,
    env: input.env,
    lineClient: input.lineClient,
    notificationTargetCapture
  });

  return {
    enabled,
    attempted: true,
    setup_trigger_events: setupTriggerEvents.length,
    notification_target_capture: notificationTargetCapture,
    setup_reply: setupReply,
    customer_event_logging_skipped: true,
    target_id_value_output: false,
    raw_event_content_recorded: false
  };
}

function captureStaffLineNotificationTarget(
  events: NormalizedLineWebhookEvent[],
  env: NodeJS.ProcessEnv
): StaffLineNotificationTargetCaptureResult {
  const targetPresentBefore = Boolean(readNonEmptyEnvValue(env.STAFF_LINE_GROUP_ID));
  const shouldRefreshTarget = events.some(isStaffLineSetupTriggerEvent);

  if (!isStaffLineRuntimeConfigured(env)) {
    return {
      attempted: false,
      captured: false,
      skipped_reason: "staff_line_runtime_not_configured",
      source_type: null,
      runtime_target_present_before: targetPresentBefore,
      runtime_target_present_after: targetPresentBefore,
      runtime_file_persistence: skippedStaffLineTargetRuntimeFileWrite(
        "staff_line_runtime_not_configured"
      ),
      target_id_value_output: false,
      target_id_committed: false,
      raw_event_content_recorded: false
    };
  }

  if (targetPresentBefore && !shouldRefreshTarget) {
    return {
      attempted: false,
      captured: false,
      skipped_reason: "runtime_target_already_present",
      source_type: null,
      runtime_target_present_before: true,
      runtime_target_present_after: true,
      runtime_file_persistence: skippedStaffLineTargetRuntimeFileWrite(
        "runtime_target_already_present"
      ),
      target_id_value_output: false,
      target_id_committed: false,
      raw_event_content_recorded: false
    };
  }

  const target = findStaffLineNotificationTarget(events);

  if (!target) {
    return {
      attempted: true,
      captured: false,
      skipped_reason: "source_target_not_found",
      source_type: null,
      runtime_target_present_before: false,
      runtime_target_present_after: false,
      runtime_file_persistence: skippedStaffLineTargetRuntimeFileWrite("source_target_not_found"),
      target_id_value_output: false,
      target_id_committed: false,
      raw_event_content_recorded: false
    };
  }

  env.STAFF_LINE_GROUP_ID = target.id;
  const runtimeFilePersistence = writeStaffLineTargetRuntimeFile(target.id, env);

  return {
    attempted: true,
    captured: true,
    skipped_reason: null,
    source_type: target.type,
    runtime_target_present_before: targetPresentBefore,
    runtime_target_present_after: true,
    runtime_file_persistence: runtimeFilePersistence,
    target_id_value_output: false,
    target_id_committed: false,
    raw_event_content_recorded: false
  };
}

function skippedStaffLineNotificationTargetCapture(
  env: NodeJS.ProcessEnv,
  skippedReason: string
): StaffLineNotificationTargetCaptureResult {
  const runtimeTargetPresent = Boolean(resolveStaffLineNotificationTargetId(env));

  return {
    attempted: false,
    captured: false,
    skipped_reason: skippedReason,
    source_type: null,
    runtime_target_present_before: runtimeTargetPresent,
    runtime_target_present_after: runtimeTargetPresent,
    runtime_file_persistence: skippedStaffLineTargetRuntimeFileWrite(skippedReason),
    target_id_value_output: false,
    target_id_committed: false,
    raw_event_content_recorded: false
  };
}

function skippedStaffLineTargetRuntimeFileWrite(
  skippedReason: string
): StaffLineTargetRuntimeFileWriteResult {
  return {
    attempted: false,
    written: false,
    skipped_reason: skippedReason,
    error_category: null,
    target_id_value_output: false,
    target_file_path_output: false,
    raw_event_content_recorded: false
  };
}

function writeStaffLineTargetRuntimeFile(
  targetId: string,
  env: NodeJS.ProcessEnv
): StaffLineTargetRuntimeFileWriteResult {
  const runtimeFilePath = resolveStaffLineTargetRuntimeFile(env);

  if (!runtimeFilePath) {
    return skippedStaffLineTargetRuntimeFileWrite("runtime_file_not_configured");
  }

  try {
    mkdirSync(dirname(runtimeFilePath), { recursive: true, mode: 0o700 });
    writeFileSync(runtimeFilePath, `STAFF_LINE_GROUP_ID=${quoteEnvValue(targetId)}\n`, {
      mode: 0o600
    });
    chmodSync(runtimeFilePath, 0o600);

    return {
      attempted: true,
      written: true,
      skipped_reason: null,
      error_category: null,
      target_id_value_output: false,
      target_file_path_output: false,
      raw_event_content_recorded: false
    };
  } catch {
    return {
      attempted: true,
      written: false,
      skipped_reason: null,
      error_category: "runtime_file_write_failed",
      target_id_value_output: false,
      target_file_path_output: false,
      raw_event_content_recorded: false
    };
  }
}

function resolveStaffLineTargetRuntimeFile(env: NodeJS.ProcessEnv): string | null {
  const configuredPath = readNonEmptyEnvValue(env.STAFF_LINE_TARGET_RUNTIME_FILE);

  if (configuredPath) {
    return configuredPath;
  }

  if (env.NODE_ENV === "test" || process.env.NODE_ENV === "test") {
    return null;
  }

  return DEFAULT_STAFF_LINE_TARGET_RUNTIME_FILE;
}

function quoteEnvValue(value: string): string {
  return `'${value.replace(/'/gu, "'\"'\"'")}'`;
}

function findStaffLineNotificationTarget(
  events: NormalizedLineWebhookEvent[]
): { id: string; type: StaffLineNotificationTargetSourceType } | null {
  for (const event of [...events].reverse()) {
    if (event.source_type === "group" && event.source_group_id) {
      return { id: event.source_group_id, type: "group" };
    }

    if (event.source_type === "room" && event.source_room_id) {
      return { id: event.source_room_id, type: "room" };
    }

    if (event.source_type === "user" && event.source_user_id) {
      return { id: event.source_user_id, type: "user" };
    }
  }

  return null;
}

async function replyToStaffLineTargetSetupEvents(input: {
  events: NormalizedLineWebhookEvent[];
  env: NodeJS.ProcessEnv;
  lineClient: LineClient | null;
  notificationTargetCapture: StaffLineNotificationTargetCaptureResult;
}): Promise<{
  attempted: boolean;
  sent: number;
  failed: number;
  skipped: number;
  fallback_push_attempted: boolean;
  fallback_push_sent: number;
  fallback_push_failed: number;
  failure_category: string | null;
  failed_status_code: number | null;
  line_api_response_body_recorded: false;
  trigger_text_recorded: false;
  target_id_value_output: false;
}> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let fallbackPushSent = 0;
  let fallbackPushFailed = 0;
  let failureCategory: string | null = null;
  let failedStatusCode: number | null = null;

  for (const event of input.events) {
    if (!isStaffLineSetupTriggerEvent(event)) {
      skipped += 1;
      continue;
    }

    if (!input.lineClient || !event.reply_token) {
      failed += 1;
      failureCategory = !input.lineClient ? "line_client_not_configured" : "reply_token_missing";
      continue;
    }

    const confirmationMessage = buildStaffLineSetupConfirmationMessage(
      input.notificationTargetCapture.runtime_target_present_after
    );

    try {
      await input.lineClient.replyMessage(event.reply_token, [
        {
          type: "text",
          text: confirmationMessage
        }
      ]);
      sent += 1;
    } catch (error) {
      const fallbackResult = await pushStaffLineSetupConfirmationFallback({
        env: input.env,
        lineClient: input.lineClient,
        message: confirmationMessage
      });

      if (fallbackResult.sent) {
        sent += 1;
        fallbackPushSent += 1;
      } else {
        failed += 1;
        fallbackPushFailed += 1;
        failureCategory =
          fallbackResult.failure_category ?? classifyLineMessagingFailure(error);
        failedStatusCode =
          fallbackResult.failed_status_code ?? readLineMessagingStatusCode(error);
      }
    }
  }

  return {
    attempted: sent + failed > 0,
    sent,
    failed,
    skipped,
    fallback_push_attempted: fallbackPushSent + fallbackPushFailed > 0,
    fallback_push_sent: fallbackPushSent,
    fallback_push_failed: fallbackPushFailed,
    failure_category: failureCategory,
    failed_status_code: failedStatusCode,
    line_api_response_body_recorded: false,
    trigger_text_recorded: false,
    target_id_value_output: false
  };
}

function skippedStaffLineSetupReply(
  skippedReason: string
): Awaited<ReturnType<typeof replyToStaffLineTargetSetupEvents>> {
  return {
    attempted: false,
    sent: 0,
    failed: 0,
    skipped: 0,
    fallback_push_attempted: false,
    fallback_push_sent: 0,
    fallback_push_failed: 0,
    failure_category: skippedReason,
    failed_status_code: null,
    line_api_response_body_recorded: false,
    trigger_text_recorded: false,
    target_id_value_output: false
  };
}

function isStaffLineSetupTriggerEvent(event: NormalizedLineWebhookEvent): boolean {
  return (
    event.type === "message" &&
    event.message_type === "text" &&
    event.text?.trim() === "通知テスト"
  );
}

function buildStaffLineSetupConfirmationMessage(runtimeTargetPresent: boolean): string {
  return runtimeTargetPresent
    ? "通知テストを受け付けました。CRMからの相談通知をこのトークへ送れる状態です。"
    : "通知テストを受け付けました。CRM通知先の確認はまだ完了していません。";
}

async function pushStaffLineSetupConfirmationFallback(input: {
  env: NodeJS.ProcessEnv;
  lineClient: LineClient;
  message: string;
}): Promise<{
  sent: boolean;
  failure_category: string | null;
  failed_status_code: number | null;
}> {
  const targetId = resolveStaffLineNotificationTargetId(input.env);

  if (!targetId) {
    return {
      sent: false,
      failure_category: "notification_target_not_configured",
      failed_status_code: null
    };
  }

  try {
    await input.lineClient.pushMessage(targetId, [
      {
        type: "text",
        text: input.message
      }
    ]);

    return {
      sent: true,
      failure_category: null,
      failed_status_code: null
    };
  } catch (error) {
    return {
      sent: false,
      failure_category: classifyLineMessagingFailure(error),
      failed_status_code: readLineMessagingStatusCode(error)
    };
  }
}

function classifyLineMessagingFailure(error: unknown): string {
  if (error instanceof LineMessagingApiError) {
    return "line_messaging_api_error";
  }

  return "line_messaging_unknown_error";
}

function readLineMessagingStatusCode(error: unknown): number | null {
  if (error instanceof LineMessagingApiError) {
    return error.statusCode ?? null;
  }

  return null;
}

function logStaffLineWebhookProcessingResult(input: {
  env: NodeJS.ProcessEnv;
  eventCount: number;
  sanitizedSummary: ReturnType<typeof summarizeStaffLineWebhookEvents>;
  notificationTargetCapture: StaffLineNotificationTargetCaptureResult;
  setupReply: Awaited<ReturnType<typeof replyToStaffLineTargetSetupEvents>>;
}): void {
  if (
    !isStaffLineRuntimeConfigured(input.env) ||
    input.env.NODE_ENV === "test" ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }

  console.info(
    JSON.stringify({
      event: "staff_line_webhook_processed",
      event_count: input.eventCount,
      message_events: input.sanitizedSummary.message_events,
      text_message_events: input.sanitizedSummary.text_message_events,
      source_user_events: input.sanitizedSummary.source_user_events,
      source_group_events: input.sanitizedSummary.source_group_events,
      source_room_events: input.sanitizedSummary.source_room_events,
      notification_target_capture_attempted: input.notificationTargetCapture.attempted,
      notification_target_captured: input.notificationTargetCapture.captured,
      notification_target_source_type: input.notificationTargetCapture.source_type,
      notification_target_runtime_present_after:
        input.notificationTargetCapture.runtime_target_present_after,
      notification_target_persist_attempted:
        input.notificationTargetCapture.runtime_file_persistence.attempted,
      notification_target_persisted: input.notificationTargetCapture.runtime_file_persistence.written,
      notification_target_persist_error_category:
        input.notificationTargetCapture.runtime_file_persistence.error_category,
      setup_reply_attempted: input.setupReply.attempted,
      setup_reply_sent: input.setupReply.sent,
      setup_reply_failed: input.setupReply.failed,
      setup_reply_fallback_push_attempted: input.setupReply.fallback_push_attempted,
      setup_reply_fallback_push_sent: input.setupReply.fallback_push_sent,
      setup_reply_fallback_push_failed: input.setupReply.fallback_push_failed,
      setup_reply_failure_category: input.setupReply.failure_category,
      setup_reply_failed_status_code: input.setupReply.failed_status_code,
      target_id_value_output: false,
      target_file_path_output: false,
      trigger_text_recorded: false,
      raw_event_content_recorded: false,
      line_api_response_body_recorded: false
    })
  );
}

export interface ApiServerListenOptions {
  port: number;
  hostname?: string;
}

export const DEFAULT_API_DEVELOPMENT_PORT = 4000;
export const DEFAULT_API_PRODUCTION_HOST = "127.0.0.1";
export const DEFAULT_API_PRODUCTION_PORT = 8788;

export function resolveApiServerListenOptions(
  env: NodeJS.ProcessEnv = process.env
): ApiServerListenOptions {
  const production = isProductionRuntime(env);
  const hostname =
    readNonEmptyEnvValue(env.API_HOST) ??
    readNonEmptyEnvValue(env.HOST) ??
    (production ? DEFAULT_API_PRODUCTION_HOST : undefined);
  const port =
    parsePort(readNonEmptyEnvValue(env.API_PORT) ?? readNonEmptyEnvValue(env.PORT)) ??
    (production ? DEFAULT_API_PRODUCTION_PORT : DEFAULT_API_DEVELOPMENT_PORT);

  return hostname ? { hostname, port } : { port };
}

class RuntimeStaffLineNotifier implements StaffNotifier {
  constructor(
    private readonly lineClient: LineClient,
    private readonly env: NodeJS.ProcessEnv
  ) {}

  async notify(payload: StaffNotificationPayload): Promise<void> {
    const notificationTargetId = resolveStaffLineNotificationTargetId(this.env);

    if (!notificationTargetId) {
      throw new Error("production_staff_line_notification_target_not_configured");
    }

    await this.lineClient.pushMessage(notificationTargetId, [
      {
        type: "text",
        text: payload.message
      }
    ]);
  }
}

function resolveStaffLineNotificationTargetId(env: NodeJS.ProcessEnv): string | undefined {
  return readNonEmptyEnvValue(env.STAFF_LINE_GROUP_ID) ?? readStaffLineTargetRuntimeFile(env);
}

function readStaffLineTargetRuntimeFile(env: NodeJS.ProcessEnv): string | undefined {
  const runtimeFilePath = resolveStaffLineTargetRuntimeFile(env);

  if (!runtimeFilePath) {
    return undefined;
  }

  try {
    return readStaffLineGroupIdFromRuntimeFile(readFileSync(runtimeFilePath, "utf8"));
  } catch {
    return undefined;
  }
}

function readStaffLineGroupIdFromRuntimeFile(content: string): string | undefined {
  for (const line of content.split(/\r?\n/u)) {
    const match = /^STAFF_LINE_GROUP_ID=(.*)$/u.exec(line.trim());

    if (!match) {
      continue;
    }

    return normalizeRuntimeEnvValue(match[1] ?? "");
  }

  return undefined;
}

function normalizeRuntimeEnvValue(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const unquoted =
    trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2
      ? trimmed.slice(1, -1).replace(/'"'"'/gu, "'")
      : trimmed;

  return readNonEmptyEnvValue(unquoted);
}

function createRuntimeStaffLineClient(env: NodeJS.ProcessEnv): LineClient | null {
  const channelAccessToken = resolveStaffLineNotificationChannelAccessToken(env);

  if (!channelAccessToken) {
    return null;
  }

  return new RealLineClient({
    channelAccessToken,
    transport: new FetchLineMessagingTransport()
  });
}

class UnconfiguredProductionStaffNotifier implements StaffNotifier {
  async notify(): Promise<void> {
    throw new Error("production_staff_line_notifier_not_configured");
  }
}

function createRuntimeStaffNotifier(
  env: NodeJS.ProcessEnv,
  staffLineClient: LineClient | null
): StaffNotifier {
  if (staffLineClient) {
    return new RuntimeStaffLineNotifier(staffLineClient, env);
  }

  if (isProductionRuntime(env)) {
    return new UnconfiguredProductionStaffNotifier();
  }

  return defaultStaffNotifier;
}

async function notifyNewAlertsForProduction(input: {
  env: NodeJS.ProcessEnv;
  tenantId: string;
  alertCount: number;
  alertRepository: AlertRepository;
  customerRepository: CustomerRepository;
  staffNotifier: StaffNotifier;
  adminBaseUrl?: string | undefined;
  now?: (() => string) | undefined;
}): Promise<{
  attempted: boolean;
  notified: number;
  failed: number;
  skipped: number;
}> {
  if (!shouldAttemptStaffLineAlertNotification(input.env) || input.alertCount <= 0) {
    return {
      attempted: false,
      notified: 0,
      failed: 0,
      skipped: 0
    };
  }

  const result = await notifyOpenAlerts({
    tenant_id: input.tenantId,
    alertRepository: input.alertRepository,
    customerRepository: input.customerRepository,
    staffNotifier: input.staffNotifier,
    ...(input.adminBaseUrl ? { adminBaseUrl: input.adminBaseUrl } : {}),
    ...(input.now ? { now: input.now } : {})
  });

  return {
    attempted: true,
    notified: result.notified,
    failed: result.failed,
    skipped: result.skipped
  };
}

async function notifySpecificAlertsForProduction(input: {
  env: NodeJS.ProcessEnv;
  alerts: Alert[];
  staffNotifier: StaffNotifier;
  alertRepository: AlertRepository;
  customerRepository: CustomerRepository;
  adminBaseUrl?: string | undefined;
  now?: (() => string) | undefined;
}): Promise<{
  attempted: boolean;
  notified: number;
  failed: number;
  skipped: number;
}> {
  const alerts = dedupeAlertsById(input.alerts);
  if (!shouldAttemptStaffLineAlertNotification(input.env) || alerts.length <= 0) {
    return {
      attempted: false,
      notified: 0,
      failed: 0,
      skipped: 0
    };
  }

  const now = input.now?.() ?? new Date().toISOString();
  let notified = 0;
  let failed = 0;
  let skipped = 0;

  for (const alert of alerts) {
    const customer = await input.customerRepository.findByIdForTenant(
      alert.tenant_id,
      alert.customer_id
    );
    const payload = buildStaffNotificationPayload(alert, {
      ...(input.adminBaseUrl ? { adminBaseUrl: input.adminBaseUrl } : {}),
      customer
    });

    try {
      await input.staffNotifier.notify(payload);
    } catch {
      failed += 1;
      continue;
    }

    const updated = await input.alertRepository.updateStatus({
      tenant_id: alert.tenant_id,
      alert_id: alert.id,
      status: "notified",
      notified_at: now,
      updated_at: now
    });

    if (updated) {
      notified += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    attempted: true,
    notified,
    failed,
    skipped
  };
}

function dedupeAlertsById(alerts: Alert[]): Alert[] {
  return [...new Map(alerts.map((alert) => [alert.id, alert])).values()];
}

async function notifyCustomerActivitiesForProduction(input: {
  env: NodeJS.ProcessEnv;
  events: CustomerLineStaffNotificationEvent[];
  staffNotifier: StaffNotifier;
  adminBaseUrl?: string | undefined;
}): Promise<{
  attempted: boolean;
  notified: number;
  failed: number;
  skipped: number;
}> {
  if (!shouldAttemptStaffLineAlertNotification(input.env) || input.events.length <= 0) {
    return {
      attempted: false,
      notified: 0,
      failed: 0,
      skipped: 0
    };
  }

  let notified = 0;
  let failed = 0;

  for (const event of input.events) {
    const payload = buildCustomerActivityStaffNotificationPayload(event, {
      ...(input.adminBaseUrl ? { adminBaseUrl: input.adminBaseUrl } : {})
    });

    try {
      await input.staffNotifier.notify(payload);
      notified += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    attempted: true,
    notified,
    failed,
    skipped: 0
  };
}

function shouldAttemptStaffLineAlertNotification(env: NodeJS.ProcessEnv): boolean {
  return isProductionRuntime(env) || isStaffLineRuntimeConfigured(env);
}

function hasAuthorizationHeader(authorizationHeader: string | undefined): authorizationHeader is string {
  return Boolean(authorizationHeader?.trim());
}

function hasTenantIdHeader(tenantIdHeader: string | undefined): tenantIdHeader is string {
  return Boolean(tenantIdHeader?.trim());
}

type TenantScopedAdminRouteTenantResolution =
  | {
      ok: true;
      tenantId: string;
      context: AdminTenantContext;
      selectedTenantId: string | null;
    }
  | {
      ok: false;
      body: AdminAuthErrorHttpResponse["body"];
      status: AdminAuthErrorHttpResponse["status"];
    };

async function resolveTenantScopedAdminRouteTenant(input: {
  authorizationHeader: string | undefined;
  selectedTenantIdHeader: string | undefined;
  tenantIdHeader: string | undefined;
  action: AdminAction;
  adminAuthRuntime: AuthenticatedAdminRuntimeDependencies | undefined;
  authenticatedSelectedTenantId: string | null | undefined;
  env: NodeJS.ProcessEnv;
}): Promise<TenantScopedAdminRouteTenantResolution> {
  if (isProductionRuntime(input.env)) {
    if (hasTenantIdHeader(input.tenantIdHeader)) {
      return adminAuthFailure("dev_tenant_header_not_allowed");
    }

    if (!hasAuthorizationHeader(input.authorizationHeader)) {
      return adminAuthFailure("authenticated_staff_required");
    }
  }

  if (hasAuthorizationHeader(input.authorizationHeader)) {
    if (!input.adminAuthRuntime) {
      return adminAuthFailure("authenticated_staff_required");
    }

    const selectedTenant = resolveSelectedTenantIdTransport({
      selectedTenantIdHeader: input.selectedTenantIdHeader,
      fallbackSelectedTenantId: input.authenticatedSelectedTenantId
    });

    if (!selectedTenant.ok) {
      const response = mapAdminAuthErrorToHttp(selectedTenant.error);
      return {
        ok: false,
        body: response.body,
        status: response.status
      };
    }

    const runtime = await resolveAuthenticatedAdminRuntimeContextSafely(
      createAuthenticatedAdminRuntimeInput({
        authorizationHeader: input.authorizationHeader,
        selectedTenantId: selectedTenant.selectedTenantId,
        action: input.action
      }),
      input.adminAuthRuntime
    );

    if (!runtime.ok) {
      const response = mapAdminAuthErrorToHttp(runtime.error);
      return {
        ok: false,
        body: response.body,
        status: response.status
      };
    }

    return {
      ok: true,
      tenantId: runtime.tenantId,
      context: runtime.context,
      selectedTenantId: selectedTenant.selectedTenantId
    };
  }

  const tenant = resolveAdminTenant(input.tenantIdHeader, input.env);

  if (tenant.status !== "ok") {
    return {
      ok: false,
      body: tenant.httpResponse.body,
      status: tenant.httpResponse.status
    };
  }

  const roleGuard = evaluateAdminRouteRoleGuardCompatibility({
    context: tenant.context,
    action: input.action
  });

  if (!roleGuard.ok) {
    return {
      ok: false,
      body: roleGuard.body,
      status: roleGuard.status
    };
  }

  return {
    ok: true,
    tenantId: tenant.tenantId,
    context: tenant.context,
    selectedTenantId: null
  };
}

async function resolveAuthenticatedAdminRuntimeContextSafely(
  input: AuthenticatedAdminRuntimeInput,
  dependencies: AuthenticatedAdminRuntimeDependencies
): Promise<Awaited<ReturnType<typeof resolveAuthenticatedAdminRuntimeContext>>> {
  try {
    return await resolveAuthenticatedAdminRuntimeContext(input, dependencies);
  } catch {
    return {
      ok: false,
      error: { code: "authenticated_staff_required" }
    };
  }
}

function createAuthenticatedAdminRuntimeInput(input: {
  authorizationHeader: string;
  selectedTenantId: string | null;
  action: AdminAction;
}): AuthenticatedAdminRuntimeInput {
  return {
    authorizationHeader: input.authorizationHeader,
    selectedTenantId: input.selectedTenantId,
    action: input.action
  };
}

function adminAuthFailure(code: AdminAuthErrorCode): TenantScopedAdminRouteTenantResolution {
  const response = mapAdminAuthErrorToHttp({ code });

  return {
    ok: false,
    body: response.body,
    status: response.status
  };
}

interface ResolvedWebhookTenant {
  tenantId: string;
  tenantSlug: string;
  channelSecret: string | undefined;
}

interface DemoSeedResult {
  customers: Customer[];
  messages: Message[];
  knowledge_pages_seeded: number;
}

interface SeedableKnowledgePageRepository extends KnowledgePageRepository {
  upsertMany(pages: KnowledgePage[]): Promise<void> | void;
}

async function seedDemoData(input: {
  tenant_id: string;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  knowledgePageRepository: KnowledgePageRepository;
}): Promise<DemoSeedResult> {
  const customers = createDemoCustomers(input.tenant_id);
  const messages = createDemoMessages(input.tenant_id);
  let knowledgePages: KnowledgePage[] = [];

  for (const customer of customers) {
    await input.customerRepository.save(customer);
  }

  for (const message of messages) {
    await input.messageRepository.insert(message);
  }

  if (
    input.tenant_id === AMAMI_HOME_TENANT_ID &&
    isSeedableKnowledgePageRepository(input.knowledgePageRepository)
  ) {
    knowledgePages = createAmamiHomeKnowledgePages();
    await input.knowledgePageRepository.upsertMany(knowledgePages);
  }

  return {
    customers,
    messages,
    knowledge_pages_seeded: knowledgePages.length
  };
}

function isSeedableKnowledgePageRepository(
  repository: KnowledgePageRepository
): repository is SeedableKnowledgePageRepository {
  const maybeSeedable = repository as { upsertMany?: unknown };

  return typeof maybeSeedable.upsertMany === "function";
}

function createDemoCustomers(tenantId: string): Customer[] {
  return [
    {
      id: "customer_demo_yamada_taro",
      tenant_id: tenantId,
      line_user_id: "U_DEMO_YAMADA_TARO",
      display_name: "山田 太郎",
      picture_url: null,
      phone: null,
      email: null,
      postal_code: null,
      address: null,
      interest_tags: ["平屋", "SoToNo MA", "モデルホーム見学"],
      response_mode: "human_required",
      status: "active",
      last_message_at: "2026-06-13T10:18:00.000Z",
      last_customer_message_at: "2026-06-13T10:18:00.000Z",
      last_staff_reply_at: null,
      created_at: "2026-06-13T10:00:00.000Z",
      updated_at: "2026-06-13T10:18:00.000Z"
    },
    {
      id: "customer_demo_sato_hanako",
      tenant_id: tenantId,
      line_user_id: "U_DEMO_SATO_HANAKO",
      display_name: "佐藤 花子",
      picture_url: null,
      phone: null,
      email: null,
      postal_code: null,
      address: null,
      interest_tags: ["オンライン相談", "資料請求"],
      response_mode: "human_active",
      status: "active",
      last_message_at: "2026-06-13T10:35:00.000Z",
      last_customer_message_at: "2026-06-13T10:14:00.000Z",
      last_staff_reply_at: "2026-06-13T10:35:00.000Z",
      created_at: "2026-06-13T10:05:00.000Z",
      updated_at: "2026-06-13T10:35:00.000Z"
    }
  ];
}

function createDemoMessages(tenantId: string): Message[] {
  return [
    {
      id: "message_demo_yamada_1",
      tenant_id: tenantId,
      customer_id: "customer_demo_yamada_taro",
      consultation_id: null,
      line_message_id: "demo-line-message-yamada-1",
      role: "customer",
      message_type: "text",
      body: "平屋の施工事例とSoToNo MAについて相談したいです。",
      media_storage_path: null,
      staff_user_id: null,
      ai_generated: false,
      sent_to_line_at: null,
      created_at: "2026-06-13T10:08:00.000Z"
    },
    {
      id: "message_demo_yamada_2",
      tenant_id: tenantId,
      customer_id: "customer_demo_yamada_taro",
      consultation_id: null,
      line_message_id: "demo-line-message-yamada-2",
      role: "customer",
      message_type: "text",
      body: "モデルホーム見学の日程も知りたいです。",
      media_storage_path: null,
      staff_user_id: null,
      ai_generated: false,
      sent_to_line_at: null,
      created_at: "2026-06-13T10:18:00.000Z"
    },
    {
      id: "message_demo_sato_1",
      tenant_id: tenantId,
      customer_id: "customer_demo_sato_hanako",
      consultation_id: null,
      line_message_id: "demo-line-message-sato-1",
      role: "customer",
      message_type: "text",
      body: "オンライン相談と資料請求をお願いしたいです。",
      media_storage_path: null,
      staff_user_id: null,
      ai_generated: false,
      sent_to_line_at: null,
      created_at: "2026-06-13T10:14:00.000Z"
    },
    {
      id: "message_demo_sato_2",
      tenant_id: tenantId,
      customer_id: "customer_demo_sato_hanako",
      consultation_id: null,
      line_message_id: null,
      role: "staff",
      message_type: "text",
      body: "オンライン相談の日程候補と資料請求の送付先を確認します。",
      media_storage_path: null,
      staff_user_id: "staff_demo_admin",
      ai_generated: false,
      sent_to_line_at: "2026-06-13T10:35:00.000Z",
      created_at: "2026-06-13T10:35:00.000Z"
    }
  ];
}

function isProductionRuntime(env: NodeJS.ProcessEnv): boolean {
  return env.APP_ENV === "production" || env.NODE_ENV === "production";
}

function resolveStaffNotificationAdminBaseUrl(
  env: NodeJS.ProcessEnv,
  configuredBaseUrl: string
): string {
  const explicitBaseUrl = readNonEmptyEnvValue(env.STAFF_NOTIFICATION_ADMIN_BASE_URL);

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/u, "");
  }

  const normalizedConfiguredBaseUrl = configuredBaseUrl.trim().replace(/\/+$/u, "");

  if (
    (isProductionRuntime(env) || isStaffLineRuntimeConfigured(env)) &&
    isLocalAdminBaseUrl(normalizedConfiguredBaseUrl)
  ) {
    return PRODUCTION_STAFF_NOTIFICATION_ADMIN_BASE_URL;
  }

  return normalizedConfiguredBaseUrl || PRODUCTION_STAFF_NOTIFICATION_ADMIN_BASE_URL;
}

function isLocalAdminBaseUrl(value: string): boolean {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/u.test(value);
}

function isStaffLineRuntimeConfigured(env: NodeJS.ProcessEnv): boolean {
  return Boolean(resolveStaffLineNotificationChannelAccessToken(env));
}

function resolveStaffLineNotificationChannelAccessToken(
  env: NodeJS.ProcessEnv
): string | undefined {
  if (isStaffLineCustomerChannelNotificationFallbackEnabled(env)) {
    return readNonEmptyEnvValue(env.LINE_CHANNEL_ACCESS_TOKEN);
  }

  return readNonEmptyEnvValue(env.STAFF_LINE_CHANNEL_ACCESS_TOKEN);
}

function isStaffLineCustomerChannelNotificationFallbackEnabled(env: NodeJS.ProcessEnv): boolean {
  return isEnabledRuntimeFlag(env.STAFF_LINE_USE_CUSTOMER_CHANNEL_FOR_NOTIFICATIONS);
}

export function readStaffReplyStaffUserId(input: {
  env: NodeJS.ProcessEnv;
  staffUserIdHeader: string | undefined;
}): string | null {
  const staffUserId = readOptionalHeader(input.staffUserIdHeader);

  if (isProductionRuntime(input.env) && staffUserId === "dev_staff") {
    return null;
  }

  return staffUserId;
}

async function getLineDisplayNameFromLineProfile(
  lineClient: LineClient,
  lineUserId: string
): Promise<string | null> {
  if (!lineClient.getProfile) {
    return null;
  }

  try {
    const profile = await lineClient.getProfile(lineUserId);
    return profile?.displayName.trim() ? profile.displayName.trim() : null;
  } catch {
    return null;
  }
}

interface LiffCustomerProfileRequest {
  idToken: string;
  mode: "customer_registration" | "contact_change";
  displayName: string | null;
  phone: string | null;
  email: string | null;
  postalCode: string | null;
  address: string | null;
  consultationType: string | null;
  consultationBody: string | null;
  preferredContactMethod: string | null;
  preferredContactTime: string | null;
  notes: string | null;
  interestTags: string[];
}

async function readLiffCustomerProfileBody(
  request: Request
): Promise<LiffCustomerProfileRequest | null> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const idToken = readJsonString(parsed.id_token) ?? readJsonString(parsed.idToken);

  if (!idToken) {
    return null;
  }

  const email = normalizeOptionalText(parsed.email);

  if (email && !isValidEmail(email)) {
    return null;
  }

  const mode =
    readJsonString(parsed.mode) === "contact_change" ? "contact_change" : "customer_registration";
  const displayName = normalizeOptionalText(parsed.display_name ?? parsed.displayName);
  const phone = normalizeOptionalText(parsed.phone);
  const address = normalizeOptionalText(parsed.address);
  const consultationType = normalizeOptionalText(
    parsed.consultation_type ?? parsed.consultationType
  );
  const consultationBody = normalizeOptionalText(
    parsed.consultation_body ?? parsed.consultationBody
  );
  const preferredContactMethod = normalizeOptionalText(
    parsed.preferred_contact_method ?? parsed.preferredContactMethod
  );
  const preferredContactTime = normalizeOptionalText(
    parsed.preferred_contact_time ?? parsed.preferredContactTime
  );
  const notes = normalizeOptionalText(parsed.notes);

  if (!displayName || !phone || !address) {
    return null;
  }

  if (
    mode === "customer_registration" &&
    (!consultationType || !consultationBody || !preferredContactMethod)
  ) {
    return null;
  }

  return {
    idToken,
    mode,
    displayName,
    phone,
    email,
    postalCode: normalizeOptionalText(parsed.postal_code ?? parsed.postalCode),
    address,
    consultationType,
    consultationBody,
    preferredContactMethod,
    preferredContactTime,
    notes,
    interestTags: normalizeInterestTags(parsed.interest_tags ?? parsed.interestTags)
  };
}

function buildLiffCustomerProfileUpsert(input: {
  existing: Customer | null;
  identity: LineIdTokenIdentity;
  input: LiffCustomerProfileRequest;
  tenantId: string;
  now: string;
}): Customer {
  const existing = input.existing;
  const displayName =
    input.input.displayName ?? input.identity.displayName ?? existing?.display_name ?? null;
  const email = input.input.email ?? input.identity.email ?? existing?.email ?? null;
  const interestTags = mergeCustomerInterestTags(existing?.interest_tags ?? [], input.input);

  return {
    id: existing?.id ?? globalThis.crypto.randomUUID(),
    tenant_id: input.tenantId,
    line_user_id: input.identity.userId,
    display_name: displayName,
    picture_url: input.identity.pictureUrl ?? existing?.picture_url ?? null,
    phone: input.input.phone ?? existing?.phone ?? null,
    email,
    postal_code: input.input.postalCode ?? existing?.postal_code ?? null,
    address: input.input.address ?? existing?.address ?? null,
    interest_tags: interestTags,
    response_mode:
      existing?.response_mode === "human_active" || existing?.response_mode === "emergency"
        ? existing.response_mode
        : "human_required",
    status:
      existing?.status === "archived" || existing?.status === "new"
        ? "active"
        : (existing?.status ?? "active"),
    last_message_at: input.now,
    last_customer_message_at: input.now,
    last_staff_reply_at: existing?.last_staff_reply_at ?? null,
    created_at: existing?.created_at ?? input.now,
    updated_at: input.now
  };
}

function buildLiffCustomerProfileTimelineMessage(input: {
  customer: Customer;
  input: LiffCustomerProfileRequest;
  now: string;
}): Message {
  return {
    id: globalThis.crypto.randomUUID(),
    tenant_id: input.customer.tenant_id,
    customer_id: input.customer.id,
    consultation_id: null,
    line_message_id: null,
    role: "customer",
    message_type: "form",
    body: formatLiffCustomerProfileTimelineBody(input.input),
    media_storage_path: null,
    staff_user_id: null,
    ai_generated: false,
    sent_to_line_at: null,
    created_at: input.now
  };
}

function formatLiffCustomerProfileTimelineBody(input: LiffCustomerProfileRequest): string {
  const lines =
    input.mode === "contact_change"
      ? [
          "連絡先変更",
          `お名前: ${input.displayName}`,
          `電話番号: ${input.phone}`,
          `住所/エリア: ${input.address}`,
          `メール: ${input.email ?? "-"}`,
          `希望連絡方法: ${input.preferredContactMethod ?? "-"}`,
          `連絡希望時間: ${input.preferredContactTime ?? "-"}`,
          `備考: ${input.notes ?? "-"}`
        ]
      : [
          "お客様情報登録",
          `お名前: ${input.displayName}`,
          `電話番号: ${input.phone}`,
          `住所/エリア: ${input.address}`,
          `相談種別: ${input.consultationType}`,
          `相談内容: ${input.consultationBody}`,
          `希望連絡方法: ${input.preferredContactMethod}`,
          `連絡希望時間: ${input.preferredContactTime ?? "-"}`
        ];

  return lines.join("\n");
}

function mergeCustomerInterestTags(
  existingTags: string[],
  input: LiffCustomerProfileRequest
): string[] {
  const nextTags = [
    ...existingTags,
    "情報登録済み",
    ...(input.mode === "contact_change" ? ["連絡先変更済み"] : []),
    ...(input.consultationType ? [`相談種別:${input.consultationType}`] : []),
    ...(input.preferredContactMethod ? [`希望連絡:${input.preferredContactMethod}`] : []),
    ...input.interestTags
  ];

  return Array.from(new Set(nextTags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 20);
}

function resolveLineIdTokenChannelId(
  env: NodeJS.ProcessEnv,
  defaultChannelId: string
): string | null {
  return (
    normalizeEnvString(env.LINE_LIFF_CHANNEL_ID) ??
    normalizeEnvString(env.LINE_LOGIN_CHANNEL_ID) ??
    normalizeEnvString(env.NEXT_PUBLIC_LIFF_CHANNEL_ID) ??
    normalizeEnvString(defaultChannelId)
  );
}

function resolveLiffId(env: NodeJS.ProcessEnv): string | null {
  return (
    normalizeEnvString(env.LINE_LIFF_ID) ??
    normalizeEnvString(env.NEXT_PUBLIC_LIFF_ID) ??
    normalizeEnvString(env.LIFF_ID)
  );
}

function normalizeInterestTags(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\n]/u)
      : [];

  return Array.from(
    new Set(
      rawValues
        .map((item) => normalizeOptionalText(item))
        .filter((item): item is string => Boolean(item))
    )
  ).slice(0, 12);
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/gu, " ");

  return normalized ? normalized.slice(0, 500) : null;
}

function readJsonString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEnvString(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

interface AdminBroadcastRequest {
  body: string;
  confirmed: boolean;
  confirmation: string;
  idempotencyKey: string;
}

async function readCustomerArchiveBody(
  request: Request
): Promise<{ confirmed: boolean } | null> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  return { confirmed: parsed.confirmed === true };
}

async function readAdminBroadcastBody(request: Request): Promise<AdminBroadcastRequest | null> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.body !== "string") {
    return null;
  }

  const body = parsed.body.trim();
  const confirmation =
    typeof parsed.confirmation === "string" ? parsed.confirmation.trim() : "";
  const idempotencyKey =
    typeof parsed.idempotency_key === "string" ? parsed.idempotency_key.trim() : "";

  if (
    !body ||
    body.length > 5_000 ||
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 160 ||
    !/^[A-Za-z0-9_-]+$/u.test(idempotencyKey)
  ) {
    return null;
  }

  return {
    body,
    confirmed: parsed.confirmed === true,
    confirmation,
    idempotencyKey
  };
}

function selectAdminBroadcastRecipients(customers: Customer[]): {
  recipients: Customer[];
  excludedDuplicateLine: number;
} {
  const recipientsByLineUserId = new Map<string, Customer>();
  let excludedDuplicateLine = 0;

  for (const customer of customers) {
    const lineUserId = customer.line_user_id?.trim();
    if (customer.status === "archived" || !lineUserId) {
      continue;
    }

    if (recipientsByLineUserId.has(lineUserId)) {
      excludedDuplicateLine += 1;
      continue;
    }

    recipientsByLineUserId.set(lineUserId, customer);
  }

  return {
    recipients: [...recipientsByLineUserId.values()],
    excludedDuplicateLine
  };
}

async function readStaffReplyBody(request: Request): Promise<StaffReplyLinePushRequest | null> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.body !== "string") {
    return null;
  }

  const body = parsed.body.trim();

  if (!body) {
    return null;
  }

  return {
    body,
    deliveryMode: parsed.delivery_mode === "real_line_push" ? "real_line_push" : "demo_save",
    realLinePushConfirmed: parsed.real_line_push_confirmed === true,
    linePushConfirmation:
      typeof parsed.line_push_confirmation === "string"
        ? parsed.line_push_confirmation.trim()
        : null,
    idempotencyKey:
      typeof parsed.idempotency_key === "string" && parsed.idempotency_key.trim()
        ? parsed.idempotency_key.trim()
        : null
  };
}

async function readCustomerRichMenuSwitchBody(
  request: Request
): Promise<{ menuType: CustomerRichMenuType } | null> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.menu_type !== "string") {
    return null;
  }

  const menuType = parsed.menu_type.trim();

  if (!isCustomerRichMenuType(menuType)) {
    return null;
  }

  return { menuType };
}

function readCustomerRichMenuIdFromEnv(
  env: NodeJS.ProcessEnv,
  menuType: CustomerRichMenuType
): string | undefined {
  switch (menuType) {
    case "initial":
      return (
        readNonEmptyEnvValue(env.LINE_RICH_MENU_INITIAL_ID) ??
        readNonEmptyEnvValue(env.AMAMIHOME_LINE_RICH_MENU_INITIAL_ID) ??
        readNonEmptyEnvValue(env.LINE_RICH_MENU_DEFAULT_ID) ??
        readNonEmptyEnvValue(env.AMAMIHOME_LINE_RICH_MENU_DEFAULT_ID)
      );
    case "negotiation":
      return (
        readNonEmptyEnvValue(env.LINE_RICH_MENU_NEGOTIATION_ID) ??
        readNonEmptyEnvValue(env.AMAMIHOME_LINE_RICH_MENU_NEGOTIATION_ID)
      );
    case "aftercare":
      return (
        readNonEmptyEnvValue(env.LINE_RICH_MENU_AFTERCARE_ID) ??
        readNonEmptyEnvValue(env.AMAMIHOME_LINE_RICH_MENU_AFTERCARE_ID)
      );
  }
}

function isLineRealSendWindowOpen(input: {
  env: NodeJS.ProcessEnv;
  lineClientMode: LineClientMode;
}): boolean {
  return (
    input.lineClientMode === "real" &&
    isEnabledRuntimeFlag(input.env.LINE_MESSAGING_ENABLED) &&
    isEnabledRuntimeFlag(input.env.LINE_REAL_PUSH_ENABLED)
  );
}

function isEnabledRuntimeFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

async function readRagSearchBody(
  request: Request
): Promise<{ query: string; limit: number } | null> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.query !== "string") {
    return null;
  }

  const query = parsed.query.trim();

  if (!query) {
    return null;
  }

  const limit = parsed.limit ?? 5;

  if (!Number.isInteger(limit) || typeof limit !== "number" || limit < 1 || limit > 10) {
    return null;
  }

  return {
    query,
    limit
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalHeader(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function readNonEmptyEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function parsePort(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return undefined;
  }

  return parsed;
}

function toAiConversationTurns(
  messages: Array<{
    role: AiConversationTurn["role"];
    message_type: string;
    body: string | null;
    created_at: string;
  }>
): AiConversationTurn[] {
  return messages
    .filter((message) => message.message_type !== "summary" && message.body?.trim())
    .map((message) => ({
      role: message.role,
      content: message.body?.trim() ?? "",
      created_at: message.created_at
    }));
}

function toAdminTimelineMessage(message: Message): {
  id: string;
  tenant_id: string;
  customer_id: string;
  role: string;
  message_type: string;
  body: string | null;
  line_message_id: string | null;
  source_url: string | null;
  attachment_available: boolean;
  created_at: string;
} {
  const attachmentAvailable = isPrivateLineAttachmentMessage(message);

  return {
    id: message.id,
    tenant_id: message.tenant_id,
    customer_id: message.customer_id,
    role: message.role,
    message_type: message.message_type,
    body: message.body,
    line_message_id: message.line_message_id,
    source_url: attachmentAvailable ? null : message.media_storage_path,
    attachment_available: attachmentAvailable,
    created_at: message.created_at
  };
}

function resolveSafeAttachmentContentType(contentType: string | null): string {
  const normalized = contentType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "application/pdf",
    "text/plain"
  ]);

  return allowed.has(normalized) ? normalized : "application/octet-stream";
}

function isInlineAttachmentContentType(contentType: string): boolean {
  return (
    contentType.startsWith("image/") ||
    contentType.startsWith("video/") ||
    contentType.startsWith("audio/")
  );
}

function buildSafeAttachmentFileName(message: Message, mediaStoragePath: string): string {
  const safeMessageId = message.id.replace(/[^A-Za-z0-9_-]/gu, "_").slice(0, 80) || "message";
  const extension = mediaStoragePath.match(/\.(jpg|png|gif|webp|mp4|m4a|mp3|wav|pdf|txt|bin)$/u)?.[1] ?? "bin";

  return `line-attachment-${safeMessageId}.${extension}`;
}

function toAiRagAnswerSources(
  results: Array<{
    id: string;
    title: string;
    url: string;
    category: string;
    source_type: string;
    excerpt: string;
    score: number;
  }>
): AiRagAnswerSource[] {
  return results.map((result) => ({
    id: result.id,
    title: result.title,
    url: result.url,
    category: result.category,
    source_type: result.source_type,
    excerpt: result.excerpt,
    score: result.score
  }));
}

function toAdminAlert(alert: Alert): {
  id: string;
  tenant_id: string;
  customer_id: string;
  type: string;
  severity: string;
  status: string;
  message: string;
  notified_at: string | null;
  resolved_at: string | null;
  created_at: string;
} {
  return {
    id: alert.id,
    tenant_id: alert.tenant_id,
    customer_id: alert.customer_id,
    type: alert.alert_type,
    severity: alert.severity,
    status: alert.status,
    message: alert.message,
    notified_at: alert.notified_at,
    resolved_at: alert.resolved_at,
    created_at: alert.created_at
  };
}

function resolveAdminTenant(tenantId: string | undefined, env: NodeJS.ProcessEnv) {
  const result = resolveAdminTenantContext({
    tenantIdHeader: tenantId,
    env
  });

  if (result.status === "ok") {
    return result;
  }

  return {
    ...result,
    httpResponse: mapAdminTenantGuardErrorToHttp(result.error)
  };
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

function resolveStaffLineWebhook(
  webhookSecret: string,
  env: NodeJS.ProcessEnv
): ResolvedWebhookTenant | null {
  const config = loadAppConfig(env);

  if (webhookSecret !== config.staffLine.webhookSecretPath) {
    return null;
  }

  return {
    tenantId: config.tenant.id,
    tenantSlug: config.tenant.slug,
    channelSecret: env.STAFF_LINE_CHANNEL_SECRET
  };
}

export const app = createApiApp({
  startOfficialSiteKnowledgeSync: isProductionRuntime(process.env)
});

if (process.env.NODE_ENV !== "test") {
  const listenOptions = resolveApiServerListenOptions(process.env);

  serve(
    {
      fetch: app.fetch,
      ...listenOptions
    },
    (info) => {
      console.log(
        `API server listening on http://${listenOptions.hostname ?? "localhost"}:${info.port}`
      );
    }
  );
}
