import { describe, expect, it, vi } from "vitest";

import {
  InMemoryOperationsRepository,
  type StaffManagementRecord
} from "@amami-line-crm/domain";

import type { StaffInvitationService } from "../../apps/api/src/admin/staff-invitation";
import { createApiApp } from "../../apps/api/src/index";

const tenantId = "tenant_amamihome";
const now = "2026-07-18T02:00:00.000Z";

describe("admin staff management API", () => {
  it("forces the first tenant staff member to owner and returns sanitized data", async () => {
    const repository = new InMemoryOperationsRepository();
    const invitationService: StaffInvitationService = {
      invite: vi.fn().mockResolvedValue({ authUserId: "auth_staff_1", outcome: "sent" })
    };
    const app = createTestApp(repository, invitationService);

    const createResponse = await app.fetch(
      staffRequest("/api/admin/staff", "POST", {
        display_name: "山田 花子",
        email: "HANAKO@example.test",
        role: "staff"
      })
    );
    const created = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(invitationService.invite).toHaveBeenCalledWith("hanako@example.test");
    expect(created).toMatchObject({
      ok: true,
      tenant_id: tenantId,
      invitation_status: "sent",
      staff_member: {
        tenant_id: tenantId,
        display_name: "山田 花子",
        email: "hanako@example.test",
        role: "owner",
        status: "active",
        membership_status: "invited",
        auth_linked: true,
        line_linked: false
      }
    });
    expect(created.staff_member).not.toHaveProperty("auth_user_id");
    expect(created.staff_member).not.toHaveProperty("line_user_id");

    const listResponse = await app.fetch(staffRequest("/api/admin/staff"));
    const listed = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listed.staff).toEqual([created.staff_member]);
    await expect(repository.listStaffMembers(tenantId)).resolves.toEqual([]);
  });

  it("preserves the requested role after the first tenant owner exists", async () => {
    const repository = new InMemoryOperationsRepository();
    const app = createTestApp(repository);

    const firstResponse = await app.fetch(
      staffRequest("/api/admin/staff", "POST", {
        display_name: "最初の管理者",
        email: "owner@example.test",
        role: "staff"
      })
    );
    const secondResponse = await app.fetch(
      staffRequest("/api/admin/staff", "POST", {
        display_name: "二人目の担当者",
        email: "staff@example.test",
        role: "staff"
      })
    );

    expect(firstResponse.status).toBe(201);
    await expect(firstResponse.json()).resolves.toMatchObject({
      staff_member: { role: "owner" }
    });
    expect(secondResponse.status).toBe(201);
    await expect(secondResponse.json()).resolves.toMatchObject({
      staff_member: { role: "staff" }
    });
  });

  it("keeps a failed invitation as an explicit pending record", async () => {
    const repository = new InMemoryOperationsRepository();
    const invitationService: StaffInvitationService = {
      invite: vi.fn().mockRejectedValue(new Error("provider unavailable"))
    };
    const app = createTestApp(repository, invitationService);

    const response = await app.fetch(
      staffRequest("/api/admin/staff", "POST", {
        display_name: "招待待ち担当",
        email: "pending@example.test",
        role: "manager"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      invitation_status: "failed",
      staff_member: {
        membership_status: "invited",
        auth_linked: false
      }
    });
    await expect(repository.listStaffMembers(tenantId)).resolves.toEqual([]);
    await expect(repository.listStaffManagementRecords(tenantId)).resolves.toHaveLength(1);
  });

  it("reports a failed create invitation state save without claiming success", async () => {
    const repository = new InMemoryOperationsRepository();
    vi.spyOn(repository, "saveStaffManagementRecord").mockRejectedValueOnce(
      new Error("repository unavailable")
    );
    const invitationService: StaffInvitationService = {
      invite: vi.fn().mockResolvedValue({ authUserId: "auth_pending", outcome: "sent" })
    };
    const app = createTestApp(repository, invitationService);

    const response = await app.fetch(
      staffRequest("/api/admin/staff", "POST", {
        display_name: "保存待ち担当",
        email: "save-pending@example.test",
        role: "staff"
      })
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "staff_invitation_state_save_failed"
    });
    await expect(repository.listStaffManagementRecords(tenantId)).resolves.toMatchObject([
      {
        staff_user: { auth_user_id: null },
        membership: { status: "invited", accepted_at: null }
      }
    ]);
  });

  it("rejects duplicate email addresses without case sensitivity", async () => {
    const repository = new InMemoryOperationsRepository();
    const app = createTestApp(repository);

    const first = await app.fetch(
      staffRequest("/api/admin/staff", "POST", {
        display_name: "最初の担当者",
        email: "staff@example.test",
        role: "staff"
      })
    );
    const duplicate = await app.fetch(
      staffRequest("/api/admin/staff", "POST", {
        display_name: "重複担当者",
        email: "STAFF@EXAMPLE.TEST",
        role: "staff"
      })
    );

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    await expect(duplicate.json()).resolves.toEqual({
      ok: false,
      error: "staff_email_already_registered"
    });
  });

  it("requires an active owner to remain", async () => {
    const owner = createStaffRecord({ id: "staff_owner", role: "owner" });
    const repository = new InMemoryOperationsRepository({ staffManagement: [owner] });
    const app = createTestApp(repository);

    const disableResponse = await app.fetch(
      staffRequest("/api/admin/staff/staff_owner", "PATCH", { is_active: false })
    );
    const demoteResponse = await app.fetch(
      staffRequest("/api/admin/staff/staff_owner", "PATCH", { role: "manager" })
    );

    expect(disableResponse.status).toBe(409);
    await expect(disableResponse.json()).resolves.toEqual({
      ok: false,
      error: "last_owner_must_remain_active"
    });
    expect(demoteResponse.status).toBe(409);
    await expect(demoteResponse.json()).resolves.toEqual({
      ok: false,
      error: "last_owner_must_remain_active"
    });
  });

  it("does not let invitation resend silently reactivate a disabled member", async () => {
    const member = createStaffRecord({ id: "staff_disabled", role: "staff" });
    member.staff_user.status = "disabled";
    member.staff_user.is_active = false;
    member.staff_user.disabled_at = now;
    member.membership.status = "disabled";
    member.membership.disabled_at = now;
    const repository = new InMemoryOperationsRepository({ staffManagement: [member] });
    const invitationService: StaffInvitationService = {
      invite: vi.fn().mockResolvedValue({ authUserId: "auth_disabled", outcome: "sent" })
    };
    const app = createTestApp(repository, invitationService);

    const response = await app.fetch(
      staffRequest("/api/admin/staff/staff_disabled/invite", "POST")
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "staff_member_disabled"
    });
    expect(invitationService.invite).not.toHaveBeenCalled();
  });

  it("keeps staff management records isolated by tenant", async () => {
    const own = createStaffRecord({ id: "staff_own", role: "staff" });
    const other = createStaffRecord({
      id: "staff_other",
      role: "owner",
      tenantId: "tenant_other"
    });
    const repository = new InMemoryOperationsRepository({ staffManagement: [own, other] });
    const app = createTestApp(repository);

    const response = await app.fetch(staffRequest("/api/admin/staff"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.staff).toHaveLength(1);
    expect(body.staff[0]).toMatchObject({ id: "staff_own", tenant_id: tenantId });
  });

  it("reuses an accepted identity without changing another tenant membership", async () => {
    const existing = createStaffRecord({
      id: "staff_shared",
      role: "manager",
      tenantId: "tenant_other"
    });
    existing.staff_user.email = "shared@example.test";
    const repository = new InMemoryOperationsRepository({ staffManagement: [existing] });
    const invitationService: StaffInvitationService = {
      invite: vi.fn()
    };
    const app = createTestApp(repository, invitationService);

    const response = await app.fetch(
      staffRequest("/api/admin/staff", "POST", {
        display_name: "共有担当者",
        email: "SHARED@example.test",
        role: "staff"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      invitation_status: "not_required",
      staff_member: {
        id: "staff_shared",
        tenant_id: tenantId,
        role: "owner",
        membership_status: "active",
        auth_linked: true
      }
    });
    expect(invitationService.invite).not.toHaveBeenCalled();
    await expect(repository.listStaffMembers("tenant_other")).resolves.toMatchObject([
      { id: "staff_shared", role: "manager", is_active: true }
    ]);
    await expect(repository.listStaffMembers(tenantId)).resolves.toMatchObject([
      { id: "staff_shared", role: "owner", is_active: true }
    ]);
  });

  it("prefers an authenticated identity when legacy duplicate emails exist", async () => {
    const unlinked = createStaffRecord({
      id: "staff_unlinked",
      role: "staff",
      tenantId: "tenant_legacy"
    });
    unlinked.staff_user.email = "shared@example.test";
    unlinked.staff_user.auth_user_id = null;
    unlinked.membership.status = "invited";
    unlinked.membership.accepted_at = null;

    const linked = createStaffRecord({
      id: "staff_linked",
      role: "manager",
      tenantId: "tenant_existing"
    });
    linked.staff_user.email = "shared@example.test";

    const repository = new InMemoryOperationsRepository({
      staffManagement: [unlinked, linked]
    });
    const invitationService: StaffInvitationService = { invite: vi.fn() };
    const app = createTestApp(repository, invitationService);

    const response = await app.fetch(
      staffRequest("/api/admin/staff", "POST", {
        display_name: "共有担当者",
        email: "SHARED@example.test",
        role: "staff"
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      invitation_status: "not_required",
      staff_member: {
        id: "staff_linked",
        tenant_id: tenantId,
        membership_status: "active",
        auth_linked: true
      }
    });
    expect(invitationService.invite).not.toHaveBeenCalled();
  });

  it("rejects linking one auth account to two staff identities", async () => {
    const first = createStaffRecord({ id: "staff_first", role: "staff" });
    const second = createStaffRecord({
      id: "staff_second",
      role: "staff",
      tenantId: "tenant_other"
    });
    second.staff_user.auth_user_id = null;
    const repository = new InMemoryOperationsRepository({
      staffManagement: [first, second]
    });

    second.staff_user.auth_user_id = first.staff_user.auth_user_id;

    await expect(repository.saveStaffManagementRecord(second)).rejects.toThrow(
      "staff_auth_user_already_linked"
    );
  });

  it("does not count an unaccepted owner invitation as the remaining active owner", async () => {
    const activeOwner = createStaffRecord({ id: "staff_owner", role: "owner" });
    const invitedOwner = createStaffRecord({ id: "staff_invited_owner", role: "owner" });
    invitedOwner.staff_user.auth_user_id = "auth_invited_owner";
    invitedOwner.membership.status = "invited";
    invitedOwner.membership.accepted_at = null;
    const repository = new InMemoryOperationsRepository({
      staffManagement: [activeOwner, invitedOwner]
    });
    const app = createTestApp(repository);

    const response = await app.fetch(
      staffRequest("/api/admin/staff/staff_owner", "PATCH", { is_active: false })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "last_owner_must_remain_active"
    });
  });

  it("enforces the last-owner rule inside the repository write boundary", async () => {
    const owner = createStaffRecord({ id: "staff_owner", role: "owner" });
    const repository = new InMemoryOperationsRepository({ staffManagement: [owner] });

    await expect(
      repository.saveStaffManagementRecord({
        staff_user: owner.staff_user,
        membership: {
          ...owner.membership,
          role: "manager"
        }
      })
    ).rejects.toThrow("last_owner_must_remain_active");
  });

  it("maps a database last-owner conflict to a stable API response", async () => {
    const firstOwner = createStaffRecord({ id: "staff_owner_1", role: "owner" });
    const secondOwner = createStaffRecord({ id: "staff_owner_2", role: "owner" });
    const repository = new InMemoryOperationsRepository({
      staffManagement: [firstOwner, secondOwner]
    });
    vi.spyOn(repository, "saveStaffManagementRecord").mockRejectedValueOnce(
      Object.assign(new Error("repository write rejected"), {
        causeError: { code: "P0001" }
      })
    );
    const app = createTestApp(repository);

    const response = await app.fetch(
      staffRequest("/api/admin/staff/staff_owner_1", "PATCH", { role: "manager" })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "last_owner_must_remain_active"
    });
  });

  it("rejects updates to archived staff members", async () => {
    const archived = createStaffRecord({ id: "staff_archived", role: "staff" });
    archived.staff_user.status = "archived";
    archived.staff_user.is_active = false;
    archived.staff_user.archived_at = now;
    archived.membership.status = "archived";
    archived.membership.archived_at = now;
    const repository = new InMemoryOperationsRepository({ staffManagement: [archived] });
    const app = createTestApp(repository);

    const response = await app.fetch(
      staffRequest("/api/admin/staff/staff_archived", "PATCH", { is_active: true })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "staff_member_archived"
    });
  });

  it("reports a failed invitation state save without pretending the invite completed", async () => {
    const invited = createStaffRecord({ id: "staff_invited", role: "staff" });
    invited.staff_user.auth_user_id = null;
    invited.membership.status = "invited";
    invited.membership.accepted_at = null;
    const repository = new InMemoryOperationsRepository({ staffManagement: [invited] });
    vi.spyOn(repository, "saveStaffManagementRecord").mockRejectedValueOnce(
      new Error("repository unavailable")
    );
    const invitationService: StaffInvitationService = {
      invite: vi.fn().mockResolvedValue({ authUserId: "auth_invited", outcome: "sent" })
    };
    const app = createTestApp(repository, invitationService);

    const response = await app.fetch(
      staffRequest("/api/admin/staff/staff_invited/invite", "POST")
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "staff_invitation_state_save_failed"
    });
  });
});

