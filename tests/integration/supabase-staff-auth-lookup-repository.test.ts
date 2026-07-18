import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAuthenticatedTenantContext, type StaffTenantMembership } from "@amami-line-crm/domain";

import {
  SupabaseRepositoryError,
  SupabaseStaffAuthLookupRepository,
  type SupabaseRepositoryClient,
  type SupabaseRepositoryErrorLike
} from "@amami-line-crm/db";

type Terminal = "maybeSingle" | "list";

interface FakeResult {
  data: unknown;
  error: SupabaseRepositoryErrorLike | null;
}

interface FakeOperation {
  table: string;
  action: string;
  column?: string;
  value?: unknown;
  columns?: string;
  ascending?: boolean;
}

class FakeSupabaseClient {
  readonly operations: FakeOperation[] = [];
  private readonly results = new Map<string, FakeResult>();

  from(table: string): FakeQueryBuilder {
    this.operations.push({ table, action: "from" });
    return new FakeQueryBuilder(this, table);
  }

  rpc(functionName: string, args: Record<string, unknown>): Promise<FakeResult> {
    this.operations.push({ table: functionName, action: "rpc", value: args });
    return Promise.resolve(this.getResult(functionName, "list"));
  }

  setResult(table: string, terminal: Terminal, result: FakeResult): void {
    this.results.set(`${table}:${terminal}`, result);
  }

  getResult(table: string, terminal: Terminal): FakeResult {
    return this.results.get(`${table}:${terminal}`) ?? { data: null, error: null };
  }

  push(operation: FakeOperation): void {
    this.operations.push(operation);
  }
}

class FakeQueryBuilder implements PromiseLike<FakeResult> {
  constructor(
    private readonly client: FakeSupabaseClient,
    private readonly table: string
  ) {}

  select(columns = "*"): this {
    this.client.push({ table: this.table, action: "select", columns });
    return this;
  }

  eq(column: string, value: unknown): this {
    this.client.push({ table: this.table, action: "eq", column, value });
    return this;
  }

  order(column: string, options: { ascending: boolean }): this {
    this.client.push({
      table: this.table,
      action: "order",
      column,
      ascending: options.ascending
    });
    return this;
  }

  maybeSingle(): Promise<FakeResult> {
    this.client.push({ table: this.table, action: "maybeSingle" });
    return Promise.resolve(this.client.getResult(this.table, "maybeSingle"));
  }

  then<TResult1 = FakeResult, TResult2 = never>(
    onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    this.client.push({ table: this.table, action: "execute" });
    return Promise.resolve(this.client.getResult(this.table, "list")).then(
      onfulfilled,
      onrejected
    );
  }
}

