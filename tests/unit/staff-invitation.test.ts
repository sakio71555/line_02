import { describe, expect, it, vi } from "vitest";

import { createProductionStaffInvitationService } from "../../apps/api/src/admin/staff-invitation";

describe("production staff invitation service", () => {
  it("stays disabled until both Supabase values are configured", () => {
    expect(createProductionStaffInvitationService({})).toBeUndefined();
    expect(
      createProductionStaffInvitationService({ SUPABASE_URL: "https://project.example.test" })
    ).toBeUndefined();
  });

  it("invites through the configured Supabase Auth endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "auth_user_1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createProductionStaffInvitationService(
      {
        SUPABASE_URL: "https://project.example.test/",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key"
      },
      fetchMock
    );

    await expect(service?.invite("staff@example.test")).resolves.toEqual({
      authUserId: "auth_user_1",
      outcome: "sent"
    });
    expect(fetchMock).toHaveBeenCalledWith("https://project.example.test/auth/v1/invite", {
      method: "POST",
      headers: {
        apikey: "test-service-role-key",
        Authorization: "Bearer test-service-role-key",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: "staff@example.test" })
    });
  });

  it("normalizes invitation input and returned auth identifiers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: "  auth_user_1  " } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createProductionStaffInvitationService(
      {
        SUPABASE_URL: "https://project.example.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key"
      },
      fetchMock
    );

    await expect(service?.invite("  STAFF@example.test  ")).resolves.toEqual({
      authUserId: "auth_user_1",
      outcome: "sent"
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: "staff@example.test"
    });
    await expect(service?.invite("   ")).rejects.toThrow("staff_invitation_invalid_email");
  });

  it("returns sanitized failures for provider and response errors", async () => {
    const providerFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("provider details", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ users: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    const providerFailure = createProductionStaffInvitationService(
      {
        SUPABASE_URL: "https://project.example.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key"
      },
      providerFetch
    );
    const invalidFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ users: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    const invalidResponse = createProductionStaffInvitationService(
      {
        SUPABASE_URL: "https://project.example.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key"
      },
      invalidFetch
    );

    await expect(providerFailure?.invite("staff@example.test")).rejects.toThrow(
      "staff_invitation_failed"
    );
    await expect(invalidResponse?.invite("staff@example.test")).rejects.toThrow(
      "staff_invitation_invalid_response"
    );
  });

  it("reconciles an existing auth user after an ambiguous invitation failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("already invited", { status: 422 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            users: [
              { id: "auth_other", email: "other@example.test" },
              { id: "auth_staff_1", email: "STAFF@example.test" }
            ]
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      );
    const service = createProductionStaffInvitationService(
      {
        SUPABASE_URL: "https://project.example.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key"
      },
      fetchMock
    );

    await expect(service?.invite("staff@example.test")).resolves.toEqual({
      authUserId: "auth_staff_1",
      outcome: "reconciled"
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reconciles after an interrupted invitation request", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network details must stay private"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ users: [{ id: "  auth_staff_1  ", email: "staff@example.test" }] }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      );
    const service = createProductionStaffInvitationService(
      {
        SUPABASE_URL: "https://project.example.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key"
      },
      fetchMock
    );

    await expect(service?.invite("staff@example.test")).resolves.toEqual({
      authUserId: "auth_staff_1",
      outcome: "reconciled"
    });
  });

  it("keeps network failures sanitized when reconciliation is unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("invite network details"))
      .mockRejectedValueOnce(new Error("lookup network details"));
    const service = createProductionStaffInvitationService(
      {
        SUPABASE_URL: "https://project.example.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key"
      },
      fetchMock
    );

    await expect(service?.invite("staff@example.test")).rejects.toThrow(
      "staff_invitation_failed"
    );
  });

  it("searches subsequent auth user pages when reconciling an existing invitation", async () => {
    const firstPageUsers = Array.from({ length: 200 }, (_, index) => ({
      id: `auth_other_${index}`,
      email: `other-${index}@example.test`
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("already invited", { status: 422 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ users: firstPageUsers, next_page: 2, last_page: 2 }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            users: [{ id: "auth_staff_1", email: "staff@example.test" }],
            last_page: 2
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      );
    const service = createProductionStaffInvitationService(
      {
        SUPABASE_URL: "https://project.example.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key"
      },
      fetchMock
    );

    await expect(service?.invite("staff@example.test")).resolves.toEqual({
      authUserId: "auth_staff_1",
      outcome: "reconciled"
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("page=2");
  });
});
