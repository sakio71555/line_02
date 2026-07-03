import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const RICH_MENU_ASSET_DIR = path.join(
  "deploy",
  "line",
  "rich-menu",
  "amamihome-default"
);
export const RICH_MENU_DEFINITION_PATH = path.join(RICH_MENU_ASSET_DIR, "rich-menu.json");
export const RICH_MENU_IMAGE_PATH = path.join(RICH_MENU_ASSET_DIR, "rich-menu.png");
export const LINE_RICH_MENU_APPLY_APPROVAL = "YES";

export interface LineRichMenuDefinition {
  size: {
    width: number;
    height: number;
  };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: LineRichMenuArea[];
}

export interface LineRichMenuArea {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  action: {
    type: "message";
    label: string;
    text: string;
  };
}

export interface LineRichMenuDryRunResult {
  definitionAvailable: boolean;
  imageAvailable: boolean;
  imageBytes: number | null;
  validationPassed: boolean;
  areaCount: number;
  messageActionCount: number;
  lineApiCalled: false;
  lineSendAttempted: false;
  secretRecorded: false;
  richMenuIdRecorded: false;
}

export interface LineRichMenuApplyResult {
  createRichMenuStatus: "success";
  uploadImageStatus: "success";
  setDefaultStatus: "success";
  richMenuIdRecorded: false;
  lineSendAttempted: false;
  secretRecorded: false;
}

export class LineRichMenuOperatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LineRichMenuOperatorError";
  }
}

export async function loadAmamiHomeRichMenuDefinition(
  repoRoot = process.cwd()
): Promise<LineRichMenuDefinition> {
  const body = await readFile(path.join(repoRoot, RICH_MENU_DEFINITION_PATH), "utf8");
  const parsed: unknown = JSON.parse(body);

  if (!isLineRichMenuDefinition(parsed)) {
    throw new LineRichMenuOperatorError("rich_menu_definition_invalid");
  }

  return parsed;
}

export function validateRichMenuDefinition(definition: LineRichMenuDefinition): string[] {
  const errors: string[] = [];

  if (definition.size.width < 800 || definition.size.width > 2500) {
    errors.push("rich_menu_width_out_of_range");
  }

  if (definition.size.height < 250) {
    errors.push("rich_menu_height_out_of_range");
  }

  if (definition.size.width / definition.size.height < 1.45) {
    errors.push("rich_menu_aspect_ratio_too_narrow");
  }

  if (definition.chatBarText.length === 0 || definition.chatBarText.length > 14) {
    errors.push("chat_bar_text_invalid");
  }

  if (definition.areas.length !== 6) {
    errors.push("area_count_must_be_6");
  }

  for (const area of definition.areas) {
    const right = area.bounds.x + area.bounds.width;
    const bottom = area.bounds.y + area.bounds.height;

    if (area.bounds.x < 0 || area.bounds.y < 0 || right > definition.size.width) {
      errors.push("area_bounds_x_out_of_range");
    }

    if (bottom > definition.size.height) {
      errors.push("area_bounds_y_out_of_range");
    }

    if (area.action.type !== "message") {
      errors.push("area_action_must_be_message");
    }

    if (!area.action.label.trim() || !area.action.text.trim()) {
      errors.push("area_action_label_or_text_empty");
    }
  }

  return errors;
}

export async function runLineRichMenuDryRun(repoRoot = process.cwd()): Promise<LineRichMenuDryRunResult> {
  const definition = await loadAmamiHomeRichMenuDefinition(repoRoot);
  const validationErrors = validateRichMenuDefinition(definition);
  const imagePath = path.join(repoRoot, RICH_MENU_IMAGE_PATH);
  let imageBytes: number | null = null;
  let imageAvailable = false;

  try {
    const imageStat = statSync(imagePath);
    imageAvailable = imageStat.isFile();
    imageBytes = imageStat.size;
  } catch {
    imageAvailable = false;
  }

  return {
    definitionAvailable: true,
    imageAvailable,
    imageBytes,
    validationPassed: validationErrors.length === 0 && imageAvailable && imageBytes !== null && imageBytes <= 1_000_000,
    areaCount: definition.areas.length,
    messageActionCount: definition.areas.filter((area) => area.action.type === "message").length,
    lineApiCalled: false,
    lineSendAttempted: false,
    secretRecorded: false,
    richMenuIdRecorded: false
  };
}

export function formatLineRichMenuDryRunResult(result: LineRichMenuDryRunResult): string {
  return [
    "line_rich_menu_operator_mode=dry_run",
    `definition_available=${result.definitionAvailable}`,
    `image_available=${result.imageAvailable}`,
    `image_size_bytes=${result.imageBytes ?? "unknown"}`,
    `validation_passed=${result.validationPassed}`,
    `rich_menu_area_count=${result.areaCount}`,
    `message_action_count=${result.messageActionCount}`,
    `line_api_called=${result.lineApiCalled}`,
    `line_send_attempted=${result.lineSendAttempted}`,
    `secret_recorded=${result.secretRecorded}`,
    `rich_menu_id_recorded=${result.richMenuIdRecorded}`,
    "apply_requires_explicit_approval=true"
  ].join("\n");
}

