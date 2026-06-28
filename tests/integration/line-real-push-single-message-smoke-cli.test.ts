import { describe, expect, it } from "vitest";

import type { LineClient, LineReplyMessage } from "@amami-line-crm/line";

import {
  formatLineRealPushSingleMessageSmokeResult,
  runLineRealPushSingleMessageSmoke,
  type OneSendLockStore
} from "../../scripts/smoke/line-real-push-single-message-smoke";

describe("LINE real push single-message smoke CLI", () => {
  it("defaults to dry-run and does not send", async () => {
    const lineClient = new FakeLineClient();
    const result = await runLineRealPushSingleMessageSmoke({
      now: fixedNow,
      fetch: createCustomerListFetch({
        customers: [createRecentCustomer()]
      }),
      lineClient,
      lockStore: new FakeLockStore()
    });
    const output = formatLineRealPushSingleMessageSmokeResult(result);

    expect(output).toContain("line_push_smoke_mode=dry_run");
    expect(output).toContain("target_user_selected=true");
    expect(output).toContain("would_send=false");
    expect(output).toContain("line_send_attempted_once=false");
    expect(output).toContain("line_send_result=not_performed");
    expect(lineClient.pushes).toHaveLength(0);
  });

  it("refuses execute without the explicit approval env", async () => {
    const lineClient = new FakeLineClient();
    const result = await runLineRealPushSingleMessageSmoke({
      args: ["--execute"],
      now: fixedNow,
      env: {
        LINE_REAL_PUSH_ENABLED: "true",
        NO_RETRY_NO_BULK_NO_BROADCAST_ACK: "YES",
        ONE_SEND_LOCK_READY: "YES"
      },
      fetch: createCustomerListFetch({
        customers: [createRecentCustomer()]
      }),
      lineClient,
      lockStore: new FakeLockStore()
    });
    const output = formatLineRealPushSingleMessageSmokeResult(result);

    expect(output).toContain("reason=approval_missing");
    expect(output).toContain("line_send_attempted_once=false");
    expect(lineClient.pushes).toHaveLength(0);
  });

  it("refuses execute without no-retry/no-bulk acknowledgement", async () => {
    const lineClient = new FakeLineClient();
    const result = await runLineRealPushSingleMessageSmoke({
      args: ["--execute"],
      now: fixedNow,
      env: {
        LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED: "YES",
        LINE_REAL_PUSH_ENABLED: "true",
        ONE_SEND_LOCK_READY: "YES"
      },
      fetch: createCustomerListFetch({
        customers: [createRecentCustomer()]
      }),
      lineClient,
      lockStore: new FakeLockStore()
    });

    expect(formatLineRealPushSingleMessageSmokeResult(result)).toContain(
      "reason=no_retry_no_bulk_ack_missing"
    );
    expect(lineClient.pushes).toHaveLength(0);
  });

  it("refuses execute when LINE real push is not enabled", async () => {
    const lineClient = new FakeLineClient();
    const result = await runLineRealPushSingleMessageSmoke({
      args: ["--execute"],
      now: fixedNow,
      env: createExecuteEnv({
        LINE_REAL_PUSH_ENABLED: "false"
      }),
      fetch: createCustomerListFetch({
        customers: [createRecentCustomer()]
      }),
      lineClient,
      lockStore: new FakeLockStore()
    });

    expect(formatLineRealPushSingleMessageSmokeResult(result)).toContain(
      "reason=line_real_push_not_enabled"
    );
    expect(lineClient.pushes).toHaveLength(0);
  });

  it("refuses execute when target is missing or ambiguous", async () => {
    const missingTargetResult = await runLineRealPushSingleMessageSmoke({
      args: ["--execute"],
      now: fixedNow,
      env: createExecuteEnv(),
      fetch: createCustomerListFetch({
        customers: []
      }),
      lineClient: new FakeLineClient(),
      lockStore: new FakeLockStore()
    });
    const ambiguousTargetResult = await runLineRealPushSingleMessageSmoke({
      args: ["--execute"],
      now: fixedNow,
      env: createExecuteEnv(),
      fetch: createCustomerListFetch({
        customers: [
          createRecentCustomer({ id: "customer-a", lineUserId: "U_A" }),
          createRecentCustomer({ id: "customer-b", lineUserId: "U_B" })
        ]
      }),
      lineClient: new FakeLineClient(),
      lockStore: new FakeLockStore()
    });

    expect(formatLineRealPushSingleMessageSmokeResult(missingTargetResult)).toContain(
      "reason=no_unique_fresh_test_target"
    );
    expect(formatLineRealPushSingleMessageSmokeResult(ambiguousTargetResult)).toContain(
      "distinct_target_count=multiple"
    );
  });

  it("refuses execute when a send-attempt lock already exists", async () => {
    const lineClient = new FakeLineClient();
    const result = await runLineRealPushSingleMessageSmoke({
      args: ["--execute"],
      now: fixedNow,
      env: createExecuteEnv(),
      fetch: createCustomerListFetch({
        customers: [createRecentCustomer()]
      }),
      lineClient,
      lockStore: new FakeLockStore({ exists: true })
    });
    const output = formatLineRealPushSingleMessageSmokeResult(result);

    expect(output).toContain("reason=send_attempt_lock_exists");
    expect(output).toContain("send_attempt_lock_present=true");
    expect(output).toContain("line_send_attempted_once=false");
    expect(lineClient.pushes).toHaveLength(0);
  });

  it("sends exactly once in execute mode after creating the one-send lock", async () => {
    const lineClient = new FakeLineClient();
    const lockStore = new FakeLockStore();
    const result = await runLineRealPushSingleMessageSmoke({
      args: ["--execute"],
      now: fixedNow,
      env: createExecuteEnv(),
      fetch: createCustomerListFetch({
        customers: [
          createRecentCustomer(),
          createRecentCustomer({
            id: "other-tenant-customer",
            tenantId: "tenant_other",
            lineUserId: "U_OTHER"
          })
        ]
      }),
      lineClient,
      lockStore
    });
    const output = formatLineRealPushSingleMessageSmokeResult(result);

    expect(lineClient.pushes).toHaveLength(1);
    expect(lockStore.createCount).toBe(1);
    expect(output).toContain("line_push_smoke_mode=execute");
    expect(output).toContain("line_send_attempted_once=true");
    expect(output).toContain("line_send_result=success");
    expect(output).toContain("retry_performed=false");
    expect(output).toContain("bulk_multicast_broadcast_group_room=false");
    expect(output).toContain("send_attempt_count=1");
  });

  it("does not retry or print identifiers when LINE send fails after the lock is created", async () => {
    const lineClient = new FakeLineClient({ failPush: true });
    const result = await runLineRealPushSingleMessageSmoke({
      args: ["--execute"],
      now: fixedNow,
      env: createExecuteEnv(),
      fetch: createCustomerListFetch({
        customers: [
          createRecentCustomer({
            id: "secret-customer-id",
            lineUserId: "U_SECRET_TARGET",
            lastMessageBody: "secret inbound text"
          })
        ]
      }),
      lineClient,
      lockStore: new FakeLockStore()
    });
    const output = formatLineRealPushSingleMessageSmokeResult(result);

    expect(lineClient.pushes).toHaveLength(1);
    expect(output).toContain("line_send_attempted_once=true");
    expect(output).toContain("line_send_result=failed");
    expect(output).toContain("retry_performed=false");
    expect(output).not.toContain("secret-customer-id");
    expect(output).not.toContain("U_SECRET_TARGET");
    expect(output).not.toContain("secret inbound text");
  });
});