const now = "2026-06-14T00:00:00.000Z";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Supabase staff auth lookup repository", () => {
  it("exports the repository without env validation or network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(import("@amami-line-crm/db")).resolves.toHaveProperty(
      "SupabaseStaffAuthLookupRepository"
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("finds staff by auth_user_id with a direct staff_users query", async () => {
    const client = createFakeClient();
    client.setResult("staff_users", "maybeSingle", { data: createStaffRow(), error: null });
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    const staff = await repository.findStaffByAuthUserId(" auth_user_1 ");

    expect(staff).toEqual({
      id: "staff_1",
      tenant_id: "tenant_amamihome",
      auth_user_id: "auth_user_1",
      email: "staff@example.test",
      display_name: "Dev Staff",
      role: "owner",
      status: "active",
      line_user_id: null,
      is_active: true,
      last_login_at: null,
      disabled_at: null,
      archived_at: null,
      created_at: now,
      updated_at: now
    });
    expect(client.operations).toContainEqual({
      table: "staff_users",
      action: "eq",
      column: "auth_user_id",
      value: "auth_user_1"
    });
  });

  it("returns null for missing or mismatched staff", async () => {
    const client = createFakeClient();
    client.setResult("staff_users", "maybeSingle", {
      data: createStaffRow({ auth_user_id: "auth_user_other" }),
      error: null
    });
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    await expect(repository.findStaffByAuthUserId("auth_user_1")).resolves.toBeNull();
  });

  it("does not query when auth_user_id is empty", async () => {
    const client = createFakeClient();
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    await expect(repository.findStaffByAuthUserId("   ")).resolves.toBeNull();

    expect(client.operations).toEqual([]);
  });

  it("returns disabled and archived staff fields for resolver-side active checks", async () => {
    const client = createFakeClient();
    client.setResult("staff_users", "maybeSingle", {
      data: createStaffRow({
        status: "disabled",
        is_active: false,
        disabled_at: "2026-06-14T01:00:00.000Z"
      }),
      error: null
    });
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    const staff = await repository.findStaffByAuthUserId("auth_user_1");

    expect(staff).toMatchObject({
      status: "disabled",
      is_active: false,
      disabled_at: "2026-06-14T01:00:00.000Z"
    });
  });

  it("lists memberships by staff_user_id without active filtering", async () => {
    const client = createFakeClient();
    client.setResult("staff_tenant_memberships", "list", {
      data: [
        createMembershipRow({
          id: "membership_staff",
          tenant_id: "tenant_staff",
          role: "staff",
          status: "archived",
          created_at: "2026-06-14T00:30:00.000Z"
        }),
        createMembershipRow({
          id: "membership_owner",
          tenant_id: "tenant_owner",
          role: "owner",
          status: "active",
          created_at: "2026-06-14T00:10:00.000Z"
        }),
        createMembershipRow({
          id: "membership_other_staff",
          staff_user_id: "staff_other",
          tenant_id: "tenant_other",
          role: "manager",
          status: "active",
          created_at: "2026-06-14T00:05:00.000Z"
        }),
        createMembershipRow({
          id: "membership_manager",
          tenant_id: "tenant_manager",
          role: "manager",
          status: "invited",
          created_at: "2026-06-14T00:20:00.000Z"
        }),
        createMembershipRow({
          id: "membership_disabled",
          tenant_id: "tenant_disabled",
          role: "staff",
          status: "disabled",
          created_at: "2026-06-14T00:40:00.000Z"
        })
      ],
      error: null
    });
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    const memberships = await repository.listMembershipsByStaffUserId(" staff_1 ");

    expect(memberships.map((membership) => membership.id)).toEqual([
      "membership_owner",
      "membership_manager",
      "membership_staff",
      "membership_disabled"
    ]);
    expect(memberships.map(({ role, status }) => ({ role, status }))).toEqual([
      { role: "owner", status: "active" },
      { role: "manager", status: "invited" },
      { role: "staff", status: "archived" },
      { role: "staff", status: "disabled" }
    ]);
    expect(client.operations).toContainEqual({
      table: "staff_tenant_memberships",
      action: "eq",
      column: "staff_user_id",
      value: "staff_1"
    });
    expect(client.operations).toContainEqual({
      table: "staff_tenant_memberships",
      action: "order",
      column: "created_at",
      ascending: true
    });
  });

  it("does not query when staff_user_id is empty", async () => {
    const client = createFakeClient();
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    await expect(repository.listMembershipsByStaffUserId(" ")).resolves.toEqual([]);

    expect(client.operations).toEqual([]);
  });

  it("activates invited memberships through the guarded database function", async () => {
    const client = createFakeClient();
    client.setResult("activate_staff_invited_memberships", "list", {
      data: 1,
      error: null
    });
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    await expect(
      repository.activateInvitedMembershipsForStaffUserId(" staff_1 ")
    ).resolves.toBeUndefined();

    expect(client.operations).toContainEqual({
      table: "activate_staff_invited_memberships",
      action: "rpc",
      value: { target_staff_user_id: "staff_1" }
    });
  });

  it("does not activate memberships for an empty staff_user_id", async () => {
    const client = createFakeClient();
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    await expect(repository.activateInvitedMembershipsForStaffUserId(" ")).resolves.toBeUndefined();

    expect(client.operations).toEqual([]);
  });

  it("wraps staff_users Supabase errors", async () => {
    const client = createFakeClient();
    client.setResult("staff_users", "maybeSingle", {
      data: null,
      error: { message: "database unavailable" }
    });
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    await expect(repository.findStaffByAuthUserId("auth_user_1")).rejects.toThrow(
      SupabaseRepositoryError
    );
  });

  it("wraps staff_tenant_memberships Supabase errors", async () => {
    const client = createFakeClient();
    client.setResult("staff_tenant_memberships", "list", {
      data: null,
      error: { message: "database unavailable" }
    });
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    await expect(repository.listMembershipsByStaffUserId("staff_1")).rejects.toThrow(
      SupabaseRepositoryError
    );
  });

  it("can be passed to resolveAuthenticatedTenantContext", async () => {
    const client = createFakeClient();
    client.setResult("staff_users", "maybeSingle", { data: createStaffRow(), error: null });
    client.setResult("staff_tenant_memberships", "list", {
      data: [
        createMembershipRow({ id: "membership_1", tenant_id: "tenant_amamihome", role: "manager" }),
        createMembershipRow({ id: "membership_2", tenant_id: "tenant_other", role: "owner" })
      ],
      error: null
    });
    const repository = new SupabaseStaffAuthLookupRepository(asRepositoryClient(client));

    const result = await resolveAuthenticatedTenantContext(
      {
        authUserId: "auth_user_1",
        selectedTenantId: "tenant_other"
      },
      repository
    );

    expect(result).toEqual({
      ok: true,
      context: {
        tenantId: "tenant_other",
        staffUserId: "staff_1",
        authUserId: "auth_user_1",
        role: "owner",
        source: "authenticated_staff"
      }
    });
  });
});

function createFakeClient(): FakeSupabaseClient {
  return new FakeSupabaseClient();
}

function asRepositoryClient(client: FakeSupabaseClient): SupabaseRepositoryClient {
  return client as unknown as SupabaseRepositoryClient;
}

function createStaffRow(overrides: Partial<ReturnType<typeof baseStaffRow>> = {}) {
  return {
    ...baseStaffRow(),
    ...overrides
  };
}

function baseStaffRow() {
  return {
    id: "staff_1",
    tenant_id: "tenant_amamihome",
    auth_user_id: "auth_user_1",
    email: "staff@example.test",
    display_name: "Dev Staff",
    role: "owner" as const,
    status: "active" as const,
    line_user_id: null,
    is_active: true,
    last_login_at: null,
    disabled_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now
  };
}

function createMembershipRow(overrides: Partial<StaffTenantMembership> = {}): StaffTenantMembership {
  return {
    id: "membership_1",
    tenant_id: "tenant_amamihome",
    staff_user_id: "staff_1",
    role: "manager",
    status: "active",
    invited_at: null,
    accepted_at: now,
    disabled_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides
  };
}
