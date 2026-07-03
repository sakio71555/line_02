import { serve } from "@hono/node-server";
import { Hono } from "hono";

import {
  type AiConversationTurn,
  type AiProvider,
  type AiRagAnswerSource
} from "@amami-line-crm/ai";
import { loadAppConfig } from "@amami-line-crm/config";
import {
  checkUnrepliedAlerts,
  getCustomerDetail,
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  ensureOpenUnrepliedCustomerMessageAlert,
  listCustomerListItems,
  listCustomerTimeline,
  logLineWebhookEvents,
  MockStaffNotifier,
  notifyOpenAlerts,
  recordAiSummaryMessage,
  recordStaffTextReply,
  resolveCustomerRichMenuGuideAction,
  type AdminAction,
  type Alert,
  type AlertRepository,
  type Customer,
  type CustomerRepository,
  type LineReplyInstruction,
  type Message,
  type MessageRepository,
  type StaffAuthLookup,
  type StaffNotifier
} from "@amami-line-crm/domain";
import {
  FetchLineIdTokenVerifier,
  LineIdTokenVerificationError,
  MockLineClient,
  parseLineWebhookPayload,
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
  searchTenantKnowledge,
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
}

const defaultAlertRepository = new InMemoryAlertRepository();
const defaultCustomerRepository = new InMemoryCustomerRepository();
const defaultMessageRepository = new InMemoryMessageRepository();
const defaultLineClient = new MockLineClient();
const defaultStaffNotifier = new MockStaffNotifier();
const defaultKnowledgePageRepository = new InMemoryKnowledgePageRepository([]);
const defaultLineIdTokenVerifier = new FetchLineIdTokenVerifier();

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
  const lineClient = dependencies.lineClient ?? runtimeLineClient?.lineClient ?? defaultLineClient;
  const staffNotifier = dependencies.staffNotifier ?? defaultStaffNotifier;
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
      staffNotifier,
      adminBaseUrl: config.urls.appBaseUrl,
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

    try {
      const payload = parseLineWebhookPayload(rawBody);
      const logging = await logLineWebhookEvents({
        tenant_id: tenant.tenantId,
        events: payload.events,
        customerRepository,
        messageRepository,
        alertRepository,
        getLineDisplayName: (lineUserId) => getLineDisplayNameFromLineProfile(lineClient, lineUserId)
      });
      const { line_reply_instructions: lineReplyInstructions, ...publicLogging } = logging;
      const guideReplies = await replyToCustomerRichMenuGuideEvents(payload.events, lineClient);
      const flowReplies = await replyToLineReplyInstructions(lineReplyInstructions, lineClient);
      const lineMenuReplies = combineLineReplyCounts(guideReplies, flowReplies);

      return c.json({
        ok: true,
        tenant_id: tenant.tenantId,
        tenant_slug: tenant.tenantSlug,
        destination: payload.destination,
        event_count: payload.events.length,
        events: payload.events,
        line_menu_replies: lineMenuReplies,
        logging: publicLogging
      });
    } catch {
      return c.json({ ok: false, error: "malformed_line_webhook_body" }, 400);
    }
  });

  return api;
}

async function replyToCustomerRichMenuGuideEvents(
  events: NormalizedLineWebhookEvent[],
  lineClient: LineClient
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of events) {
    const guideAction = resolveCustomerRichMenuGuideAction(event.text);

    if (!guideAction) {
      continue;
    }

    if (!event.reply_token) {
      skipped += 1;
      continue;
    }

    try {
      await lineClient.replyMessage(event.reply_token, [
        {
          type: "text",
          text: guideAction.reply_text
        }
      ]);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed, skipped };
}

async function replyToLineReplyInstructions(
  instructions: LineReplyInstruction[],
  lineClient: LineClient
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const instruction of instructions) {
    if (!instruction.reply_token) {
      skipped += 1;
      continue;
    }

    try {
      await lineClient.replyMessage(instruction.reply_token, [
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
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed, skipped };
}

function combineLineReplyCounts(
  first: { sent: number; failed: number; skipped: number },
  second: { sent: number; failed: number; skipped: number }
): { sent: number; failed: number; skipped: number } {
  return {
    sent: first.sent + second.sent,
    failed: first.failed + second.failed,
    skipped: first.skipped + second.skipped
  };
}

export const app = createApiApp();

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
  upsertMany(pages: KnowledgePage[]): void;
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
    input.knowledgePageRepository.upsertMany(knowledgePages);
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
  created_at: string;
} {
  return {
    id: message.id,
    tenant_id: message.tenant_id,
    customer_id: message.customer_id,
    role: message.role,
    message_type: message.message_type,
    body: message.body,
    line_message_id: message.line_message_id,
    source_url: message.media_storage_path,
    created_at: message.created_at
  };
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
