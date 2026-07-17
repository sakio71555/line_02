import { describe, expect, it } from "vitest";

import {
  applyCustomRichMenu,
  applyDefaultRichMenu,
  applyLifecycleRichMenus,
  buildRichMenuDefinitionForApply,
  CUSTOMER_REGISTRATION_ENDPOINT,
  formatCustomLineRichMenuApplyResult,
  formatLineRichMenuDryRunResult,
  formatLineRichMenuLifecycleApplyResult,
  formatLineRichMenuRemoveDefaultResult,
  removeDefaultRichMenu,
  runCustomLineRichMenuDryRun,
  runLineRichMenuDryRun,
  validateRichMenuDefinition
} from "../../scripts/ops/line_rich_menu_operator";

describe("LINE rich menu operator", () => {
  it("keeps the default rich menu asset valid with production message and uri actions", async () => {
    const result = await runLineRichMenuDryRun();
    const output = formatLineRichMenuDryRunResult(result);

    expect(result.validationPassed).toBe(true);
    expect(result.areaCount).toBe(6);
    expect(result.messageActionCount).toBe(5);
    expect(result.uriActionCount).toBe(1);
    expect(output).toContain("line_api_called=false");
    expect(output).toContain("line_send_attempted=false");
    expect(output).toContain("secret_recorded=false");
    expect(output).toContain("rich_menu_id_recorded=false");
    expect(output).toContain("message_action_count=5");
    expect(output).toContain("uri_action_count=1");
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
      liffId: "1234567890-testLiff",
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
      menuType: "default",
      liffUrlApplied: true,
      liffIdRecorded: false,
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
    expect(JSON.stringify(result)).not.toContain("1234567890-testLiff");

    const createBody = JSON.parse(String(calls[0]?.init.body ?? "{}")) as {
      areas: Array<{ action: { type: string; label: string; uri?: string; text?: string } }>;
    };
    const registrationAction = createBody.areas.find(
      (area) => area.action.type === "uri" && area.action.label === "お客様情報登録"
    )?.action;
    const modelHouseAction = createBody.areas.find(
      (area) => area.action.type === "message" && area.action.label === "モデルハウス見学予約"
    )?.action;
    const homeBuildingConsultationAction = createBody.areas.find(
      (area) => area.action.type === "message" && area.action.label === "家づくり相談"
    )?.action;
    const worksAction = createBody.areas.find(
      (area) => area.action.type === "message" && area.action.label === "施工事例を見る"
    )?.action;
    const catalogRequestAction = createBody.areas.find(
      (area) => area.action.type === "message" && area.action.label === "資料請求"
    )?.action;
    expect(registrationAction?.uri).toBe("https://liff.line.me/1234567890-testLiff");
    expect(modelHouseAction).toEqual({
      type: "message",
      label: "モデルハウス見学予約",
      text: "モデルハウス見学予約"
    });
    expect(homeBuildingConsultationAction).toEqual({
      type: "message",
      label: "家づくり相談",
      text: "家づくり相談"
    });
    expect(worksAction).toEqual({
      type: "message",
      label: "施工事例を見る",
      text: "施工事例を見る"
    });
    expect(catalogRequestAction).toEqual({
      type: "message",
      label: "資料請求",
      text: "資料請求"
    });
    expect(JSON.stringify(createBody)).not.toContain(CUSTOMER_REGISTRATION_ENDPOINT);
  });

  it("applies lifecycle rich menus without exposing tokens or created IDs", async () => {
    const calls: Array<{ input: string; init: RequestInit }> = [];
    let createCount = 0;
    const result = await applyLifecycleRichMenus({
      channelAccessToken: "test-channel-access-token",
      liffId: "1234567890-testLiff",
      async fetchImplementation(input, init) {
        calls.push({ input: String(input), init });

        if (String(input).endsWith("/v2/bot/richmenu")) {
          createCount += 1;
          return new Response(JSON.stringify({ richMenuId: `richmenu-lifecycle-${createCount}` }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }

        return new Response("{}", { status: 200 });
      }
    });
    const output = formatLineRichMenuLifecycleApplyResult(result);

    expect(result).toEqual({
      createRichMenuStatus: "success",
      uploadImageStatus: "success",
      setDefaultStatus: "success",
      lifecycleMenuCount: 3,
      defaultMenuType: "initial",
      initialRichMenuCreated: true,
      negotiationRichMenuCreated: true,
      aftercareRichMenuCreated: true,
      richMenuEnvOutputWritten: false,
      liffUrlApplied: true,
      liffIdRecorded: false,
      richMenuIdRecorded: false,
      lineSendAttempted: false,
      secretRecorded: false
    });
    expect(calls.map((call) => call.input)).toEqual([
      "https://api.line.me/v2/bot/richmenu",
      "https://api-data.line.me/v2/bot/richmenu/richmenu-lifecycle-1/content",
      "https://api.line.me/v2/bot/richmenu",
      "https://api-data.line.me/v2/bot/richmenu/richmenu-lifecycle-2/content",
      "https://api.line.me/v2/bot/richmenu",
      "https://api-data.line.me/v2/bot/richmenu/richmenu-lifecycle-3/content",
      "https://api.line.me/v2/bot/user/all/richmenu/richmenu-lifecycle-1"
    ]);
    expect(output).toContain("line_rich_menu_operator_mode=apply_lifecycle");
    expect(output).toContain("lifecycle_menu_count=3");
    expect(output).toContain("initial_rich_menu_created=true");
    expect(output).toContain("negotiation_rich_menu_created=true");
    expect(output).toContain("aftercare_rich_menu_created=true");
    expect(output).toContain("default_menu_type=initial");
    expect(output).toContain("rich_menu_id_recorded=false");
    expect(output).not.toContain("richmenu-lifecycle");
    expect(output).not.toContain("test-channel-access-token");
    expect(output).not.toContain("1234567890-testLiff");

    const createBodies = calls
      .filter((call) => call.input === "https://api.line.me/v2/bot/richmenu")
      .map((call) => JSON.parse(String(call.init.body ?? "{}")) as { name: string });
    expect(createBodies.map((body) => body.name)).toEqual([
      "初期メニュー",
      "商談中メニュー",
      "アフターメニュー"
    ]);
  });

  it("validates a repository-contained custom rich menu without calling LINE", async () => {
    const result = await runCustomLineRichMenuDryRun(
      process.cwd(),
      "deploy/line/rich-menu/amamihome-initial"
    );
    const output = formatLineRichMenuDryRunResult(result);

    expect(result.menuType).toBe("custom");
    expect(result.validationPassed).toBe(true);
    expect(result.definitionAvailable).toBe(true);
    expect(result.imageAvailable).toBe(true);
    expect(result.areaCount).toBe(6);
    expect(result.lineApiCalled).toBe(false);
    expect(output).toContain("menu_type=custom");
    expect(output).toContain("line_api_called=false");
  });

  it("rejects custom rich menu asset paths outside the repository", async () => {
    await expect(runCustomLineRichMenuDryRun(process.cwd(), "../outside-assets")).rejects.toThrow(
      "rich_menu_asset_directory_outside_repo"
    );
    await expect(runCustomLineRichMenuDryRun(process.cwd(), "/absolute/assets")).rejects.toThrow(
      "rich_menu_asset_directory_invalid"
    );
  });

  it("applies a custom rich menu without changing the default unless explicitly requested", async () => {
    const calls: Array<{ input: string; init: RequestInit }> = [];
    const result = await applyCustomRichMenu({
      assetDirectory: "deploy/line/rich-menu/amamihome-initial",
      channelAccessToken: "test-channel-access-token",
      async fetchImplementation(input, init) {
        calls.push({ input: String(input), init });

        if (String(input).endsWith("/v2/bot/richmenu")) {
          return new Response(JSON.stringify({ richMenuId: "richmenu-custom-id" }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }

        return new Response("{}", { status: 200 });
      }
    });
    const output = formatCustomLineRichMenuApplyResult(result);

    expect(result).toEqual({
      createRichMenuStatus: "success",
      uploadImageStatus: "success",
      setDefaultStatus: "skipped",
      assetDirectoryValidated: true,
      richMenuIdRecorded: false,
      lineSendAttempted: false,
      secretRecorded: false
    });
    expect(calls.map((call) => call.input)).toEqual([
      "https://api.line.me/v2/bot/richmenu",
      "https://api-data.line.me/v2/bot/richmenu/richmenu-custom-id/content"
    ]);
    expect(output).toContain("set_default_rich_menu_status=skipped");
    expect(output).not.toContain("richmenu-custom-id");
    expect(output).not.toContain("test-channel-access-token");
  });

  it("blocks custom rich menu apply before any LINE API call when preflight fails", async () => {
    const calls: string[] = [];

    await expect(
      applyCustomRichMenu({
        assetDirectory: "tests/fixtures/line-rich-menu-invalid",
        channelAccessToken: "test-channel-access-token",
        async fetchImplementation(input) {
          calls.push(String(input));
          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("rich_menu_custom_preflight_failed");

    expect(calls).toEqual([]);
  });

  it("changes the default custom rich menu only with the explicit option", async () => {
    const calls: string[] = [];
    const result = await applyCustomRichMenu({
      assetDirectory: "deploy/line/rich-menu/amamihome-initial",
      channelAccessToken: "test-channel-access-token",
      setDefault: true,
      async fetchImplementation(input) {
        const requestUrl = String(input);
        calls.push(requestUrl);

        if (requestUrl.endsWith("/v2/bot/richmenu")) {
          return new Response(JSON.stringify({ richMenuId: "richmenu-custom-default-id" }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }

        return new Response("{}", { status: 200 });
      }
    });

    expect(result.setDefaultStatus).toBe("success");
    expect(calls).toEqual([
      "https://api.line.me/v2/bot/richmenu",
      "https://api-data.line.me/v2/bot/richmenu/richmenu-custom-default-id/content",
      "https://api.line.me/v2/bot/user/all/richmenu/richmenu-custom-default-id"
    ]);
  });

  it("builds apply definitions with LIFF URLs while keeping source definitions unchanged", async () => {
    const source = await runLineRichMenuDryRun();
    expect(source.validationPassed).toBe(true);

    const definition = buildRichMenuDefinitionForApply(
      {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: "test",
        chatBarText: "メニュー",
        areas: Array.from({ length: 6 }, (_, index) => ({
          bounds: {
            x: index % 3 === 0 ? 0 : index % 3 === 1 ? 833 : 1666,
            y: index < 3 ? 0 : 843,
            width: index % 3 === 2 ? 834 : 833,
            height: 843
          },
          action:
            index === 0
              ? {
                  type: "uri" as const,
                  label: "お客様情報登録",
                  uri: CUSTOMER_REGISTRATION_ENDPOINT
                }
              : {
                  type: "message" as const,
                  label: "担当者に相談",
                  text: "担当者に相談"
                }
        }))
      },
      "1234567890-testLiff"
    );

    expect(definition.areas[0]?.action).toEqual({
      type: "uri",
      label: "お客様情報登録",
      uri: "https://liff.line.me/1234567890-testLiff"
    });
  });

  it("removes the default rich menu without exposing token or rich menu ID", async () => {
    const calls: Array<{ input: string; init: RequestInit }> = [];
    const result = await removeDefaultRichMenu({
      channelAccessToken: "test-channel-access-token",
      async fetchImplementation(input, init) {
        calls.push({ input: String(input), init });
        return new Response("{}", { status: 200 });
      }
    });
    const output = formatLineRichMenuRemoveDefaultResult(result);

    expect(result).toEqual({
      removeDefaultRichMenuStatus: "success",
      richMenuIdRecorded: false,
      lineSendAttempted: false,
      secretRecorded: false
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("https://api.line.me/v2/bot/user/all/richmenu");
    expect(calls[0]?.init.method).toBe("DELETE");
    expect(output).toContain("line_rich_menu_operator_mode=remove_default");
    expect(output).toContain("remove_default_rich_menu_status=success");
    expect(output).toContain("line_send_attempted=false");
    expect(output).toContain("secret_recorded=false");
    expect(output).not.toContain("test-channel-access-token");
  });
});
