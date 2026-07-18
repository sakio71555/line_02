import { describe, expect, it } from "vitest";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  applyCustomRichMenu,
  applyDefaultRichMenu,
  applyLifecycleRichMenus,
  buildRichMenuDefinitionForApply,
  createSupabaseLineRichMenuPublicationLease,
  CUSTOMER_REGISTRATION_ENDPOINT,
  formatCustomLineRichMenuApplyResult,
  formatLineRichMenuDryRunResult,
  formatLineRichMenuLifecycleApplyResult,
  formatLineRichMenuOperatorFailure,
  formatLineRichMenuRemoveDefaultResult,
  LINE_RICH_MENU_PUBLICATION_LOCK_PATH,
  removeDefaultRichMenu,
  runCustomLineRichMenuDryRun,
  runLineRichMenuDryRun,
  validateRichMenuDefinition,
  writeEnvironmentOutput,
  type LineRichMenuPublicationLease
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
      publicationLease: createTestPublicationLease(),
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

  it("preserves the possible active default when setting it as default fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let caughtError: unknown;

    try {
      await applyDefaultRichMenu({
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
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
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    expect(output).toContain("apply_failure_reason=rich_menu_set_default_failed");
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("requires manual cleanup when a created rich menu ID cannot be recovered", async () => {
    let caughtError: unknown;
    let lineApiCallCount = 0;

    try {
      await applyDefaultRichMenu({
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
        liffId: "1234567890-testLiff",
        async fetchImplementation() {
          lineApiCallCount += 1;
          return new Response("{}", {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    expect(lineApiCallCount).toBe(1);
    expect(output).toContain("apply_failure_reason=rich_menu_create_result_unknown");
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(output).not.toContain("test-channel-access-token");
  });

  it("requires manual cleanup when the create-rich-menu response is lost", async () => {
    let caughtError: unknown;

    try {
      await applyDefaultRichMenu({
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
        liffId: "1234567890-testLiff",
        async fetchImplementation() {
          throw new Error("create_response_lost");
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    expect(output).toContain("apply_failure_reason=rich_menu_create_result_unknown");
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(output).not.toContain("create_response_lost");
    expect(output).not.toContain("test-channel-access-token");
  });

  it("applies lifecycle rich menus without exposing tokens or created IDs", async () => {
    const calls: Array<{ input: string; init: RequestInit }> = [];
    const outputWrites: Array<{ outputPath: string; menuCount: number }> = [];
    let createCount = 0;
    const result = await applyLifecycleRichMenus({
      channelAccessToken: "test-channel-access-token",
      publicationLease: createTestPublicationLease(),
      liffId: "1234567890-testLiff",
      richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
      async writeRichMenuEnvOutputImplementation(outputPath, richMenuIds) {
        outputWrites.push({ outputPath, menuCount: richMenuIds.size });
      },
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
      richMenuEnvOutputWritten: true,
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
    expect(output).toContain("rich_menu_env_output_written=true");
    expect(output).toContain("rich_menu_id_recorded=false");
    expect(output).not.toContain("richmenu-lifecycle");
    expect(output).not.toContain("test-channel-access-token");
    expect(output).not.toContain("1234567890-testLiff");
    expect(outputWrites).toEqual([{ outputPath: "secure-rich-menu-lifecycle.env", menuCount: 3 }]);

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
        publicationLease: createTestPublicationLease(),
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

  it("preserves the active lifecycle menu when the environment output cannot be written", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let createCount = 0;
    let caughtError: unknown;

    try {
      await applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
        liffId: "1234567890-testLiff",
        richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
        async writeRichMenuEnvOutputImplementation() {
          throw new Error("secure_output_write_failed");
        },
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            createCount += 1;
            return new Response(JSON.stringify({ richMenuId: `richmenu-output-${createCount}` }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }
          return new Response("{}", { status: 200 });
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    expect(output).toContain("apply_failure_reason=unexpected_error");
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(calls.filter((call) => call.method === "DELETE").map((call) => call.url)).toEqual([
      "https://api.line.me/v2/bot/richmenu/richmenu-output-3",
      "https://api.line.me/v2/bot/richmenu/richmenu-output-2"
    ]);
    expect(calls.some((call) => call.method === "GET")).toBe(false);
  });

  it("blocks a second publication before any LINE API call while the lock exists", async () => {
    const repoRoot = path.join(process.cwd(), "tmp", "tests", randomUUID());
    const lockPath = path.join(repoRoot, LINE_RICH_MENU_PUBLICATION_LOCK_PATH);
    let lineApiCalled = false;

    await mkdir(lockPath, { recursive: true, mode: 0o700 });
    await writeFile(path.join(lockPath, "owner-existing.json"), "{}\n", { mode: 0o600 });

    try {
      await expect(
        applyDefaultRichMenu({
          repoRoot,
          channelAccessToken: "test-channel-access-token",
          publicationLease: createTestPublicationLease(),
          liffId: "1234567890-testLiff",
          async fetchImplementation() {
            lineApiCalled = true;
            return new Response("{}", { status: 200 });
          }
        })
      ).rejects.toThrow("rich_menu_publication_locked");

      expect(lineApiCalled).toBe(false);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("deletes all created lifecycle menus when a later menu upload fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let createCount = 0;

    await expect(
      applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
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
          if (url.includes("api-data.line.me") && url.includes("richmenu-lifecycle-cleanup-2")) {
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

  it("preserves the possible active default when the set-default response is lost", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let createCount = 0;
    let caughtError: unknown;

    try {
      await applyLifecycleRichMenus({
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
        liffId: "1234567890-testLiff",
        richMenuEnvOutputPath: "secure-rich-menu-lifecycle.env",
        async writeRichMenuEnvOutputImplementation() {},
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

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
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    const deletedUrls = calls.filter((call) => call.method === "DELETE").map((call) => call.url);

    expect(output).toContain("apply_failure_reason=rich_menu_set_default_result_unknown");
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(calls.some((call) => call.method === "GET")).toBe(false);
    expect(deletedUrls).toEqual([
      "https://api.line.me/v2/bot/richmenu/richmenu-response-lost-3",
      "https://api.line.me/v2/bot/richmenu/richmenu-response-lost-2"
    ]);
    expect(deletedUrls).not.toContain(
      "https://api.line.me/v2/bot/richmenu/richmenu-response-lost-1"
    );
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

      expect(await readFile(outputPath, "utf8")).toBe("LINE_RICH_MENU_INITIAL_ID='new-menu-id'\n");
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
        publicationLease: createTestPublicationLease(),
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
      publicationLease: createTestPublicationLease(),
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
        publicationLease: createTestPublicationLease(),
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
      publicationLease: createTestPublicationLease(),
      richMenuIdOutputPath: "secure-rich-menu-id.env",
      async writeRichMenuIdOutputImplementation() {},
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

  it("deletes a custom rich menu when image upload fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];

    await expect(
      applyCustomRichMenu({
        assetDirectory: "deploy/line/rich-menu/amamihome-initial",
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
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

  it("preserves a custom rich menu when setting it as default fails ambiguously", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let caughtError: unknown;

    try {
      await applyCustomRichMenu({
        assetDirectory: "deploy/line/rich-menu/amamihome-initial",
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
        richMenuIdOutputPath: "secure-rich-menu-id.env",
        async writeRichMenuIdOutputImplementation() {},
        setDefault: true,
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

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
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    expect(output).toContain("apply_failure_reason=rich_menu_set_default_failed");
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(calls.some((call) => call.method === "GET")).toBe(false);
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("preserves the active custom menu when writing its output fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    let caughtError: unknown;

    try {
      await applyCustomRichMenu({
        assetDirectory: "deploy/line/rich-menu/amamihome-initial",
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
        richMenuIdOutputPath: "secure-rich-menu-id.env",
        setDefault: true,
        async writeRichMenuIdOutputImplementation() {
          throw new Error("secure_output_write_failed");
        },
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-custom-output" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }

          return new Response("{}", { status: 200 });
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    expect(output).toContain("apply_failure_reason=unexpected_error");
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(calls.some((call) => call.method === "GET")).toBe(false);
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("deletes a non-default custom menu when writing its output fails", async () => {
    const calls: Array<{ url: string; method: string }> = [];

    await expect(
      applyCustomRichMenu({
        assetDirectory: "deploy/line/rich-menu/amamihome-initial",
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
        richMenuIdOutputPath: "secure-rich-menu-id.env",
        async writeRichMenuIdOutputImplementation() {
          throw new Error("secure_output_write_failed");
        },
        async fetchImplementation(input, init) {
          const url = String(input);
          const method = init?.method ?? "GET";
          calls.push({ url, method });

          if (url.endsWith("/v2/bot/richmenu") && method === "POST") {
            return new Response(JSON.stringify({ richMenuId: "richmenu-custom-non-default" }), {
              status: 200,
              headers: { "content-type": "application/json" }
            });
          }

          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("secure_output_write_failed");

    expect(calls.some((call) => call.method === "GET")).toBe(false);
    expect(calls.at(-1)).toEqual({
      url: "https://api.line.me/v2/bot/richmenu/richmenu-custom-non-default",
      method: "DELETE"
    });
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
      publicationLease: createTestPublicationLease(),
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

  it("requires manual verification when the remove-default response is lost", async () => {
    let caughtError: unknown;

    try {
      await removeDefaultRichMenu({
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
        async fetchImplementation() {
          throw new Error("remove_default_response_lost");
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);
    expect(output).toContain("apply_failure_reason=rich_menu_remove_default_result_unknown");
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
    expect(output).not.toContain("remove_default_response_lost");
    expect(output).not.toContain("test-channel-access-token");
  });

  it("uses the publication lock when removing the default rich menu", async () => {
    const repoRoot = path.join(process.cwd(), "tmp", "tests", randomUUID());
    const lockPath = path.join(repoRoot, LINE_RICH_MENU_PUBLICATION_LOCK_PATH);
    let lineApiCalled = false;

    await mkdir(lockPath, { recursive: true, mode: 0o700 });
    await writeFile(path.join(lockPath, "owner-existing.json"), "{}\n", { mode: 0o600 });

    try {
      await expect(
        removeDefaultRichMenu({
          repoRoot,
          channelAccessToken: "test-channel-access-token",
          publicationLease: createTestPublicationLease(),
          async fetchImplementation() {
            lineApiCalled = true;
            return new Response("{}", { status: 200 });
          }
        })
      ).rejects.toThrow("rich_menu_publication_locked");

      expect(lineApiCalled).toBe(false);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("blocks a concurrent publication in the same repository", async () => {
    const repoRoot = path.join(process.cwd(), "tmp", "tests", randomUUID());
    const publicationLease = createTestPublicationLease();
    const firstFetchEntered = createDeferred<void>();
    const releaseFirstFetch = createDeferred<void>();
    let secondLineApiCallCount = 0;

    try {
      const firstPublication = removeDefaultRichMenu({
        repoRoot,
        channelAccessToken: "test-channel-access-token",
        publicationLease,
        async fetchImplementation() {
          firstFetchEntered.resolve();
          await releaseFirstFetch.promise;
          return new Response("{}", { status: 200 });
        }
      });

      await firstFetchEntered.promise;

      await expect(
        removeDefaultRichMenu({
          repoRoot,
          channelAccessToken: "test-channel-access-token",
          publicationLease,
          async fetchImplementation() {
            secondLineApiCallCount += 1;
            return new Response("{}", { status: 200 });
          }
        })
      ).rejects.toThrow("rich_menu_publication_locked");

      expect(secondLineApiCallCount).toBe(0);
      releaseFirstFetch.resolve();
      await firstPublication;
    } finally {
      releaseFirstFetch.resolve();
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("blocks a concurrent publication from another repository through the shared lease", async () => {
    const testRoot = path.join(process.cwd(), "tmp", "tests", randomUUID());
    const firstRepoRoot = path.join(testRoot, "clone-a");
    const secondRepoRoot = path.join(testRoot, "clone-b");
    const publicationLease = createTestPublicationLease();
    const firstFetchEntered = createDeferred<void>();
    const releaseFirstFetch = createDeferred<void>();
    let secondLineApiCallCount = 0;

    try {
      const firstPublication = removeDefaultRichMenu({
        repoRoot: firstRepoRoot,
        channelAccessToken: "test-channel-access-token",
        publicationLease,
        async fetchImplementation() {
          firstFetchEntered.resolve();
          await releaseFirstFetch.promise;
          return new Response("{}", { status: 200 });
        }
      });

      await firstFetchEntered.promise;

      await expect(
        removeDefaultRichMenu({
          repoRoot: secondRepoRoot,
          channelAccessToken: "test-channel-access-token",
          publicationLease,
          async fetchImplementation() {
            secondLineApiCallCount += 1;
            return new Response("{}", { status: 200 });
          }
        })
      ).rejects.toThrow("rich_menu_publication_locked");

      expect(secondLineApiCallCount).toBe(0);
      releaseFirstFetch.resolve();
      await firstPublication;
    } finally {
      releaseFirstFetch.resolve();
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  it("releases local and shared publication locks after success and failure", async () => {
    const repoRoot = path.join(process.cwd(), "tmp", "tests", randomUUID());
    const publicationLease = createTestPublicationLease();
    let attemptCount = 0;

    const executeRemoval = () =>
      removeDefaultRichMenu({
        repoRoot,
        channelAccessToken: "test-channel-access-token",
        publicationLease,
        async fetchImplementation() {
          attemptCount += 1;
          return new Response("{}", { status: attemptCount === 2 ? 500 : 200 });
        }
      });

    try {
      await executeRemoval();
      await expect(executeRemoval()).rejects.toThrow("rich_menu_remove_default_failed");
      await executeRemoval();
      expect(attemptCount).toBe(3);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("does not delete a replacement lock owned by another process", async () => {
    const repoRoot = path.join(process.cwd(), "tmp", "tests", randomUUID());
    const lockPath = path.join(repoRoot, LINE_RICH_MENU_PUBLICATION_LOCK_PATH);
    const publicationLease = createTestPublicationLease();
    const fetchEntered = createDeferred<void>();
    const releaseFetch = createDeferred<void>();

    try {
      const publication = removeDefaultRichMenu({
        repoRoot,
        channelAccessToken: "test-channel-access-token",
        publicationLease,
        async fetchImplementation() {
          fetchEntered.resolve();
          await releaseFetch.promise;
          return new Response("{}", { status: 200 });
        }
      });

      await fetchEntered.promise;
      expect((await readdir(lockPath)).filter((entry) => entry.startsWith("owner-"))).toHaveLength(
        1
      );

      await rm(lockPath, { recursive: true, force: true });
      await mkdir(lockPath, { recursive: true, mode: 0o700 });
      await writeFile(path.join(lockPath, "owner-replacement.json"), "{}\n", { mode: 0o600 });

      releaseFetch.resolve();
      await expect(publication).rejects.toThrow("rich_menu_apply_failed_cleanup_required");
      expect(await readdir(lockPath)).toEqual(["owner-replacement.json"]);
    } finally {
      releaseFetch.resolve();
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("stops before a LINE mutation when the shared lease is lost", async () => {
    let lineApiCallCount = 0;
    const publicationLease: LineRichMenuPublicationLease = {
      async tryAcquire() {
        return true;
      },
      async renew() {
        return false;
      },
      async release() {
        return true;
      }
    };

    await expect(
      removeDefaultRichMenu({
        channelAccessToken: "test-channel-access-token",
        publicationLease,
        async fetchImplementation() {
          lineApiCallCount += 1;
          return new Response("{}", { status: 200 });
        }
      })
    ).rejects.toThrow("rich_menu_publication_lease_lost");

    expect(lineApiCallCount).toBe(0);
  });

  it("renews the shared lease while a LINE API request is still in flight", async () => {
    let currentHolderId: string | undefined;
    let renewalCount = 0;
    const heartbeatObserved = createDeferred<void>();
    const publicationLease: LineRichMenuPublicationLease = {
      renewalIntervalMilliseconds: 5,
      async tryAcquire(holderId) {
        currentHolderId = holderId;
        return true;
      },
      async renew(holderId) {
        renewalCount += 1;

        if (renewalCount >= 2) {
          heartbeatObserved.resolve();
        }

        return currentHolderId === holderId;
      },
      async release(holderId) {
        if (currentHolderId !== holderId) {
          return false;
        }

        currentHolderId = undefined;
        return true;
      }
    };

    await removeDefaultRichMenu({
      channelAccessToken: "test-channel-access-token",
      publicationLease,
      async fetchImplementation() {
        await heartbeatObserved.promise;
        return new Response("{}", { status: 200 });
      }
    });

    expect(renewalCount).toBeGreaterThanOrEqual(3);
  });

  it("stops an in-flight publication when the heartbeat loses the shared lease", async () => {
    let currentHolderId: string | undefined;
    let renewalCount = 0;
    let lineApiCallCount = 0;
    const leaseLossObserved = createDeferred<void>();
    const publicationLease: LineRichMenuPublicationLease = {
      renewalIntervalMilliseconds: 5,
      async tryAcquire(holderId) {
        currentHolderId = holderId;
        return true;
      },
      async renew(holderId) {
        renewalCount += 1;

        if (renewalCount >= 2) {
          leaseLossObserved.resolve();
          return false;
        }

        return currentHolderId === holderId;
      },
      async release(holderId) {
        if (currentHolderId !== holderId) {
          return false;
        }

        currentHolderId = undefined;
        return true;
      }
    };

    let caughtError: unknown;

    try {
      await removeDefaultRichMenu({
        channelAccessToken: "test-channel-access-token",
        publicationLease,
        async fetchImplementation() {
          lineApiCallCount += 1;
          await leaseLossObserved.promise;
          return new Response("{}", { status: 200 });
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);

    expect(lineApiCallCount).toBe(1);
    expect(output).toContain("apply_failure_reason=rich_menu_remove_default_result_unknown");
    expect(output).toContain("cleanup_required=true");
  });

  it("requires manual verification when the lease is lost after the mutation completes", async () => {
    let currentHolderId: string | undefined;
    let renewalCount = 0;
    const publicationLease: LineRichMenuPublicationLease = {
      async tryAcquire(holderId) {
        currentHolderId = holderId;
        return true;
      },
      async renew(holderId) {
        renewalCount += 1;
        return currentHolderId === holderId && renewalCount < 3;
      },
      async release(holderId) {
        if (currentHolderId !== holderId) {
          return false;
        }

        currentHolderId = undefined;
        return true;
      }
    };
    let caughtError: unknown;

    try {
      await removeDefaultRichMenu({
        channelAccessToken: "test-channel-access-token",
        publicationLease,
        async fetchImplementation() {
          return new Response("{}", { status: 200 });
        }
      });
    } catch (error) {
      caughtError = error;
    }

    const output = formatLineRichMenuOperatorFailure(caughtError);

    expect(renewalCount).toBe(3);
    expect(output).toContain(
      "apply_failure_reason=rich_menu_publication_completion_state_unknown"
    );
    expect(output).toContain("cleanup_required=true");
    expect(output).toContain("cleanup_failure_count=1");
  });

  it("uses channel-scoped Supabase lease RPCs without placing secrets in the payload", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const publicationLease = createSupabaseLineRichMenuPublicationLease({
      supabaseUrl: "https://project-ref.supabase.co/",
      serviceRoleKey: "test-service-role-key",
      tenantId: "tenant-test",
      channelId: "test-channel-id",
      leaseTtlSeconds: 120,
      async fetchImplementation(input, init) {
        calls.push({ url: String(input), init: init ?? {} });
        return new Response("true", {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    });

    expect(await publicationLease.tryAcquire("holder-test")).toBe(true);
    expect(await publicationLease.renew("holder-test")).toBe(true);
    expect(await publicationLease.release("holder-test")).toBe(true);

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/rest/v1/rpc/try_acquire_runtime_lease",
      "/rest/v1/rpc/renew_runtime_lease",
      "/rest/v1/rpc/release_runtime_lease"
    ]);

    const requestBodies = calls.map(
      (call) => JSON.parse(String(call.init.body)) as Record<string, unknown>
    );
    expect(requestBodies[0]).toMatchObject({
      p_tenant_id: "tenant-test",
      p_holder_id: "holder-test",
      p_lease_ttl_seconds: 120
    });
    expect(requestBodies[0]?.p_lease_key).toMatch(/^line_rich_menu_publication:[a-f0-9]{32}$/);
    expect(requestBodies[1]?.p_lease_key).toBe(requestBodies[0]?.p_lease_key);
    expect(requestBodies[2]?.p_lease_key).toBe(requestBodies[0]?.p_lease_key);
    expect(requestBodies[2]).not.toHaveProperty("p_lease_ttl_seconds");
    expect(JSON.stringify(requestBodies)).not.toContain("test-channel-id");
    expect(JSON.stringify(requestBodies)).not.toContain("test-service-role-key");
  });

  it("derives a stable shared lease key from the LINE channel ID", async () => {
    const leaseKeys: string[] = [];
    const createLease = (channelId: string) =>
      createSupabaseLineRichMenuPublicationLease({
        supabaseUrl: "https://project-ref.supabase.co",
        serviceRoleKey: "test-service-role-key",
        tenantId: "tenant-test",
        channelId,
        async fetchImplementation(_input, init) {
          const body = JSON.parse(String(init?.body)) as { p_lease_key?: unknown };
          leaseKeys.push(String(body.p_lease_key));
          return new Response("true", {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
      });

    await createLease("stable-channel-id").tryAcquire("holder-a");
    await createLease("stable-channel-id").tryAcquire("holder-b");
    await createLease("another-channel-id").tryAcquire("holder-c");

    expect(leaseKeys[0]).toBe(leaseKeys[1]);
    expect(leaseKeys[0]).not.toBe(leaseKeys[2]);
    expect(JSON.stringify(leaseKeys)).not.toContain("stable-channel-id");
    expect(JSON.stringify(leaseKeys)).not.toContain("another-channel-id");
  });

  it("times out a stalled Supabase lease request", async () => {
    const publicationLease = createSupabaseLineRichMenuPublicationLease({
      supabaseUrl: "https://project-ref.supabase.co",
      serviceRoleKey: "test-service-role-key",
      tenantId: "tenant-test",
      channelId: "test-channel-id",
      requestTimeoutMilliseconds: 10,
      async fetchImplementation(_input, init) {
        return await rejectWhenAborted(init?.signal);
      }
    });

    await expect(publicationLease.tryAcquire("holder-test")).rejects.toThrow(
      "rich_menu_publication_lease_request_failed"
    );
  });

  it("times out a stalled Supabase lease response body", async () => {
    const publicationLease = createSupabaseLineRichMenuPublicationLease({
      supabaseUrl: "https://project-ref.supabase.co",
      serviceRoleKey: "test-service-role-key",
      tenantId: "tenant-test",
      channelId: "test-channel-id",
      requestTimeoutMilliseconds: 10,
      async fetchImplementation(_input, init) {
        const signal = init?.signal;
        const body = new ReadableStream<Uint8Array>({
          start(streamController) {
            if (!signal) {
              streamController.error(new Error("abort_signal_missing"));
              return;
            }

            signal.addEventListener(
              "abort",
              () => streamController.error(new Error("request_aborted")),
              { once: true }
            );
          }
        });

        return new Response(body, {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    });

    await expect(publicationLease.tryAcquire("holder-test")).rejects.toThrow(
      "rich_menu_publication_lease_request_failed"
    );
  });

  it("releases the local lock after a shared lease release request times out", async () => {
    const repoRoot = path.join(process.cwd(), "tmp", "tests", randomUUID());
    const lockPath = path.join(repoRoot, LINE_RICH_MENU_PUBLICATION_LOCK_PATH);
    let releaseRequestObserved = false;
    const publicationLease = createSupabaseLineRichMenuPublicationLease({
      supabaseUrl: "https://project-ref.supabase.co",
      serviceRoleKey: "test-service-role-key",
      tenantId: "tenant-test",
      channelId: "test-channel-id",
      requestTimeoutMilliseconds: 10,
      async fetchImplementation(input, init) {
        if (new URL(String(input)).pathname.endsWith("/release_runtime_lease")) {
          releaseRequestObserved = true;
          return await rejectWhenAborted(init?.signal);
        }

        return new Response("true", {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    });

    try {
      await expect(
        removeDefaultRichMenu({
          repoRoot,
          channelAccessToken: "test-channel-access-token",
          publicationLease,
          async fetchImplementation() {
            return new Response("{}", { status: 200 });
          }
        })
      ).rejects.toThrow("rich_menu_apply_failed_cleanup_required");

      expect(releaseRequestObserved).toBe(true);
      await expect(stat(lockPath)).rejects.toMatchObject({ code: "ENOENT" });

      await removeDefaultRichMenu({
        repoRoot,
        channelAccessToken: "test-channel-access-token",
        publicationLease: createTestPublicationLease(),
        async fetchImplementation() {
          return new Response("{}", { status: 200 });
        }
      });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});

function createTestPublicationLease(): LineRichMenuPublicationLease {
  let currentHolderId: string | undefined;

  return {
    async tryAcquire(holderId) {
      if (currentHolderId && currentHolderId !== holderId) {
        return false;
      }

      currentHolderId = holderId;
      return true;
    },
    async renew(holderId) {
      return currentHolderId === holderId;
    },
    async release(holderId) {
      if (currentHolderId !== holderId) {
        return false;
      }

      currentHolderId = undefined;
      return true;
    }
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function rejectWhenAborted(signal: AbortSignal | null | undefined): Promise<Response> {
  return new Promise<Response>((_resolve, reject) => {
    if (!signal) {
      reject(new Error("abort_signal_missing"));
      return;
    }

    if (signal.aborted) {
      reject(new Error("request_aborted"));
      return;
    }

    signal.addEventListener("abort", () => reject(new Error("request_aborted")), { once: true });
  });
}
