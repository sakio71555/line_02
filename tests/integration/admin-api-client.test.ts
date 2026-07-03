import { describe, expect, it } from "vitest";

import {
  ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE,
  adminApiFetch,
  adminCustomerDetailPath,
  adminLineRealSendCapabilityPath,
  checkUnrepliedAlerts,
  createAiReplyDraft,
  createAiSummary,
  createAdminApiUrl,
  createRagAnswerDraft,
  DEFAULT_API_BASE_URL,
  DEFAULT_STAFF_ID,
  DEFAULT_TENANT_ID,
  formatAdminApiKnownError,
  getAdminApiConfig,
  getAdminLineRealSendCapability,
  listAlerts,
  notifyOpenAlerts,
  sendStaffReply,
  shouldIncludeDevTenantHeader
} from "../../apps/admin/src/admin-api";
import {
  createBearerAuthorizationHeader,
  readAdminAccessToken
} from "../../apps/admin/src/admin-auth-token";

describe("admin read-only API client", () => {
  it("uses safe local defaults for API_BASE_URL and TENANT_ID", () => {
    const config = getAdminApiConfig({});

    expect(config).toEqual({
      apiBaseUrl: DEFAULT_API_BASE_URL,
      tenantId: DEFAULT_TENANT_ID,
      staffId: DEFAULT_STAFF_ID,
      includeDevTenantHeader: true
    });
  });

  it("disables the dev tenant header by default in production admin config", () => {
    expect(shouldIncludeDevTenantHeader({ APP_ENV: "production" })).toBe(false);
    expect(shouldIncludeDevTenantHeader({ NODE_ENV: "production" })).toBe(false);
    expect(
      shouldIncludeDevTenantHeader({
        APP_ENV: "production",
        ADMIN_API_INCLUDE_DEV_TENANT_HEADER: "true"
      })
    ).toBe(true);
    expect(
      getAdminApiConfig({
        APP_ENV: "production",
        API_BASE_URL: "https://admin-api.example.invalid",
        TENANT_ID: "tenant_amamihome"
      }).includeDevTenantHeader
    ).toBe(false);
  });

  it("does not default to the development staff id in production admin config", () => {
    expect(
      getAdminApiConfig({
        APP_ENV: "production",
        API_BASE_URL: "https://admin-api.example.invalid",
        TENANT_ID: "tenant_amamihome"
      }).staffId
    ).toBeUndefined();
    expect(
      getAdminApiConfig({
        APP_ENV: "production",
        API_BASE_URL: "https://admin-api.example.invalid",
        TENANT_ID: "tenant_amamihome",
        STAFF_ID: "staff_admin_001"
      }).staffId
    ).toBe("staff_admin_001");
  });

  it("builds admin API URLs from the configured base URL", () => {
    expect(
      createAdminApiUrl("/api/admin/customers", {
        apiBaseUrl: "http://localhost:4999",
        tenantId: "tenant_amamihome"
      })
    ).toBe("http://localhost:4999/api/admin/customers");
  });

  it("builds encoded customer detail paths", () => {
    expect(adminCustomerDetailPath("customer 1/2")).toBe("/api/admin/customers/customer%201%2F2");
  });

  it("builds the admin line real send capability path", () => {
    expect(adminLineRealSendCapabilityPath()).toBe(
      "/api/admin/runtime/line-real-send-capability"
    );
  });

  it("attaches x-tenant-id and no-store cache to fetch requests", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchFn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    await adminApiFetch(
      "/api/admin/customers/customer_1",
      {},
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        },
        fetchFn
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(calls[0]?.input).toBe("http://localhost:4000/api/admin/customers/customer_1");
    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
    expect(headers.get("accept")).toBe("application/json");
    expect(calls[0]?.init?.cache).toBe("no-store");
  });

  it("attaches selectedTenantId as x-selected-tenant-id while keeping x-tenant-id separate", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await adminApiFetch(
      "/api/admin/customers",
      {},
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome",
          selectedTenantId: "tenant_other"
        },
        fetchFn: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
    expect(headers.get("x-selected-tenant-id")).toBe("tenant_other");
    expect(headers.get("authorization")).toBeNull();
  });

  it("attaches an Authorization Bearer header from an access token provider", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await adminApiFetch(
      "/api/admin/customers",
      {},
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome",
          selectedTenantId: "tenant_amamihome"
        },
        accessTokenProvider: async () => " private-admin-token ",
        fetchFn: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(headers.get("authorization")).toBe("Bearer private-admin-token");
    expect(headers.get("x-selected-tenant-id")).toBe("tenant_amamihome");
    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
  });

  it("does not attach Authorization when the access token provider is absent or blank", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await adminApiFetch(
      "/api/admin/customers",
      {},
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        },
        accessTokenProvider: async () => "   ",
        fetchFn: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(headers.get("authorization")).toBeNull();
  });

  it("can suppress x-tenant-id for production-style Authorization requests", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await adminApiFetch(
      "/api/admin/customers",
      {},
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome",
          selectedTenantId: "tenant_amamihome",
          includeDevTenantHeader: false
        },
        accessTokenProvider: () => "private-admin-token",
        fetchFn: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(headers.get("x-tenant-id")).toBeNull();
    expect(headers.get("x-selected-tenant-id")).toBe("tenant_amamihome");
    expect(headers.get("authorization")).toBe("Bearer private-admin-token");
  });

  it("keeps access tokens out of provider and API error messages", async () => {
    await expect(readAdminAccessToken(() => " private-admin-token ")).resolves.toBe(
      "private-admin-token"
    );
    expect(createBearerAuthorizationHeader(" private-admin-token ")).toBe(
      "Bearer private-admin-token"
    );

    await expect(
      readAdminAccessToken(() => {
        throw new Error("private-admin-token");
      })
    ).rejects.toThrow("Admin auth token provider failed.");

    await expect(
      adminApiFetch(
        "/api/admin/customers",
        {},
        {
          config: {
            apiBaseUrl: "http://localhost:4000",
            tenantId: "tenant_amamihome"
          },
          accessTokenProvider: () => "private-admin-token",
          fetchFn: async () =>
            new Response(JSON.stringify({ ok: false, error: "authenticated_staff_required" }), {
              status: 401,
              statusText: "Unauthorized"
            })
        }
      )
    ).rejects.not.toThrow("private-admin-token");
  });

  it("does not attach x-selected-tenant-id when the selector is absent", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await adminApiFetch(
      "/api/admin/customers",
      {},
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome",
          selectedTenantId: ""
        },
        fetchFn: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(headers.get("x-selected-tenant-id")).toBeNull();
  });

  it("rejects invalid selectedTenantId locally before fetch", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await expect(
      adminApiFetch(
        "/api/admin/customers",
        {},
        {
          config: {
            apiBaseUrl: "http://localhost:4000",
            tenantId: "tenant_amamihome",
            selectedTenantId: "tenant invalid"
          },
          fetchFn: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            calls.push({ input, init });
            return jsonResponse({ ok: true });
          }
        }
      )
    ).rejects.toThrow("invalid_selected_tenant_id");

    expect(calls).toHaveLength(0);
  });

  it("throws a readable error when the admin API returns an error", async () => {
    await expect(
      adminApiFetch(
        "/api/admin/customers",
        {},
        {
          config: {
            apiBaseUrl: "http://localhost:4000",
            tenantId: "tenant_amamihome"
          },
          fetchFn: async () =>
            new Response(JSON.stringify({ ok: false, error: "unknown_tenant_id" }), {
              status: 403,
              statusText: "Forbidden"
            })
        }
      )
    ).rejects.toThrow("Admin API request failed: 403 Forbidden");
  });

  it("maps selected tenant and auth error codes to readable UI messages", async () => {
    await expect(
      adminApiFetch(
        "/api/admin/customers",
        {},
        {
          config: {
            apiBaseUrl: "http://localhost:4000",
            tenantId: "tenant_amamihome",
            selectedTenantId: "tenant_other"
          },
          fetchFn: async () =>
            new Response(JSON.stringify({ ok: false, error: "tenant_membership_denied" }), {
              status: 403,
              statusText: "Forbidden"
            })
        }
      )
    ).rejects.toThrow("選択した利用先へアクセスできません");

    expect(formatAdminApiKnownError("tenant_selection_required")).toContain(
      "利用先を選ぶ必要があります"
    );
    expect(formatAdminApiKnownError("authenticated_staff_required")).toContain(
      "ログイン確認が必要です"
    );
    expect(formatAdminApiKnownError("invalid_selected_tenant_id")).toContain(
      "利用先IDの形式が正しくありません"
    );
  });

  it("posts AI summary requests to the customer action endpoint with x-tenant-id", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await createAiSummary("customer 1/2", {
      config: {
        apiBaseUrl: "http://localhost:4000",
        tenantId: "tenant_amamihome"
      },
      fetchFn: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ ok: true });
      }
    });

    const headers = new Headers(calls[0]?.init?.headers);

    expect(calls[0]?.input).toBe(
      "http://localhost:4000/api/admin/customers/customer%201%2F2/ai-summary"
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.cache).toBeUndefined();
    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
  });

  it("posts AI reply draft requests to the customer action endpoint with x-tenant-id", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await createAiReplyDraft("customer_001", {
      config: {
        apiBaseUrl: "http://localhost:4000",
        tenantId: "tenant_amamihome"
      },
      fetchFn: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ ok: true });
      }
    });

    const headers = new Headers(calls[0]?.init?.headers);

    expect(calls[0]?.input).toBe(
      "http://localhost:4000/api/admin/customers/customer_001/ai-reply-draft"
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
  });

  it("posts RAG answer draft requests with query and limit in the JSON body", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await createRagAnswerDraft(
      { query: "オンライン相談", limit: 5 },
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        },
        fetchFn: async (input, init) => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(calls[0]?.input).toBe("http://localhost:4000/api/admin/rag/answer-draft");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
    expect(headers.get("content-type")).toBe("application/json");
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        query: "オンライン相談",
        limit: 5
      })
    );
  });

  it("treats admin action API errors as thrown errors", async () => {
    await expect(
      createAiSummary("customer_001", {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        },
        fetchFn: async () =>
          new Response(JSON.stringify({ ok: false, error: "cannot_summarize_empty_timeline" }), {
            status: 409,
            statusText: "Conflict"
          })
      })
    ).rejects.toThrow("Admin API request failed: 409 Conflict");
  });

  it("posts staff replies with tenant, staff id, and JSON reply body", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await sendStaffReply(
      { customerId: "customer 1/2", body: "返信内容を確認しました。" },
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome",
          staffId: "staff_admin_001"
        },
        fetchFn: async (input, init) => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(calls[0]?.input).toBe(
      "http://localhost:4000/api/admin/customers/customer%201%2F2/reply"
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
    expect(headers.get("x-staff-id")).toBe("staff_admin_001");
    expect(headers.get("content-type")).toBe("application/json");
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        body: "返信内容を確認しました。"
      })
    );
  });

  it("can include real LINE push confirmation fields in staff reply requests", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await sendStaffReply(
      {
        customerId: "customer_001",
        body: "確認済みの返信です。",
        deliveryMode: "real_line_push",
        realLinePushConfirmed: true,
        linePushConfirmation: ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE,
        idempotencyKey: "idem_admin_helper"
      },
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        },
        fetchFn: async (input, init) => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        body: "確認済みの返信です。",
        delivery_mode: "real_line_push",
        real_line_push_confirmed: true,
        line_push_confirmation: ADMIN_REAL_LINE_PUSH_CONFIRMATION_VALUE,
        idempotency_key: "idem_admin_helper"
      })
    );
  });

  it("reads the line real send capability with selected tenant transport", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    const response = await getAdminLineRealSendCapability({
      config: {
        apiBaseUrl: "http://localhost:4000",
        tenantId: "tenant_amamihome",
        selectedTenantId: "tenant_amamihome"
      },
      fetchFn: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({
          ok: true,
          tenant_id: "tenant_amamihome",
          line_real_send_window_open: false,
          real_send_action_visible: false,
          delivery_mode_required: "real_line_push",
          explicit_confirmation_required: true,
          single_send_only: true,
          retry_allowed: false,
          bulk_multicast_broadcast_allowed: false
        });
      }
    });

    const headers = new Headers(calls[0]?.init?.headers);

    expect(calls[0]?.input).toBe(
      "http://localhost:4000/api/admin/runtime/line-real-send-capability"
    );
    expect(headers.get("x-selected-tenant-id")).toBe("tenant_amamihome");
    expect(response.real_send_action_visible).toBe(false);
    expect(response.retry_allowed).toBe(false);
    expect(response.bulk_multicast_broadcast_allowed).toBe(false);
  });

  it("marks UI staff replies as demo-save requests when requested", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await sendStaffReply(
      {
        customerId: "customer_001",
        body: "デモ保存の返信です。",
        deliveryMode: "demo_save"
      },
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        },
        fetchFn: async (input, init) => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        body: "デモ保存の返信です。",
        delivery_mode: "demo_save"
      })
    );
  });

  it("omits x-staff-id for staff replies when config omits staffId", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await sendStaffReply(
      { customerId: "customer_001", body: "担当者返信です。" },
      {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        },
        fetchFn: async (input, init) => {
          calls.push({ input, init });
          return jsonResponse({ ok: true });
        }
      }
    );

    const headers = new Headers(calls[0]?.init?.headers);

    expect(headers.get("x-staff-id")).toBeNull();
  });

  it("treats staff reply API errors as thrown errors", async () => {
    await expect(
      sendStaffReply(
        { customerId: "customer_001", body: "返信本文" },
        {
          config: {
            apiBaseUrl: "http://localhost:4000",
            tenantId: "tenant_amamihome"
          },
          fetchFn: async () =>
            new Response(JSON.stringify({ ok: false, error: "cannot_reply_without_line_user_id" }), {
              status: 409,
              statusText: "Conflict"
            })
        }
      )
    ).rejects.toThrow("Admin API request failed: 409 Conflict");
  });

  it("lists alerts with optional status filter and x-tenant-id", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await listAlerts("open", {
      config: {
        apiBaseUrl: "http://localhost:4000",
        tenantId: "tenant_amamihome"
      },
      fetchFn: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ ok: true, alerts: [] });
      }
    });

    const headers = new Headers(calls[0]?.init?.headers);

    expect(calls[0]?.input).toBe("http://localhost:4000/api/admin/alerts?status=open");
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(calls[0]?.init?.cache).toBe("no-store");
    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
  });

  it("posts unreplied alert checks with x-tenant-id", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await checkUnrepliedAlerts({
      config: {
        apiBaseUrl: "http://localhost:4000",
        tenantId: "tenant_amamihome"
      },
      fetchFn: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ ok: true });
      }
    });

    const headers = new Headers(calls[0]?.init?.headers);

    expect(calls[0]?.input).toBe("http://localhost:4000/api/admin/alerts/check-unreplied");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
  });

  it("posts open alert notifications with x-tenant-id", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    await notifyOpenAlerts({
      config: {
        apiBaseUrl: "http://localhost:4000",
        tenantId: "tenant_amamihome"
      },
      fetchFn: async (input, init) => {
        calls.push({ input, init });
        return jsonResponse({ ok: true });
      }
    });

    const headers = new Headers(calls[0]?.init?.headers);

    expect(calls[0]?.input).toBe("http://localhost:4000/api/admin/alerts/notify-open");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(headers.get("x-tenant-id")).toBe("tenant_amamihome");
  });

  it("treats alert API errors as thrown errors", async () => {
    await expect(
      listAlerts("open", {
        config: {
          apiBaseUrl: "http://localhost:4000",
          tenantId: "tenant_amamihome"
        },
        fetchFn: async () =>
          new Response(JSON.stringify({ ok: false, error: "unknown_tenant_id" }), {
            status: 403,
            statusText: "Forbidden"
          })
      })
    ).rejects.toThrow("Admin API request failed: 403 Forbidden");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