function createTestApp(
  repository: InMemoryOperationsRepository,
  invitationService?: StaffInvitationService
) {
  return createApiApp({
    operationsRepository: repository,
    ...(invitationService ? { staffInvitationService: invitationService } : {}),
    now: () => now,
    env: {
      TENANT_ID: tenantId,
      TENANT_SLUG: "amamihome",
      LINE_CHANNEL_SECRET: "test-secret"
    }
  });
}

function staffRequest(
  pathname: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: Record<string, unknown>
) {
  return new Request(`http://localhost${pathname}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-tenant-id": tenantId
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function createStaffRecord(input: {
  id: string;
  role: "owner" | "manager" | "staff";
  tenantId?: string;
}): StaffManagementRecord {
  const recordTenantId = input.tenantId ?? tenantId;
  return {
    staff_user: {
      id: input.id,
      tenant_id: recordTenantId,
      auth_user_id: `auth_${input.id}`,
      email: `${input.id}@example.test`,
      display_name: input.id,
      role: input.role,
      status: "active",
      line_user_id: null,
      is_active: true,
      last_login_at: null,
      disabled_at: null,
      archived_at: null,
      created_at: now,
      updated_at: now
    },
    membership: {
      id: `membership_${input.id}`,
      tenant_id: recordTenantId,
      staff_user_id: input.id,
      role: input.role,
      status: "active",
      invited_at: now,
      accepted_at: now,
      disabled_at: null,
      archived_at: null,
      created_at: now,
      updated_at: now
    }
  };
}
