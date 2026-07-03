import { describe, expect, it } from "vitest";

import {
  applyDefaultRichMenu,
  formatLineRichMenuDryRunResult,
  runLineRichMenuDryRun,
  validateRichMenuDefinition
} from "../../scripts/ops/line_rich_menu_operator";

describe("LINE rich menu operator", () => {
  it("keeps the default rich menu asset valid with production message and uri actions", async () => {
    const result = await runLineRichMenuDryRun();
    const output = formatLineRichMenuDryRunResult(result);

    expect(result.validationPassed).toBe(true);
    expect(result.areaCount).toBe(6);
    expect(result.messageActionCount).toBe(1);
    expect(result.uriActionCount).toBe(5);
    expect(output).toContain("line_api_called=false");
    expect(output).toContain("line_send_attempted=false");
    expect(output).toContain("secret_recorded=false");
    expect(output).toContain("rich_menu_id_recorded=false");
    expect(output).toContain("message_action_count=1");
    expect(output).toContain("uri_action_count=5");
    expect(output).not.toContain("LINE_CHANNEL_ACCESS_TOKEN=");
  });

  it("rejects invalid rich menu geometry before LINE API calls", () => {
    const errors = validateRichMenuDefinition({
      size: {
        width: 2500,
        height: 1686
      },
      selected: true,
      name: "invalid test",
      chatBarText: "メニュー",
      areas: [
        {
          bounds: {
            x: 2490,
            y: 0,
            width: 40,
            height: 40
          },
          action: {
            type: "message",
            label: "invalid",
            text: "invalid"
          }
        }
      ]
    });

    expect(errors).toContain("area_count_must_be_6");
    expect(errors).toContain("area_bounds_x_out_of_range");
  });

  it("rejects non-https uri actions before LINE API calls", () => {
    const errors = validateRichMenuDefinition({
      size: {
        width: 2500,
        height: 1686
      },
      selected: true,
      name: "invalid uri test",
      chatBarText: "メニュー",
      areas: Array.from({ length: 6 }, (_, index) => ({
        bounds: {
          x: index % 3 === 0 ? 0 : index % 3 === 1 ? 833 : 1666,
          y: index < 3 ? 0 : 843,
          width: index % 3 === 2 ? 834 : 833,
          height: 843
        },
        action: {
          type: "uri",
          label: "invalid",
          uri: "http://example.test"
        }
      }))
    });

    expect(errors).toContain("area_action_uri_must_be_https");
  });

  it("applies through rich menu endpoints without exposing token or rich menu ID", async () => {
    const calls: Array<{ input: string; init: RequestInit }> = [];
    const result = await applyDefaultRichMenu({
      channelAccessToken: "test-channel-access-token",
      async fetchImplementation(input, init) {
        calls.push({ input: String(input), init });

        if (String(input).endsWith("/v2/bot/richmenu")) {
          return new Response(JSON.stringify({ richMenuId: "richmenu-test-id" }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }

        return new Response("{}", { status: 200 });
      }
    });

    expect(result).toEqual({
      createRichMenuStatus: "success",
      uploadImageStatus: "success",
      setDefaultStatus: "success",
      richMenuIdRecorded: false,
      lineSendAttempted: false,
      secretRecorded: false
    });
    expect(calls.map((call) => call.input)).toEqual([
      "https://api.line.me/v2/bot/richmenu",
      "https://api-data.line.me/v2/bot/richmenu/richmenu-test-id/content",
      "https://api.line.me/v2/bot/user/all/richmenu/richmenu-test-id"
    ]);
    expect(JSON.stringify(result)).not.toContain("richmenu-test-id");
    expect(JSON.stringify(result)).not.toContain("test-channel-access-token");
  });
});
