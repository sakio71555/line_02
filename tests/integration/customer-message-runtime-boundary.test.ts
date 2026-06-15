import { afterEach, describe, expect, it, vi } from "vitest";
import type { Customer, Message } from "@amami-line-crm/domain";
import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository
} from "@amami-line-crm/domain";

import {
  createCustomerMessageRepositoriesForRuntime,
  createInMemoryCustomerMessageRepositories,
  createSupabaseCustomerMessageRepositories,
  createSupabaseCustomerMessageRepositoriesFromEnv,
  SupabaseCustomerRepository,
  SupabaseMessageRepository,
  SupabaseRuntimeNotConfiguredError,
  type SupabaseEnv,
  type SupabaseRepositoryClient
} from "@amami-line-crm/db";

const tenantId = "tenant_amamihome";
const now = "2026-06-15T00:00:00.000Z";
const fakeEnv: SupabaseEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "fake-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
  SUPABASE_DB_URL: "postgresql://postgres:postgres@localhost:54322/postgres"
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("customer/message repository runtime boundary", () => {
  it("exports the boundary without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("@amami-line-crm/db")).resolves.toHaveProperty(
      "createCustomerMessageRepositoriesForRuntime"
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("defaults to in-memory repositories without reading Supabase env", async () => {
    const bundle = createCustomerMessageRepositoriesForRuntime({
      env: {
        SUPABASE_SERVICE_ROLE_KEY: "secret-value-that-must-not-be-needed"
      }
    });

    expect(bundle.runtime_mode).toBe("in_memory");
    expect(bundle.customerRepository).toBeInstanceOf(InMemoryCustomerRepository);
    expect(bundle.messageRepository).toBeInstanceOf(InMemoryMessageRepository);

    await bundle.customerRepository.save(createCustomer());
    await bundle.messageRepository.insert(createMessage());

    await expect(bundle.customerRepository.listByTenant(tenantId)).resolves.toHaveLength(1);
    await expect(bundle.messageRepository.listByCustomer(tenantId, "customer_1")).resolves.toHaveLength(
      1
    );
  });

  it("creates an explicit in-memory bundle", () => {
    const bundle = createInMemoryCustomerMessageRepositories();

    expect(bundle.runtime_mode).toBe("in_memory");
    expect(bundle.customerRepository).toBeInstanceOf(InMemoryCustomerRepository);
    expect(bundle.messageRepository).toBeInstanceOf(InMemoryMessageRepository);
  });

  it("creates Supabase repositories from an injected fake client without real env", () => {
    const bundle = createSupabaseCustomerMessageRepositories({ client: createFakeClient() });

    expect(bundle.runtime_mode).toBe("supabase");
    expect(bundle.customerRepository).toBeInstanceOf(SupabaseCustomerRepository);
    expect(bundle.messageRepository).toBeInstanceOf(SupabaseMessageRepository);
  });

  it("creates Supabase repositories through runtime mode when a fake client is injected", () => {
    const bundle = createCustomerMessageRepositoriesForRuntime({
      mode: "supabase",
      supabaseClient: createFakeClient()
    });

    expect(bundle.runtime_mode).toBe("supabase");
    expect(bundle.customerRepository).toBeInstanceOf(SupabaseCustomerRepository);
    expect(bundle.messageRepository).toBeInstanceOf(SupabaseMessageRepository);
  });

  it("can create the Supabase boundary from fake env without network access", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const bundle = createSupabaseCustomerMessageRepositoriesFromEnv(fakeEnv);

    expect(bundle.runtime_mode).toBe("supabase");
    expect(bundle.customerRepository).toBeInstanceOf(SupabaseCustomerRepository);
    expect(bundle.messageRepository).toBeInstanceOf(SupabaseMessageRepository);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails clearly when Supabase mode is requested without required env", () => {
    expect(() =>
      createCustomerMessageRepositoriesForRuntime({
        mode: "supabase",
        env: {}
      })
    ).toThrow(SupabaseRuntimeNotConfiguredError);

    try {
      createCustomerMessageRepositoriesForRuntime({
        mode: "supabase",
        env: {}
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseRuntimeNotConfiguredError);
      expect((error as SupabaseRuntimeNotConfiguredError).code).toBe(
        "supabase_runtime_not_configured"
      );
      expect((error as SupabaseRuntimeNotConfiguredError).missing).toEqual([
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_DB_URL"
      ]);
      expect(String(error)).toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
  });

  it("does not expose Supabase env values in runtime configuration errors", () => {
    const secretValue = "secret-service-role-key-value";

    try {
      createCustomerMessageRepositoriesForRuntime({
        mode: "supabase",
        env: {
          SUPABASE_URL: "not-a-url",
          SUPABASE_ANON_KEY: "fake-anon-key",
          SUPABASE_SERVICE_ROLE_KEY: secretValue,
          SUPABASE_DB_URL: "also-not-a-url"
        }
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseRuntimeNotConfiguredError);
      expect(String(error)).toContain("SUPABASE_URL");
      expect(String(error)).toContain("SUPABASE_DB_URL");
      expect(String(error)).not.toContain("not-a-url");
      expect(String(error)).not.toContain("also-not-a-url");
      expect(String(error)).not.toContain(secretValue);
    }
  });
});

function createFakeClient(): SupabaseRepositoryClient {
  return {
    from() {
      throw new Error("Fake Supabase client must not be queried in runtime boundary tests.");
    }
  } as SupabaseRepositoryClient;
}

function createCustomer(input: Partial<Customer> = {}): Customer {
  return {
    id: "customer_1",
    tenant_id: tenantId,
    line_user_id: "line_user_1",
    display_name: "Demo Customer",
    picture_url: null,
    phone: null,
    email: null,
    postal_code: null,
    address: null,
    interest_tags: [],
    response_mode: "bot_auto",
    status: "new",
    last_message_at: null,
    last_customer_message_at: null,
    last_staff_reply_at: null,
    created_at: now,
    updated_at: now,
    ...input
  };
}

function createMessage(input: Partial<Message> = {}): Message {
  return {
    id: "message_1",
    tenant_id: tenantId,
    customer_id: "customer_1",
    consultation_id: null,
    line_message_id: "line_message_1",
    role: "customer",
    message_type: "text",
    body: "こんにちは",
    media_storage_path: null,
    staff_user_id: null,
    ai_generated: false,
    sent_to_line_at: null,
    created_at: now,
    ...input
  };
}
