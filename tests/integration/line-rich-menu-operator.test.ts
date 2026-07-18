import { describe, expect, it } from "vitest";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  applyCustomRichMenu,
  applyDefaultRichMenu,
  applyLifecycleRichMenus,
  buildRichMenuDefinitionForApply,
  CUSTOMER_REGISTRATION_ENDPOINT,
  formatCustomLineRichMenuApplyResult,
  formatLineRichMenuDryRunResult,
  formatLineRichMenuLifecycleApplyResult,
  formatLineRichMenuOperatorFailure,
  formatLineRichMenuRemoveDefaultResult,
  removeDefaultRichMenu,
  runCustomLineRichMenuDryRun,
  runLineRichMenuDryRun,
  validateRichMenuDefinition,
  writeEnvironmentOutput
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

  it("deletes the default rich menu when setting it as default fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];

    await expect(
      applyDefaultRichMenu({
        channelAccessToken: "test-channel-access-token",
        liffId: "1234567890-testLiff",
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-default-cleanup" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }
          if (url.includes("/v2/bot/user/all/richmenu/")) {
            return new Response("{}", { status: 500 });
          }
          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("rich_menu_set_default_failed");

    expect(calls.at(-1)).toEqual({
      url: "https://api.line.me/v2/bot/richmenu/richmenu-default-cleanup",
      method: "DELETE"
    });
  });

  it("applies lifecycle rich menus without exposing tokens or created IDs", async () => {
    const calls: Array<{ input: string; init: RequestInit }> = [];
    const outputWrites: Array<{ outputPath: string; menuCount: number }> = [];
    let createCount = 0;
    const result = await applyLifecycleRichMenus({
      channelAccessToken: "test-channel-access-token",
      liffId: "1234567890-testLiff",
      richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
      async writeRichMenuEnvOutputImplementation(outputPath, richMenuIds) {
        outputWrites.push({ outputPath, menuCount: richMenuIds.size });
      },
      async fetchImplementation(input, init) {
        calls.push({ input: String(input), init });

        if (String(input).endsWith("/v2/bot/user/all/richmenu")) {
          return new Response(JSON.stringify({ richMenuId: "richmenu-previous-default" }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }

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
      richMenuEnvOutputWritten: true,
      liffUrlApplied: true,
      liffIdRecorded: false,
      richMenuIdRecorded: false,
      lineSendAttempted: false,
      secretRecorded: false
    });
    expect(calls.map((call) => call.input)).toEqual([
      "https://api.line.me/v2/bot/user/all/richmenu",
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
    expect(output).toContain("rich_menu_env_output_written=true");
    expect(output).toContain("rich_menu_id_recorded=false");
    expect(output).not.toContain("richmenu-lifecycle");
    expect(output).not.toContain("test-channel-access-token");
    expect(output).not.toContain("1234567890-testLiff");
    expect(outputWrites).toEqual([
      { outputPath: "secure-rich-menu-lifecycle.env", menuCount: 3 }
    ]);

    const createBodies = calls
      .filter((call) => call.input === "https://api.line.me/v2/bot/richmenu")
      .map((call) => JSON.parse(String(call.init.body ?? "{}")) as { name: string });
    expect(createBodies.map((body) => body.name)).toEqual([
      "初期メニュー",
      "商談中メニュー",
      "アフターメニュー"
    ]);
  });

  it("blocks lifecycle apply before LINE API calls when the environment output path is missing", async () => {
    const calls: string[] = [];

    await expect(
      applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        liffId: "1234567890-testLiff",
        richMenuEnvOutputPath: "",
        async fetchImplementation(input) {
          calls.push(String(input));
          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("rich_menu_env_output_path_missing");

    expect(calls).toEqual([]);
  });

  it("deletes every created lifecycle menu when the environment output cannot be written", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let createCount = 0;

    await expect(
      applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        liffId: "1234567890-testLiff",
        richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
        async writeRichMenuEnvOutputImplementation() {
          throw new Error("secure_output_write_failed");
        },
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/user/all/richmenu") && method === "GET") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-previous-default" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            createCount += 1;
            return new Response(JSON.stringify({ richMenuId: `richmenu-output-${createCount}` }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }
          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("secure_output_write_failed");

    const changedDefaultIndex = calls.findIndex((call) =>
      call.url.endsWith("/v2/bot/user/all/richmenu/richmenu-output-1")
    );
    const restoredDefaultIndex = calls.findIndex((call) =>
      call.url.endsWith("/v2/bot/user/all/richmenu/richmenu-previous-default")
    );
    const firstDeleteIndex = calls.findIndex((call) => call.method === "DELETE");

    expect(changedDefaultIndex).toBeGreaterThan(-1);
    expect(restoredDefaultIndex).toBeGreaterThan(changedDefaultIndex);
    expect(firstDeleteIndex).toBeGreaterThan(restoredDefaultIndex);

    expect(
      calls.filter((call) => call.method === "DELETE").map((call) => call.url)
    ).toEqual([
      "https://api.line.me/v2/bot/richmenu/richmenu-output-3",
      "https://api.line.me/v2/bot/richmenu/richmenu-output-2",
      "https://api.line.me/v2/bot/richmenu/richmenu-output-1"
    ]);
  });

  it("deletes all created lifecycle menus when a later menu upload fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let createCount = 0;

    await expect(
      applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        liffId: "1234567890-testLiff",
        richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
        async writeRichMenuEnvOutputImplementation() {},
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/user/all/richmenu") && method === "GET") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-previous-default" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            createCount += 1;
            return new Response(
              JSON.stringify({ richMenuId: `richmenu-lifecycle-cleanup-${createCount}` }),
              {
                status: 200,
                headers: { "content-type": "application/json" }
              }
            );
          }
          if (
            url.includes("api-data.line.me") &&
            url.includes("richmenu-lifecycle-cleanup-2")
          ) {
            return new Response("{}", { status: 500 });
          }
          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("rich_menu_image_upload_failed");

    const deleteCalls = calls.filter((call) => call.method === "DELETE");
    expect(deleteCalls).toEqual([
      {
        url: "https://api.line.me/v2/bot/richmenu/richmenu-lifecycle-cleanup-2",
        method: "DELETE"
      },
      {
        url: "https://api.line.me/v2/bot/richmenu/richmenu-lifecycle-cleanup-1",
        method: "DELETE"
      }
    ]);
  });

  it("clears the new default before cleanup when no Messaging API default existed", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let createCount = 0;

    await expect(
      applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        liffId: "1234567890-testLiff",
        richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
        async writeRichMenuEnvOutputImplementation() {
          throw new Error("secure_output_write_failed");
        },
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/user/all/richmenu") && method === "GET") {
            return new Response("{}", { status: 404 });
          }

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            createCount += 1;
            return new Response(JSON.stringify({ richMenuId: `richmenu-none-${createCount}` }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }

          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("secure_output_write_failed");

    const clearIndex = calls.findIndex(
      (call) =>
        call.url.endsWith("/v2/bot/user/all/richmenu") && call.method === "DELETE"
    );
    const firstDeleteIndex = calls.findIndex(
      (call) => call.url.includes("/v2/bot/richmenu/richmenu-none-") && call.method === "DELETE"
    );

    expect(clearIndex).toBeGreaterThan(-1);
    expect(firstDeleteIndex).toBeGreaterThan(clearIndex);
  });

  it("keeps the active new default when restoring the previous default fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let createCount = 0;
    let caughtError: unknown;

    try {
      await applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        liffId: "1234567890-testLiff",
        richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
        async writeRichMenuEnvOutputImplementation() {
          throw new Error("secure_output_write_failed");
        },
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/user/all/richmenu") && method === "GET") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-previous-default" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            createCount += 1;
            return new Response(JSON.stringify({ richMenuId: `richmenu-kept-${createCount}` }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }

          if (url.endsWith("/richmenu/richmenu-previous-default") && method === "POST") {
            return new Response("{}", { status: 500 });
          }

          return new Response("{}", { status: 200 });
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    const deletedUrls = calls
      .filter((call) => call.method === "DELETE")
      .map((call) => call.url);

    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(deletedUrls).toEqual([
      "https://api.line.me/v2/bot/richmenu/richmenu-kept-3",
      "https://api.line.me/v2/bot/richmenu/richmenu-kept-2"
    ]);
    expect(deletedUrls).not.toContain(
      "https://api.line.me/v2/bot/richmenu/richmenu-kept-1"
    );
  });

  it("restores the previous default when the default change succeeded but its response was lost", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let createCount = 0;
    let defaultGetCount = 0;

    await expect(
      applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        liffId: "1234567890-testLiff",
        richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
        async writeRichMenuEnvOutputImplementation() {},
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/user/all/richmenu") && method === "GET") {
            defaultGetCount += 1;
            return new Response(
              JSON.stringify({
                richMenuId:
                  defaultGetCount === 1
                    ? "richmenu-previous-default"
                    : "richmenu-response-lost-1"
              }),
              { status: 200, headers: { "content-type": "application/json" } }
            );
          }
          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            createCount += 1;
            return new Response(
              JSON.stringify({ richMenuId: `richmenu-response-lost-${createCount}` }),
              { status: 200, headers: { "content-type": "application/json" } }
            );
          }
          if (
            url.endsWith("/v2/bot/user/all/richmenu/richmenu-response-lost-1") &&
            method === "POST"
          ) {
            throw new Error("set_default_response_lost");
          }

          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("set_default_response_lost");

    const restoredDefaultIndex = calls.findIndex(
      (call) =>
        call.url.endsWith("/v2/bot/user/all/richmenu/richmenu-previous-default") &&
        call.method === "POST"
    );
    const firstDeleteIndex = calls.findIndex((call) => call.method === "DELETE");

    expect(defaultGetCount).toBe(2);
    expect(restoredDefaultIndex).toBeGreaterThan(-1);
    expect(firstDeleteIndex).toBeGreaterThan(restoredDefaultIndex);
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(3);
  });

  it("preserves the possible active default when response-loss reconciliation also fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let createCount = 0;
    let defaultGetCount = 0;
    let caughtError: unknown;

    try {
      await applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        liffId: "1234567890-testLiff",
        richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
        async writeRichMenuEnvOutputImplementation() {},
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/user/all/richmenu") && method === "GET") {
            defaultGetCount += 1;
            if (defaultGetCount > 1) {
              throw new Error("default_reconciliation_failed");
            }
            return new Response(JSON.stringify({ richMenuId: "richmenu-previous-default" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }
          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            createCount += 1;
            return new Response(
              JSON.stringify({ richMenuId: `richmenu-unknown-default-${createCount}` }),
              { status: 200, headers: { "content-type": "application/json" } }
            );
          }
          if (
            url.endsWith("/v2/bot/user/all/richmenu/richmenu-unknown-default-1") &&
            method === "POST"
          ) {
            throw new Error("set_default_response_lost");
          }

          return new Response("{}", { status: 200 });
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    const deletedUrls = calls
      .filter((call) => call.method === "DELETE")
      .map((call) => call.url);

    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(deletedUrls).toEqual([
      "https://api.line.me/v2/bot/richmenu/richmenu-unknown-default-3",
      "https://api.line.me/v2/bot/richmenu/richmenu-unknown-default-2"
    ]);
  });

  it("preserves the previous environment file when an atomic replacement fails", async () => {
    const directory = path.join(process.cwd(), "tmp", "tests", randomUUID());
    const outputPath = path.join(directory, "rich-menu.env");
    await mkdir(directory, { recursive: true });
    await writeFile(outputPath, "UNCHANGED='previous'\n", { mode: 0o600 });

    try {
      await expect(
        writeEnvironmentOutput(
          outputPath,
          new Map([["LINE_RICH_MENU_INITIAL_ID", "new-menu-id"]]),
          async () => {
            throw new Error("atomic_replace_failed");
          }
        )
      ).rejects.toThrow("atomic_replace_failed");

      expect(await readFile(outputPath, "utf8")).toBe("UNCHANGED='previous'\n");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("atomically writes environment output with owner-only permissions", async () => {
    const directory = path.join(process.cwd(), "tmp", "tests", randomUUID());
    const outputPath = path.join(directory, "rich-menu.env");
    await mkdir(directory, { recursive: true });

    try {
      await writeEnvironmentOutput(
        outputPath,
        new Map([["LINE_RICH_MENU_INITIAL_ID", "new-menu-id"]])
      );

      expect(await readFile(outputPath, "utf8")).toBe(
        "LINE_RICH_MENU_INITIAL_ID='new-menu-id'\n"
      );
      expect((await stat(outputPath)).mode & 0o777).toBe(0o600);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not overwrite an environment file when reading it fails for a non-ENOENT reason", async () => {
    let writeAttempted = false;

    await expect(
      writeEnvironmentOutput(
        "secure-rich-menu.env",
        new Map([["LINE_RICH_MENU_INITIAL_ID", "new-menu-id"]]),
        async () => {
          writeAttempted = true;
        },
        async () => {
          throw Object.assign(new Error("permission denied"), { code: "EACCES" });
        }
      )
    ).rejects.toMatchObject({ code: "EACCES" });

    expect(writeAttempted).toBe(false);
  });

  it("reports cleanup_required without exposing IDs or tokens when rollback deletion fails", async () => {
    let caughtError: unknown;

    try {
      await applyDefaultRichMenu({
        channelAccessToken: "test-channel-access-token",
        liffId: "1234567890-testLiff",
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-cleanup-required-id" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }
          if (url.includes("/v2/bot/user/all/richmenu/") || method === "DELETE") {
            return new Response("{}", { status: 500 });
          }
          return new Response("{}", { status: 200 });
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    expect(output).toContain("failure_reason=rich_menu_apply_failed_cleanup_required");
    expect(output).toContain("apply_failure_reason=rich_menu_set_default_failed");
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(output).not.toContain("richmenu-cleanup-required-id");
    expect(output).not.toContain("test-channel-access-token");
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
    const recordedIds: string[] = [];
    const result = await applyCustomRichMenu({
      assetDirectory: "deploy/line/rich-menu/amamihome-initial",
      channelAccessToken: "test-channel-access-token",
      richMenuIdOutputPath: "secure-rich-menu-id.env",
      async writeRichMenuIdOutputImplementation(_outputPath, richMenuId) {
        recordedIds.push(richMenuId);
      },
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
      richMenuIdOutputWritten: true,
      richMenuIdRecorded: false,
      lineSendAttempted: false,
      secretRecorded: false
    });
    expect(calls.map((call) => call.input)).toEqual([
      "https://api.line.me/v2/bot/richmenu",
      "https://api-data.line.me/v2/bot/richmenu/richmenu-custom-id/content"
    ]);
    expect(recordedIds).toEqual(["richmenu-custom-id"]);
    expect(output).toContain("rich_menu_id_output_written=true");
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
        richMenuIdOutputPath: "secure-rich-menu-id.env",
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
      richMenuIdOutputPath: "secure-rich-menu-id.env",
      async writeRichMenuIdOutputImplementation() {},
      setDefault: true,
      async fetchImplementation(input) {
        const requestUrl = String(input);
        calls.push(requestUrl);

        if (requestUrl.endsWith("/v2/bot/user/all/richmenu")) {
          return new Response(JSON.stringify({ richMenuId: "richmenu-previous-default" }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }

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
      "https://api.line.me/v2/bot/user/all/richmenu",
      "https://api.line.me/v2/bot/richmenu",
      "https://api-data.line.me/v2/bot/richmenu/richmenu-custom-default-id/content",
      "https://api.line.me/v2/bot/user/all/richmenu/richmenu-custom-default-id"
    ]);
  });

  it("deletes a custom rich menu when image upload fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];

    await expect(
      applyCustomRichMenu({
        assetDirectory: "deploy/line/rich-menu/amamihome-initial",
        channelAccessToken: "test-channel-access-token",
        richMenuIdOutputPath: "secure-rich-menu-id.env",
        async writeRichMenuIdOutputImplementation() {},
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-upload-failed" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }
          if (url.includes("api-data.line.me")) {
            return new Response("{}", { status: 500 });
          }
          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("rich_menu_image_upload_failed");

    expect(calls.at(-1)).toEqual({
      url: "https://api.line.me/v2/bot/richmenu/richmenu-upload-failed",
      method: "DELETE"
    });
  });

  it("deletes a custom rich menu when setting it as default fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];

    await expect(
      applyCustomRichMenu({
        assetDirectory: "deploy/line/rich-menu/amamihome-initial",
        channelAccessToken: "test-channel-access-token",
        richMenuIdOutputPath: "secure-rich-menu-id.env",
        async writeRichMenuIdOutputImplementation() {},
        setDefault: true,
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/user/all/richmenu") && method === "GET") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-previous-default" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-default-failed" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }
          if (url.includes("/v2/bot/user/all/richmenu/")) {
            return new Response("{}", { status: 500 });
          }
          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("rich_menu_set_default_failed");

    expect(calls.at(-1)).toEqual({
      url: "https://api.line.me/v2/bot/richmenu/richmenu-default-failed",
      method: "DELETE"
    });
  });

  it("restores the previous default when writing the custom menu output fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];

    await expect(
      applyCustomRichMenu({
        assetDirectory: "deploy/line/rich-menu/amamihome-initial",
        channelAccessToken: "test-channel-access-token",
        richMenuIdOutputPath: "secure-rich-menu-id.env",
        setDefault: true,
        async writeRichMenuIdOutputImplementation() {
          throw new Error("secure_output_write_failed");
        },
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/user/all/richmenu") && method === "GET") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-previous-default" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }
          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-custom-output" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }

          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("secure_output_write_failed");

    const restoredDefaultIndex = calls.findIndex(
      (call) =>
        call.url.endsWith("/v2/bot/user/all/richmenu/richmenu-previous-default") &&
        call.method === "POST"
    );
    const deletedMenuIndex = calls.findIndex(
      (call) =>
        call.url.endsWith("/v2/bot/richmenu/richmenu-custom-output") &&
        call.method === "DELETE"
    );

    expect(restoredDefaultIndex).toBeGreaterThan(-1);
    expect(deletedMenuIndex).toBeGreaterThan(restoredDefaultIndex);
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
