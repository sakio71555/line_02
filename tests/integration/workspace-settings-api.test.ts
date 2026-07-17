import { describe, expect, it } from "vitest";

import { createApiApp } from "../../apps/api/src/index";
import {
  createDefaultLineExperienceSettings,
  InMemoryOperationsRepository,
  type LineMenuSettings
} from "@amami-line-crm/domain";

const tenantId = "tenant_amamihome";

function createCustomServiceMenu(): LineMenuSettings {
  return {
    menu_type: "service",
    name: "アフターサービスメニュー",
    chat_bar_text: "アフターサービス",
    line_rich_menu_id: "richmenu-service-test",
    items: [
      {
        action_key: "service.repair",
        label: "修理相談",
        behavior: "consultation",
        trigger_text: "修理について相談",
        target_url: "",
        reply_text: "修理について確認します。",
        timeline_label: "修理相談を開始",
        flow: {
          category: "repair",
          assigned_role: "support",
          default_severity: "medium",
          default_priority: "normal",
          ai_auto_reply: false,
          requires_staff_confirmation: true,
          steps: [
            {
              key: "repair_area",
              kind: "choice",
              prompt_timeline_body: "修理箇所を確認",
              value_timeline_prefix: "修理箇所：",
              prompt_reply: "修理が必要な場所を選んでください。",
              retry_reply: "表示された場所から選んでください。",
              options: [
                { label: "水まわり", value: "water" },
                { label: "電気", value: "electric" }
              ]
            },
            {
              key: "details",
              kind: "text",
              prompt_timeline_body: "詳しい状況を確認",
              value_timeline_prefix: "詳しい状況：",
              prompt_reply: "詳しい状況を入力してください。",
              retry_reply: "詳しい状況を入力してください。",
              options: []
            }
          ]
        }
      },
      ...Array.from({ length: 5 }, (_, index) => ({
        action_key: `service.guide_${index + 1}`,
        label: `案内${index + 1}`,
        behavior: "guide" as const,
        trigger_text: `アフター案内${index + 1}`,
        target_url: "",
        reply_text: `アフターサービス案内${index + 1}です。`,
        timeline_label: `アフター案内${index + 1}`
      }))
    ]
  };
}

function createWorkspaceSettingsBody() {
  const lineExperience = createDefaultLineExperienceSettings();
  lineExperience.menus[0]!.name = "Example Company Initial Menu";
  lineExperience.menus[0]!.items[1]!.label = "店舗を予約";
  lineExperience.menus[0]!.items[1]!.trigger_text = "店舗を予約したい";
  lineExperience.menus[0]!.items[1]!.reply_text = "ご予約ページをご案内します。";
  lineExperience.menus[0]!.items[1]!.target_url = "https://example.test/reservation/";
  lineExperience.menus.push(createCustomServiceMenu());

  return {
    expected_updated_at: null,
    company_name: "Example Company",
    product_name: "LINE相談CRM",
    accent_preset: "ocean" as const,
    sla_minutes: 240,
    rich_menu_auto_switch_enabled: false,
    customer_status_notifications_enabled: true,
    line_experience: lineExperience,
    setup_completed: true
  };
}

function createTestApp(repository: InMemoryOperationsRepository) {
  return createApiApp({
    operationsRepository: repository,
    env: {
      TENANT_ID: tenantId,
      TENANT_SLUG: "amamihome",
      LINE_CHANNEL_SECRET: "test-secret"
    }
  });
}

