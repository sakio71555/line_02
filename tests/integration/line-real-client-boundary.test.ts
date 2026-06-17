import { describe, expect, it } from "vitest";

import {
  LineMessagingApiError,
  RealLineClient,
  type LineMessagingPushRequest,
  type LineMessagingTransport
} from "@amami-line-crm/line";

describe("Loop 102 RealLineClient boundary", () => {
  it("builds LINE push payloads through an injected transport without fetching", async () => {
    const transport = new RecordingLineMessagingTransport();
    const client = new RealLineClient({
      channelAccessToken: "test-channel-access-token",
      pushEndpoint: "https://line.example.invalid/push",
      transport
    });

    await client.pushMessage("U_TEST_LINE_TARGET", [
      { type: "text", text: "確認済みの担当者返信です。" }
    ]);

    expect(transport.pushes).toEqual([
      {
        channelAccessToken: "test-channel-access-token",
        endpoint: "https://line.example.invalid/push",
        to: "U_TEST_LINE_TARGET",
        messages: [{ type: "text", text: "確認済みの担当者返信です。" }]
      }
    ]);
  });

  it("redacts transport error details from RealLineClient errors", async () => {
    const client = new RealLineClient({
      channelAccessToken: "test-channel-access-token",
      transport: {
        async pushMessage(): Promise<void> {
          throw new Error("do not leak test-channel-access-token or U_TEST_LINE_TARGET");
        }
      }
    });

    await expect(
      client.pushMessage("U_TEST_LINE_TARGET", [{ type: "text", text: "送信テスト" }])
    ).rejects.toThrow(LineMessagingApiError);

    await expect(
      client.pushMessage("U_TEST_LINE_TARGET", [{ type: "text", text: "送信テスト" }])
    ).rejects.not.toThrow("test-channel-access-token");
  });
});

class RecordingLineMessagingTransport implements LineMessagingTransport {
  readonly pushes: LineMessagingPushRequest[] = [];

  async pushMessage(request: LineMessagingPushRequest): Promise<void> {
    this.pushes.push(request);
  }
}
