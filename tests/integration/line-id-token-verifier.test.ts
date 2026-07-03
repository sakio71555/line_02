import { describe, expect, it } from "vitest";

import {
  FetchLineIdTokenVerifier,
  LineIdTokenVerificationError,
  type LineIdTokenVerifyFetch
} from "@amami-line-crm/line";

describe("LINE ID token verifier", () => {
  it("verifies ID token through LINE verify endpoint without exposing token in result", async () => {
    const calls: Array<{ input: string; init: RequestInit }> = [];
    const fakeFetch: LineIdTokenVerifyFetch = async (input, init) => {
      calls.push({ input, init });

      return {
        ok: true,
        async text() {
          return JSON.stringify({
            sub: "U_VERIFY_TEST_USER",
            name: "LINE表示名",
            picture: "https://profile.example.test/image.png",
            email: "customer@example.test",
            aud: "test-line-login-channel"
          });
        }
      };
    };
    const verifier = new FetchLineIdTokenVerifier({
      endpoint: "https://line-verify.example.test/oauth2/v2.1/verify",
      fetch: fakeFetch
    });

    const identity = await verifier.verify({
      idToken: "test-id-token",
      channelId: "test-line-login-channel"
    });

    expect(identity).toEqual({
      userId: "U_VERIFY_TEST_USER",
      displayName: "LINE表示名",
      pictureUrl: "https://profile.example.test/image.png",
      email: "customer@example.test"
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe("https://line-verify.example.test/oauth2/v2.1/verify");
    expect(calls[0].init.method).toBe("POST");
    expect(String(calls[0].init.body)).toContain("id_token=test-id-token");
    expect(String(calls[0].init.body)).toContain("client_id=test-line-login-channel");
    expect(JSON.stringify(identity)).not.toContain("test-id-token");
  });

  it("rejects audience mismatch", async () => {
    const verifier = new FetchLineIdTokenVerifier({
      fetch: async () => ({
        ok: true,
        async text() {
          return JSON.stringify({
            sub: "U_VERIFY_TEST_USER",
            aud: "different-channel"
          });
        }
      })
    });

    await expect(
      verifier.verify({
        idToken: "test-id-token",
        channelId: "expected-channel"
      })
    ).rejects.toBeInstanceOf(LineIdTokenVerificationError);
  });
});