export async function applyDefaultRichMenu(input: {
  repoRoot?: string;
  channelAccessToken: string;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<LineRichMenuApplyResult> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const token = input.channelAccessToken.trim();

  if (!token) {
    throw new LineRichMenuOperatorError("line_channel_access_token_missing");
  }

  const definition = await loadAmamiHomeRichMenuDefinition(repoRoot);
  const validationErrors = validateRichMenuDefinition(definition);

  if (validationErrors.length > 0) {
    throw new LineRichMenuOperatorError("rich_menu_definition_invalid");
  }

  const image = await readFile(path.join(repoRoot, RICH_MENU_IMAGE_PATH));
  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch.bind(globalThis);

  const createResponse = await fetchImplementation("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(definition)
  });

  if (!createResponse.ok) {
    throw new LineRichMenuOperatorError("rich_menu_create_failed");
  }

  const createBody: unknown = await createResponse.json();
  const richMenuId = readRichMenuId(createBody);

  const uploadResponse = await fetchImplementation(
    `https://api-data.line.me/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "image/png"
      },
      body: image
    }
  );

  if (!uploadResponse.ok) {
    throw new LineRichMenuOperatorError("rich_menu_image_upload_failed");
  }

  const defaultResponse = await fetchImplementation(
    `https://api.line.me/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      }
    }
  );

  if (!defaultResponse.ok) {
    throw new LineRichMenuOperatorError("rich_menu_set_default_failed");
  }

  return {
    createRichMenuStatus: "success",
    uploadImageStatus: "success",
    setDefaultStatus: "success",
    richMenuIdRecorded: false,
    lineSendAttempted: false,
    secretRecorded: false
  };
}

export function formatLineRichMenuApplyResult(result: LineRichMenuApplyResult): string {
  return [
    "line_rich_menu_operator_mode=apply",
    `create_rich_menu_status=${result.createRichMenuStatus}`,
    `upload_rich_menu_image_status=${result.uploadImageStatus}`,
    `set_default_rich_menu_status=${result.setDefaultStatus}`,
    `rich_menu_id_recorded=${result.richMenuIdRecorded}`,
    `line_send_attempted=${result.lineSendAttempted}`,
    `secret_recorded=${result.secretRecorded}`
  ].join("\n");
}

function isLineRichMenuDefinition(value: unknown): value is LineRichMenuDefinition {
  if (!isRecord(value) || !isRecord(value.size) || !Array.isArray(value.areas)) {
    return false;
  }

  return (
    typeof value.size.width === "number" &&
    typeof value.size.height === "number" &&
    typeof value.selected === "boolean" &&
    typeof value.name === "string" &&
    typeof value.chatBarText === "string" &&
    value.areas.every(isLineRichMenuArea)
  );
}

function isLineRichMenuArea(value: unknown): value is LineRichMenuArea {
  if (!isRecord(value) || !isRecord(value.bounds) || !isRecord(value.action)) {
    return false;
  }

  return (
    typeof value.bounds.x === "number" &&
    typeof value.bounds.y === "number" &&
    typeof value.bounds.width === "number" &&
    typeof value.bounds.height === "number" &&
    value.action.type === "message" &&
    typeof value.action.label === "string" &&
    typeof value.action.text === "string"
  );
}

function readRichMenuId(value: unknown): string {
  if (!isRecord(value) || typeof value.richMenuId !== "string" || value.richMenuId.length === 0) {
    throw new LineRichMenuOperatorError("rich_menu_id_missing_from_line_response");
  }

  return value.richMenuId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));

  if (args.has("--apply")) {
    if (process.env.LINE_RICH_MENU_APPLY_APPROVED !== LINE_RICH_MENU_APPLY_APPROVAL) {
      throw new LineRichMenuOperatorError("line_rich_menu_apply_not_approved");
    }

    const result = await applyDefaultRichMenu({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ""
    });
    console.log(formatLineRichMenuApplyResult(result));
    return;
  }

  const result = await runLineRichMenuDryRun();
  console.log(formatLineRichMenuDryRunResult(result));
}

const executedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";

if (import.meta.url === executedPath) {
  main().catch((error: unknown) => {
    if (error instanceof LineRichMenuOperatorError) {
      console.error(`line_rich_menu_operator_status=failed`);
      console.error(`failure_reason=${error.message}`);
      process.exitCode = 1;
      return;
    }

    console.error("line_rich_menu_operator_status=failed");
    console.error("failure_reason=unexpected_error");
    process.exitCode = 1;
  });
}