function workspaceSettingsRequest(
  method: "GET" | "PUT",
  body?: Record<string, unknown>,
  requestTenantId = tenantId
) {
  return new Request("http://localhost/api/admin/workspace-settings", {
    method,
    headers: {
      "content-type": "application/json",
      "x-tenant-id": requestTenantId
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

describe("workspace settings API", () => {
  it("saves and reads tenant-owned LINE menu settings", async () => {
    const repository = new InMemoryOperationsRepository();
    const app = createTestApp(repository);
    const requestBody = {
      ...createWorkspaceSettingsBody(),
      tenant_id: "tenant_other"
    };

    const putResponse = await app.fetch(workspaceSettingsRequest("PUT", requestBody));
    const putBody = await putResponse.json();

    expect(putResponse.status).toBe(200);
    expect(putBody.settings_version).toEqual(expect.any(String));
    expect(putBody).toMatchObject({
      ok: true,
      tenant_id: tenantId,
      settings: {
        tenant_id: tenantId,
        company_name: "Example Company"
      }
    });
    expect(putBody.settings.line_experience.menus).toHaveLength(4);
    expect(putBody.settings.line_experience.menus[0]).toMatchObject({
      menu_type: "initial",
      name: "Example Company Initial Menu"
    });
    expect(putBody.settings.line_experience.menus[0].items).toHaveLength(6);
    expect(putBody.settings.line_experience.menus[0].items[1]).toMatchObject({
      label: "店舗を予約",
      trigger_text: "店舗を予約したい",
      reply_text: "ご予約ページをご案内します。",
      target_url: "https://example.test/reservation/"
    });
    expect(putBody.settings.line_experience.menus[3]).toMatchObject({
      menu_type: "service",
      name: "アフターサービスメニュー",
      line_rich_menu_id: "richmenu-service-test",
      publication_status: "draft",
      published_snapshot: null
    });
    expect(putBody.settings.line_experience.menus[3].items[0]).toMatchObject({
      action_key: "service.repair",
      behavior: "consultation",
      flow: expect.objectContaining({
        category: "repair",
        assigned_role: "support",
        steps: expect.arrayContaining([
          expect.objectContaining({ key: "repair_area", kind: "choice" }),
          expect.objectContaining({ key: "details", kind: "text" })
        ])
      })
    });
    await expect(repository.getWorkspaceSettings("tenant_other")).resolves.toBeNull();

    const getResponse = await app.fetch(workspaceSettingsRequest("GET"));
    const getBody = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getBody.settings_version).toBe(putBody.settings_version);
    expect(getBody).toMatchObject({
      ok: true,
      tenant_id: tenantId,
      settings: {
        company_name: "Example Company"
      }
    });
    expect(getBody.settings.line_experience.menus).toHaveLength(4);
    expect(getBody.settings.line_experience.menus[0].name).toBe(
      "Example Company Initial Menu"
    );
    expect(getBody.settings.line_experience.menus[3].items[0].flow.steps).toHaveLength(2);
  });

  it("rejects another tenant and invalid LINE menu settings", async () => {
    const repository = new InMemoryOperationsRepository();
    const app = createTestApp(repository);
    const unknownTenantResponse = await app.fetch(
      workspaceSettingsRequest("GET", undefined, "tenant_other")
    );

    expect(unknownTenantResponse.status).toBe(403);
    expect(await unknownTenantResponse.json()).toEqual({
      ok: false,
      error: "unknown_tenant_id"
    });

    const invalidBody = createWorkspaceSettingsBody();
    invalidBody.line_experience.menus[0]!.items[1]!.target_url = "not-a-url";
    const invalidResponse = await app.fetch(workspaceSettingsRequest("PUT", invalidBody));

    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toEqual({
      ok: false,
      error: "invalid_workspace_settings_body"
    });
    await expect(repository.getWorkspaceSettings(tenantId)).resolves.toBeNull();
  });

  it("rejects stale workspace settings updates with optimistic concurrency", async () => {
    const repository = new InMemoryOperationsRepository();
    const app = createTestApp(repository);
    const createResponse = await app.fetch(
      workspaceSettingsRequest("PUT", createWorkspaceSettingsBody())
    );
    const created = await createResponse.json();
    const originalVersion = created.settings_version as string;

    const firstUpdateResponse = await app.fetch(
      workspaceSettingsRequest("PUT", {
        ...createWorkspaceSettingsBody(),
        expected_updated_at: originalVersion,
        company_name: "First Editor"
      })
    );
    const firstUpdate = await firstUpdateResponse.json();

    expect(firstUpdateResponse.status).toBe(200);
    expect(firstUpdate.settings_version).not.toBe(originalVersion);

    const staleResponse = await app.fetch(
      workspaceSettingsRequest("PUT", {
        ...createWorkspaceSettingsBody(),
        expected_updated_at: originalVersion,
        company_name: "Stale Editor"
      })
    );

    expect(staleResponse.status).toBe(409);
    expect(await staleResponse.json()).toEqual({
      ok: false,
      error: "workspace_settings_conflict"
    });
    await expect(repository.getWorkspaceSettings(tenantId)).resolves.toMatchObject({
      company_name: "First Editor"
    });
  });

  it("protects published menus from deletion", async () => {
    const repository = new InMemoryOperationsRepository();
    const app = createTestApp(repository);
    const createResponse = await app.fetch(
      workspaceSettingsRequest("PUT", createWorkspaceSettingsBody())
    );
    const created = await createResponse.json();
    const baseDeleteBody = createWorkspaceSettingsBody();
    const deleteBody = {
      ...baseDeleteBody,
      expected_updated_at: created.settings_version as string,
      line_experience: {
        ...baseDeleteBody.line_experience,
        menus: baseDeleteBody.line_experience.menus.filter(
          (menu) => menu.menu_type !== "initial"
        )
      }
    };

    const deleteResponse = await app.fetch(workspaceSettingsRequest("PUT", deleteBody));

    expect(deleteResponse.status).toBe(409);
    expect(await deleteResponse.json()).toEqual({
      ok: false,
      error: "published_line_menu_delete_forbidden"
    });
  });

  it("forces newly added menus to remain draft even when a client requests publication", async () => {
    const repository = new InMemoryOperationsRepository();
    const app = createTestApp(repository);
    const requestBody = createWorkspaceSettingsBody();
    const customMenu = requestBody.line_experience.menus.at(-1)!;
    customMenu.publication_status = "published";
    customMenu.published_snapshot = {
      name: customMenu.name,
      chat_bar_text: customMenu.chat_bar_text,
      line_rich_menu_id: customMenu.line_rich_menu_id,
      items: customMenu.items
    };

    const response = await app.fetch(workspaceSettingsRequest("PUT", requestBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.settings.line_experience.menus.at(-1)).toMatchObject({
      menu_type: "service",
      publication_status: "draft",
      published_snapshot: null
    });
  });

  it("rejects published snapshot removal and published-to-draft rollback", async () => {
    const repository = new InMemoryOperationsRepository();
    const app = createTestApp(repository);
    const createResponse = await app.fetch(
      workspaceSettingsRequest("PUT", createWorkspaceSettingsBody())
    );
    const created = await createResponse.json();
    const removalBody = createWorkspaceSettingsBody();
    removalBody.expected_updated_at = created.settings_version as string;
    removalBody.line_experience.menus[0]!.published_snapshot = null;

    const removalResponse = await app.fetch(
      workspaceSettingsRequest("PUT", removalBody)
    );

    expect(removalResponse.status).toBe(409);
    expect(await removalResponse.json()).toEqual({
      ok: false,
      error: "invalid_line_menu_publication_state"
    });

    const rollbackBody = createWorkspaceSettingsBody();
    rollbackBody.expected_updated_at = created.settings_version as string;
    rollbackBody.line_experience.menus[0]!.publication_status = "draft";

    const rollbackResponse = await app.fetch(
      workspaceSettingsRequest("PUT", rollbackBody)
    );

    expect(rollbackResponse.status).toBe(409);
    expect(await rollbackResponse.json()).toEqual({
      ok: false,
      error: "invalid_line_menu_publication_state"
    });
  });

  it("requires a LINE rich menu ID for the first publication", async () => {
    const repository = new InMemoryOperationsRepository();
    const app = createTestApp(repository);
    const createResponse = await app.fetch(
      workspaceSettingsRequest("PUT", createWorkspaceSettingsBody())
    );
    const created = await createResponse.json();
    const publishBody = createWorkspaceSettingsBody();
    publishBody.expected_updated_at = created.settings_version as string;
    const customMenu = publishBody.line_experience.menus.at(-1)!;
    customMenu.line_rich_menu_id = undefined;
    customMenu.publication_status = "published";
    customMenu.published_snapshot = {
      name: customMenu.name,
      chat_bar_text: customMenu.chat_bar_text,
      items: customMenu.items
    };

    const response = await app.fetch(workspaceSettingsRequest("PUT", publishBody));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "invalid_line_menu_publication_state"
    });
  });
});
