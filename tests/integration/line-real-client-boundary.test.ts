import { describe, expect, it } from "vitest";

import {
  FetchLineMessagingTransport,
  LineMessagingApiError,
  MAX_LINE_MESSAGE_CONTENT_BYTES,
  RealLineClient,
  type LineMessageContent,
  type LineMessagingContentRequest,
  type LineMessagingProfileRequest,
  type LineMessagingPushRequest,
  type LineMessagingRichMenuLinkRequest,
  type LineMessagingTransport,
  type LineUserProfile
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

  it("builds LINE profile lookup requests through an injected transport", async () => {
    const transport = new RecordingLineMessagingTransport();
    const client = new RealLineClient({
      channelAccessToken: "test-channel-access-token",
      profileEndpointBase: "https://line.example.invalid/profile/",
      transport
    });

    const profile = await client.getProfile("U_TEST_LINE_TARGET");

    expect(profile).toMatchObject({
      userId: "U_TEST_LINE_TARGET",
      displayName: "実機 太郎"
    });
    expect(transport.profiles).toEqual([
      {
        channelAccessToken: "test-channel-access-token",
        endpoint: "https://line.example.invalid/profile/U_TEST_LINE_TARGET",
        userId: "U_TEST_LINE_TARGET"
      }
    ]);
  });

  it("builds LINE rich menu link requests through an injected transport", async () => {
    const transport = new RecordingLineMessagingTransport();
    const client = new RealLineClient({
      channelAccessToken: "test-channel-access-token",
      richMenuEndpointBase: "https://line.example.invalid/user/",
      transport
    });

    await client.linkRichMenuToUser("U TEST/LINE", "richmenu-test-id");

    expect(transport.richMenuLinks).toEqual([
      {
        channelAccessToken: "test-channel-access-token",
        endpoint: "https://line.example.invalid/user/U%20TEST%2FLINE/richmenu/richmenu-test-id",
        userId: "U TEST/LINE",
        richMenuId: "richmenu-test-id"
      }
    ]);
  });

  it("builds LINE message content requests through an injected transport", async () => {
    const transport = new RecordingLineMessagingTransport();
    const client = new RealLineClient({
      channelAccessToken: "test-channel-access-token",
      contentEndpointBase: "https://line.example.invalid/content/",
      transport
    });

    await expect(client.getMessageContent("message id/1")).resolves.toEqual({
      data: new Uint8Array([1, 2, 3]),
      contentType: "application/octet-stream"
    });
    expect(transport.messageContents).toEqual([
      {
        channelAccessToken: "test-channel-access-token",
        endpoint: "https://line.example.invalid/content/message%20id%2F1/content",
        messageId: "message id/1"
      }
    ]);
  });

  it("parses LINE profile responses through the fetch transport", async () => {
    const transport = new FetchLineMessagingTransport({
      async fetch(input, init) {
        expect(input).toBe("https://line.example.invalid/profile/U_TEST_LINE_TARGET");
        expect(init.method).toBe("GET");
        expect(init.headers).toMatchObject({
          authorization: "Bearer test-channel-access-token"
        });

        return {
          ok: true,
          async text() {
            return JSON.stringify({
              userId: "U_TEST_LINE_TARGET",
              displayName: "実機 太郎",
              pictureUrl: "https://line.example.invalid/profile.png",
              statusMessage: "家づくり相談中",
              language: "ja"
            });
          }
        };
      }
    });

    await expect(
      transport.getProfile({
        channelAccessToken: "test-channel-access-token",
        endpoint: "https://line.example.invalid/profile/U_TEST_LINE_TARGET",
        userId: "U_TEST_LINE_TARGET"
      })
    ).resolves.toEqual({
      userId: "U_TEST_LINE_TARGET",
      displayName: "実機 太郎",
      pictureUrl: "https://line.example.invalid/profile.png",
      statusMessage: "家づくり相談中",
      language: "ja"
    });
  });

  it("links rich menus through the fetch transport without a message body", async () => {
    const transport = new FetchLineMessagingTransport({
      async fetch(input, init) {
        expect(input).toBe(
          "https://line.example.invalid/user/U_TEST_LINE_TARGET/richmenu/richmenu-test-id"
        );
        expect(init.method).toBe("POST");
        expect(init.headers).toMatchObject({
          authorization: "Bearer test-channel-access-token"
        });
        expect(init.body).toBeUndefined();

        return {
          ok: true,
          async text() {
            return "{}";
          }
        };
      }
    });

    await expect(
      transport.linkRichMenuToUser({
        channelAccessToken: "test-channel-access-token",
        endpoint: "https://line.example.invalid/user/U_TEST_LINE_TARGET/richmenu/richmenu-test-id",
        userId: "U_TEST_LINE_TARGET",
        richMenuId: "richmenu-test-id"
      })
    ).resolves.toBeUndefined();
  });

  it("downloads LINE message content through the fetch transport", async () => {
    const transport = new FetchLineMessagingTransport({
      async fetch(input, init) {
        expect(input).toBe("https://line.example.invalid/content/message-1/content");
        expect(init.method).toBe("GET");
        expect(init.headers).toMatchObject({
          authorization: "Bearer test-channel-access-token"
        });

        return {
          ok: true,
          async text() {
            return "";
          },
          async arrayBuffer() {
            return new Uint8Array([4, 5, 6]).buffer;
          },
          headers: {
            get(name: string) {
              return name.toLowerCase() === "content-type" ? "image/png" : null;
            }
          }
        };
      }
    });

    await expect(
      transport.getMessageContent({
        channelAccessToken: "test-channel-access-token",
        endpoint: "https://line.example.invalid/content/message-1/content",
        messageId: "message-1"
      })
    ).resolves.toEqual({
      data: new Uint8Array([4, 5, 6]),
      contentType: "image/png"
    });
  });

  it("rejects oversized LINE message content before reading the response body", async () => {
    let bodyRead = false;
    let bodyCancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        bodyCancelled = true;
      }
    });
    const transport = new FetchLineMessagingTransport({
      async fetch() {
        return {
          ok: true,
          body,
          async text() {
            return "";
          },
          async arrayBuffer() {
            bodyRead = true;
            return new Uint8Array([1]).buffer;
          },
          headers: {
            get(name: string) {
              return name.toLowerCase() === "content-length"
                ? String(MAX_LINE_MESSAGE_CONTENT_BYTES + 1)
                : null;
            }
          }
        };
      }
    });

    await expect(
      transport.getMessageContent({
        channelAccessToken: "test-channel-access-token",
        endpoint: "https://line.example.invalid/content/message-too-large/content",
        messageId: "message-too-large"
      })
    ).rejects.toThrow("LINE message content exceeds the allowed size.");
    expect(bodyRead).toBe(false);
    expect(bodyCancelled).toBe(true);
  });

  it("cancels streamed LINE message content as soon as the actual size exceeds the limit", async () => {
    let bodyCancelled = false;
    let arrayBufferRead = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5]));
      },
      cancel() {
        bodyCancelled = true;
      }
    });
    const transport = new FetchLineMessagingTransport({
      maxMessageContentBytes: 4,
      async fetch() {
        return {
          ok: true,
          body,
          async text() {
            return "";
          },
          async arrayBuffer() {
            arrayBufferRead = true;
            return new Uint8Array([1]).buffer;
          }
        };
      }
    });

    await expect(
      transport.getMessageContent({
        channelAccessToken: "test-channel-access-token",
        endpoint: "https://line.example.invalid/content/message-stream-too-large/content",
        messageId: "message-stream-too-large"
      })
    ).rejects.toThrow("LINE message content exceeds the allowed size.");
    expect(bodyCancelled).toBe(true);
    expect(arrayBufferRead).toBe(false);
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
  readonly profiles: LineMessagingProfileRequest[] = [];
  readonly richMenuLinks: LineMessagingRichMenuLinkRequest[] = [];
  readonly messageContents: LineMessagingContentRequest[] = [];

  async pushMessage(request: LineMessagingPushRequest): Promise<void> {
    this.pushes.push(request);
  }

  async getProfile(request: LineMessagingProfileRequest): Promise<LineUserProfile> {
    this.profiles.push(request);

    return {
      userId: request.userId,
      displayName: "実機 太郎",
      pictureUrl: null,
      statusMessage: null,
      language: null
    };
  }

  async linkRichMenuToUser(request: LineMessagingRichMenuLinkRequest): Promise<void> {
    this.richMenuLinks.push(request);
  }

  async getMessageContent(request: LineMessagingContentRequest): Promise<LineMessageContent> {
    this.messageContents.push(request);
    return {
      data: new Uint8Array([1, 2, 3]),
      contentType: "application/octet-stream"
    };
  }
}
