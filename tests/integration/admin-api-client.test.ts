import { describe, expect, it } from "vitest";

import {
  adminApiFetch,
  adminCustomerDetailPath,
  createAiReplyDraft,
  createAiSummary,
  createAdminApiUrl,
  createRagAnswerDraft,
  DEFAULT_API_BASE_URL,
  DEFAULT_TENANT_ID,
  getAdminApiConfig
} from "../../apps/admin/src/admin-api";

describe("admin read-only API client", () => {
  it("uses safe local defaults for API_BASE_URL and TENANT_ID", () => {
    const config = getAdminApiConfig({});

    expect(config).toEqual({
      apiBaseUrl: DEFAULT_API_BASE_URL,
      tenantId: DEFAULT_TENANT_ID
    });
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
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
