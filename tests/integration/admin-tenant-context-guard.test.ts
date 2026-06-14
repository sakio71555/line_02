import { describe, expect, it } from "vitest";

import {
  mapAdminTenantGuardErrorToHttp,
  resolveAdminTenantContext
} from "../../apps/api/src/admin/tenant-context";
import { createApiApp } from "../../apps/api/src/index";

describe("admin tenant context guard", () => {
  it("creates a dev-header tenant context for the known tenant", () => {
    const result = resolveAdminTenantContext({
      tenantIdHeader: "tenant_amamihome",
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome"
      }
    });

    expect(result).toEqual({
      status: "ok",
      tenantId: "tenant_amamihome",
      context: {
        tenantId: "tenant_amamihome",
        source: "dev_header"
      }
    });
  });

  it("rejects missing tenant context with the legacy Admin API response mapping", () => {
    const result = resolveAdminTenantContext({
      tenantIdHeader: undefined,
      env: {
        TENANT_ID: "tenant_amamihome"
      }
    });

    expect(result).toEqual({
      status: "missing",
      error: { code: "missing_tenant_context" }
    });

    if (result.status !== "ok") {
      expect(mapAdminTenantGuardErrorToHttp(result.error)).toEqual({
        status: 401,
        body: { ok: false, error: "missing_tenant_id" }
      });
    }
  });

  it("rejects unknown tenants with the legacy Admin API response mapping", () => {
    const result = resolveAdminTenantContext({
      tenantIdHeader: "tenant_other",
      env: {
        TENANT_ID: "tenant_amamihome"
      }
    });

    expect(result).toEqual({
      status: "unknown",
      error: { code: "unknown_tenant" }
    });

    if (result.status !== "ok") {
      expect(mapAdminTenantGuardErrorToHttp(result.error)).toEqual({
        status: 403,
        body: { ok: false, error: "unknown_tenant_id" }
      });
    }
  });

  it("keeps existing Admin API route behavior through the guard", async () => {
    const app = createApiApp({
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome",
        LINE_CHANNEL_SECRET: "test-secret"
      }
    });

    const missingTenantResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers")
    );
    const unknownTenantResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_unknown" }
      })
    );
    const knownTenantResponse = await app.fetch(
      new Request("http://localhost/api/admin/customers", {
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(missingTenantResponse.status).toBe(401);
    expect(await missingTenantResponse.json()).toEqual({
      ok: false,
      error: "missing_tenant_id"
    });

    expect(unknownTenantResponse.status).toBe(403);
    expect(await unknownTenantResponse.json()).toEqual({
      ok: false,
      error: "unknown_tenant_id"
    });

    expect(knownTenantResponse.status).toBe(200);
    expect(await knownTenantResponse.json()).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome"
    });
  });

  it("keeps the dev seed route behavior unchanged", async () => {
    const app = createApiApp({
      env: {
        TENANT_ID: "tenant_amamihome",
        TENANT_SLUG: "amamihome",
        LINE_CHANNEL_SECRET: "test-secret"
      }
    });

    const response = await app.fetch(
      new Request("http://localhost/api/dev/seed-demo-data", {
        method: "POST",
        headers: { "x-tenant-id": "tenant_amamihome" }
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      tenant_id: "tenant_amamihome"
    });
  });
});