const fixedNow = new Date("2026-06-28T00:00:00.000Z");

class FakeLockStore implements OneSendLockStore {
  createCount = 0;
  private lockExists: boolean;

  constructor(input: { exists?: boolean } = {}) {
    this.lockExists = input.exists ?? false;
  }

  async exists(): Promise<boolean> {
    return this.lockExists;
  }

  async create(): Promise<void> {
    if (this.lockExists) {
      throw new Error("lock already exists");
    }

    this.lockExists = true;
    this.createCount += 1;
  }
}

class FakeLineClient implements LineClient {
  readonly pushes: Array<{ to: string; messages: LineReplyMessage[] }> = [];
  private readonly failPush: boolean;

  constructor(input: { failPush?: boolean } = {}) {
    this.failPush = input.failPush ?? false;
  }

  async replyMessage(): Promise<void> {
    throw new Error("reply is not used in this smoke");
  }

  async pushMessage(to: string, messages: LineReplyMessage[]): Promise<void> {
    this.pushes.push({ to, messages });

    if (this.failPush) {
      throw new Error("fake LINE send failure");
    }
  }
}

function createExecuteEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED: "YES",
    NO_RETRY_NO_BULK_NO_BROADCAST_ACK: "YES",
    ONE_SEND_LOCK_READY: "YES",
    LINE_REAL_PUSH_ENABLED: "true",
    LINE_CHANNEL_ACCESS_TOKEN: "test_token",
    ...overrides
  };
}

function createRecentCustomer(
  input: {
    id?: string;
    tenantId?: string;
    lineUserId?: string;
    lastMessageBody?: string;
  } = {}
): Record<string, unknown> {
  return {
    id: input.id ?? "customer-one",
    tenant_id: input.tenantId ?? "tenant_amamihome",
    line_user_id: input.lineUserId ?? "U_TARGET_ONE",
    last_customer_message_at: "2026-06-27T23:55:00.000Z",
    last_message_body: input.lastMessageBody ?? null
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
