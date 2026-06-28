import { describe, expect, it } from "vitest";

import {
  formatLineRealPushTargetPreflightResult,
  runLineRealPushTargetPreflight
} from "../../scripts/smoke/line-real-push-target-preflight";

describe("LINE real push target preflight", () => {
  it("selects exactly one recent tenant-scoped target without printing identifiers or message bodies", async () => {
    const result = await runLineRealPushTargetPreflight({
      now: new Date("2026-06-28T05:00:00.000Z"),
      fetch: createCustomerListFetch({
        customers: [
          {
            id: "customer_secret",
            tenant_id: "tenant_amamihome",
            line_user_id: "U_SECRET",
            last_customer_message_at: "2026-06-28T04:55:00.000Z",
            last_message_body: "secret inbound body"
          },
          {
            id: "customer_other_tenant",
            tenant_id: "tenant_other",
            line_user_id: "U_OTHER",
            last_customer_message_at: "2026-06-28T04:56:00.000Z"
          }
        ]
      })
    });
    const output = formatLineRealPushTargetPreflightResult(result);

    expect(output).toContain("line_push_smoke_mode=dry_run");
    expect(output).toContain("target_user_selected=true");
    expect(output).toContain("distinct_target_count=1");
    expect(output).toContain("target_user_id_recorded=false");
    expect(output).toContain("target_message_body_recorded=false");
    expect(output).toContain("outgoing_message_body_recorded=false");
    expect(output).toContain("would_send=false");
    expect(output).toContain("line_send_attempted_once=false");
    expect(output).not.toContain("customer_secret");
    expect(output).not.toContain("U_SECRET");
    expect(output).not.toContain("secret inbound body");
  });

  it("does not select a target when multiple recent targets exist", async () => {
    const result = await runLineRealPushTargetPreflight({
      now: new Date("2026-06-28T05:00:00.000Z"),
      fetch: createCustomerListFetch({
        customers: [
          createRecentCustomer("customer_a"),
          createRecentCustomer("customer_b")
        ]
      })
    });
    const output = formatLineRealPushTargetPreflightResult(result);

    expect(output).toContain("target_user_selected=false");
    expect(output).toContain("distinct_target_count=multiple");
    expect(output).toContain("reason=no_unique_fresh_test_target");
    expect(output).toContain("would_send=false");
  });

  it("does not select old or non-LINE customers", async () => {
    const result = await runLineRealPushTargetPreflight({
      now: new Date("2026-06-28T05:00:00.000Z"),
      fetch: createCustomerListFetch({
        customers: [
          {
            id: "customer_old",
            tenant_id: "tenant_amamihome",
            line_user_id: "U_OLD",
            last_customer_message_at: "2026-06-27T04:55:00.000Z"
          },
          {
            id: "customer_without_line",
            tenant_id: "tenant_amamihome",
            line_user_id: null,
            last_customer_message_at: "2026-06-28T04:55:00.000Z"
          }
        ]
      })
    });
    const output = formatLineRealPushTargetPreflightResult(result);

    expect(output).toContain("target_user_selected=false");
    expect(output).toContain("distinct_target_count=0");
    expect(output).toContain("line_send_attempted_once=false");
  });

  it("keeps execution mode unavailable in Loop 172", async () => {
    const result = await runLineRealPushTargetPreflight({
      fetch: createCustomerListFetch({ customers: [] })
    });
    const output = formatLineRealPushTargetPreflightResult(result);

    expect(result.executeModeImplemented).toBe(false);
    expect(output).toContain("internal_cli_execute_mode_implemented=false");
    expect(output).toContain("line_real_push_enabled_required=true");
    expect(output).toContain("would_send=false");
  });
});

function createRecentCustomer(id: string): Record<string, unknown> {
  return {
    id,
    tenant_id: "tenant_amamihome",
    line_user_id: `U_${id}`,
    last_customer_message_at: "2026-06-28T04:55:00.000Z"
  };
}

function createCustomerListFetch(input: { customers: unknown[] }): typeof fetch {
  return async () =>
    new Response(
      JSON.stringify({
        ok: true,
        tenant_id: "tenant_amamihome",
        customers: input.customers
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
}
