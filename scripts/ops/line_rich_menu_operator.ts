import { chmod, readFile, realpath, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type LineRichMenuAssetKey = "default" | "initial" | "negotiation" | "aftercare";
export type LineRichMenuLifecycleKey = Exclude<LineRichMenuAssetKey, "default">;

export const LINE_RICH_MENU_LIFECYCLE_KEYS: LineRichMenuLifecycleKey[] = [
  "initial",
  "negotiation",
  "aftercare"
];

export const RICH_MENU_ASSET_DIR_BY_KEY: Record<LineRichMenuAssetKey, string> = {
  default: path.join("deploy", "line", "rich-menu", "amamihome-default"),
  initial: path.join("deploy", "line", "rich-menu", "amamihome-initial"),
  negotiation: path.join("deploy", "line", "rich-menu", "amamihome-negotiation"),
  aftercare: path.join("deploy", "line", "rich-menu", "amamihome-aftercare")
};

export const RICH_MENU_ASSET_DIR = RICH_MENU_ASSET_DIR_BY_KEY.default;
export const RICH_MENU_DEFINITION_PATH = getRichMenuDefinitionPath("default");
export const RICH_MENU_IMAGE_PATH = getRichMenuImagePath("default");
export const LINE_RICH_MENU_APPLY_APPROVAL = "YES";
export const LINE_RICH_MENU_REMOVE_APPROVAL = "YES";
export const LINE_RICH_MENU_ENV_KEYS: Record<LineRichMenuLifecycleKey, string> = {
  initial: "LINE_RICH_MENU_INITIAL_ID",
  negotiation: "LINE_RICH_MENU_NEGOTIATION_ID",
  aftercare: "LINE_RICH_MENU_AFTERCARE_ID"
};
export const CUSTOM_LINE_RICH_MENU_ENV_KEY = "LINE_RICH_MENU_ID";
export const CUSTOMER_REGISTRATION_ENDPOINT =
  "https://admin.taiyolabel.site/line/customer-registration";
export const CONTACT_CHANGE_ENDPOINT =
  "https://admin.taiyolabel.site/line/customer-registration?mode=contact-change";

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
  action: LineRichMenuAction;
}

export type LineRichMenuAction =
  | {
      type: "message";
      label: string;
      text: string;
    }
  | {
      type: "uri";
      label: string;
      uri: string;
    };

export interface LineRichMenuDryRunResult {
  menuType: LineRichMenuAssetKey | "custom";
  definitionAvailable: boolean;
  imageAvailable: boolean;
  imageBytes: number | null;
  validationPassed: boolean;
  areaCount: number;
  messageActionCount: number;
  uriActionCount: number;
  lineApiCalled: false;
  lineSendAttempted: false;
  secretRecorded: false;
  richMenuIdRecorded: false;
}

export interface LineRichMenuApplyResult {
  createRichMenuStatus: "success";
  uploadImageStatus: "success";
  setDefaultStatus: "success";
  menuType: LineRichMenuAssetKey;
  liffUrlApplied: boolean;
  liffIdRecorded: false;
  richMenuIdRecorded: false;
  lineSendAttempted: false;
  secretRecorded: false;
}

export interface LineRichMenuLifecycleApplyResult {
  createRichMenuStatus: "success";
  uploadImageStatus: "success";
  setDefaultStatus: "success";
  lifecycleMenuCount: number;
  defaultMenuType: LineRichMenuLifecycleKey;
  initialRichMenuCreated: true;
  negotiationRichMenuCreated: true;
  aftercareRichMenuCreated: true;
  richMenuEnvOutputWritten: boolean;
  liffUrlApplied: boolean;
  liffIdRecorded: false;
  richMenuIdRecorded: false;
  lineSendAttempted: false;
  secretRecorded: false;
}

export interface LineRichMenuRemoveDefaultResult {
  removeDefaultRichMenuStatus: "success";
  richMenuIdRecorded: false;
  lineSendAttempted: false;
  secretRecorded: false;
}

export interface CustomLineRichMenuApplyResult {
  createRichMenuStatus: "success";
  uploadImageStatus: "success";
  setDefaultStatus: "success" | "skipped";
  assetDirectoryValidated: true;
  richMenuIdOutputWritten: true;
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

export function getRichMenuDefinitionPath(menuType: LineRichMenuAssetKey): string {
  return path.join(RICH_MENU_ASSET_DIR_BY_KEY[menuType], "rich-menu.json");
}

export function getRichMenuImagePath(menuType: LineRichMenuAssetKey): string {
  return path.join(RICH_MENU_ASSET_DIR_BY_KEY[menuType], "rich-menu.png");
}

export async function loadAmamiHomeRichMenuDefinition(
  repoRoot = process.cwd(),
  menuType: LineRichMenuAssetKey = "default"
): Promise<LineRichMenuDefinition> {
  const body = await readFile(path.join(repoRoot, getRichMenuDefinitionPath(menuType)), "utf8");
  const parsed: unknown = JSON.parse(body);

  if (!isLineRichMenuDefinition(parsed)) {
    throw new LineRichMenuOperatorError("rich_menu_definition_invalid");
  }

  return parsed;
}

export async function loadRichMenuDefinitionFromAssetDirectory(
  repoRoot: string,
  assetDirectory: string
): Promise<LineRichMenuDefinition> {
  const paths = await resolveCustomAssetPaths(repoRoot, assetDirectory, false);
  const body = await readFile(paths.definitionPath, "utf8");
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

    if (area.action.type !== "message" && area.action.type !== "uri") {
      errors.push("area_action_type_unsupported");
    }

    if (area.action.type === "message" && (!area.action.label.trim() || !area.action.text.trim())) {
      errors.push("area_action_label_or_text_empty");
    }

    if (area.action.type === "uri") {
      if (!area.action.label.trim() || !area.action.uri.trim()) {
        errors.push("area_action_label_or_uri_empty");
      }

      if (!area.action.uri.startsWith("https://")) {
        errors.push("area_action_uri_must_be_https");
      }
    }
  }

  return errors;
}

export async function runLineRichMenuDryRun(
  repoRoot = process.cwd(),
  menuType: LineRichMenuAssetKey = "default"
): Promise<LineRichMenuDryRunResult> {
  const definition = await loadAmamiHomeRichMenuDefinition(repoRoot, menuType);
  const validationErrors = validateRichMenuDefinition(definition);
  const imagePath = path.join(repoRoot, getRichMenuImagePath(menuType));
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
    menuType,
    definitionAvailable: true,
    imageAvailable,
    imageBytes,
    validationPassed: validationErrors.length === 0 && imageAvailable && imageBytes !== null && imageBytes <= 1_000_000,
    areaCount: definition.areas.length,
    messageActionCount: definition.areas.filter((area) => area.action.type === "message").length,
    uriActionCount: definition.areas.filter((area) => area.action.type === "uri").length,
    lineApiCalled: false,
    lineSendAttempted: false,
    secretRecorded: false,
    richMenuIdRecorded: false
  };
}

export async function runCustomLineRichMenuDryRun(
  repoRoot: string,
  assetDirectory: string
): Promise<LineRichMenuDryRunResult> {
  const paths = await resolveCustomAssetPaths(repoRoot, assetDirectory, false);
  const definition = await loadRichMenuDefinitionFromAssetDirectory(repoRoot, assetDirectory);
  const validationErrors = validateRichMenuDefinition(definition);
  let imageBytes: number | null = null;
  let imageAvailable = false;

  try {
    const imagePath = await resolveAssetFile(paths.assetDirectory, "rich-menu.png");
    const imageStat = statSync(imagePath);
    imageAvailable = imageStat.isFile();
    imageBytes = imageStat.size;
  } catch {
    imageAvailable = false;
  }

  return {
    menuType: "custom",
    definitionAvailable: true,
    imageAvailable,
    imageBytes,
    validationPassed: validationErrors.length === 0 && imageAvailable && imageBytes !== null && imageBytes <= 1_000_000,
    areaCount: definition.areas.length,
    messageActionCount: definition.areas.filter((area) => area.action.type === "message").length,
    uriActionCount: definition.areas.filter((area) => area.action.type === "uri").length,
    lineApiCalled: false,
    lineSendAttempted: false,
    secretRecorded: false,
    richMenuIdRecorded: false
  };
}

export function formatLineRichMenuDryRunResult(result: LineRichMenuDryRunResult): string {
  return [
    "line_rich_menu_operator_mode=dry_run",
    `menu_type=${result.menuType}`,
    `definition_available=${result.definitionAvailable}`,
    `image_available=${result.imageAvailable}`,
    `image_size_bytes=${result.imageBytes ?? "unknown"}`,
    `validation_passed=${result.validationPassed}`,
    `rich_menu_area_count=${result.areaCount}`,
    `message_action_count=${result.messageActionCount}`,
    `uri_action_count=${result.uriActionCount}`,
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
  liffId?: string;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<LineRichMenuApplyResult> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const token = input.channelAccessToken.trim();
  const liffId = input.liffId?.trim() ?? "";

  if (!token) {
    throw new LineRichMenuOperatorError("line_channel_access_token_missing");
  }

  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  const createResult = await createRichMenu({
    repoRoot,
    menuType: "default",
    token,
    liffId,
    fetchImplementation
  });
  try {
    await setDefaultRichMenu({
      token,
      richMenuId: createResult.richMenuId,
      fetchImplementation
    });
  } catch (error) {
    await deleteRichMenuBestEffort({
      token,
      richMenuId: createResult.richMenuId,
      fetchImplementation
    });
    throw error;
  }

  return {
    createRichMenuStatus: "success",
    uploadImageStatus: "success",
    setDefaultStatus: "success",
    menuType: "default",
    liffUrlApplied: createResult.liffUrlApplied,
    liffIdRecorded: false,
    richMenuIdRecorded: false,
    lineSendAttempted: false,
    secretRecorded: false
  };
}

export function formatLineRichMenuApplyResult(result: LineRichMenuApplyResult): string {
  return [
    "line_rich_menu_operator_mode=apply",
    `menu_type=${result.menuType}`,
    `create_rich_menu_status=${result.createRichMenuStatus}`,
    `upload_rich_menu_image_status=${result.uploadImageStatus}`,
    `set_default_rich_menu_status=${result.setDefaultStatus}`,
    `liff_url_applied=${result.liffUrlApplied}`,
    `liff_id_recorded=${result.liffIdRecorded}`,
    `rich_menu_id_recorded=${result.richMenuIdRecorded}`,
    `line_send_attempted=${result.lineSendAttempted}`,
    `secret_recorded=${result.secretRecorded}`
  ].join("\n");
}

export async function applyCustomRichMenu(input: {
  repoRoot?: string;
  assetDirectory: string;
  channelAccessToken: string;
  richMenuIdOutputPath: string;
  setDefault?: boolean;
  fetchImplementation?: typeof globalThis.fetch;
  writeRichMenuIdOutputImplementation?: (
    outputPath: string,
    richMenuId: string
  ) => Promise<void>;
}): Promise<CustomLineRichMenuApplyResult> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const token = input.channelAccessToken.trim();
  const richMenuIdOutputPath = input.richMenuIdOutputPath.trim();

  if (!token) {
    throw new LineRichMenuOperatorError("line_channel_access_token_missing");
  }

  if (!richMenuIdOutputPath) {
    throw new LineRichMenuOperatorError("rich_menu_id_output_path_missing");
  }

  const preflight = await runCustomLineRichMenuDryRun(repoRoot, input.assetDirectory);

  if (!preflight.validationPassed) {
    throw new LineRichMenuOperatorError("rich_menu_custom_preflight_failed");
  }

  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  const paths = await resolveCustomAssetPaths(repoRoot, input.assetDirectory, true);
  const definition = await loadRichMenuDefinitionFromAssetDirectory(repoRoot, input.assetDirectory);
  const createResult = await createRichMenuFromAssets({
    definition,
    imagePath: paths.imagePath,
    token,
    fetchImplementation
  });

  try {
    if (input.setDefault) {
      await setDefaultRichMenu({
        token,
        richMenuId: createResult.richMenuId,
        fetchImplementation
      });
    }

    const writeRichMenuIdOutputImplementation =
      input.writeRichMenuIdOutputImplementation ?? writeCustomRichMenuIdOutput;
    await writeRichMenuIdOutputImplementation(
      richMenuIdOutputPath,
      createResult.richMenuId
    );
  } catch (error) {
    await deleteRichMenuBestEffort({
      token,
      richMenuId: createResult.richMenuId,
      fetchImplementation
    });
    throw error;
  }

  return {
    createRichMenuStatus: "success",
    uploadImageStatus: "success",
    setDefaultStatus: input.setDefault ? "success" : "skipped",
    assetDirectoryValidated: true,
    richMenuIdOutputWritten: true,
    richMenuIdRecorded: false,
    lineSendAttempted: false,
    secretRecorded: false
  };
}

export function formatCustomLineRichMenuApplyResult(result: CustomLineRichMenuApplyResult): string {
  return [
    "line_rich_menu_operator_mode=apply_custom",
    `create_rich_menu_status=${result.createRichMenuStatus}`,
    `upload_rich_menu_image_status=${result.uploadImageStatus}`,
    `set_default_rich_menu_status=${result.setDefaultStatus}`,
    `asset_directory_validated=${result.assetDirectoryValidated}`,
    `rich_menu_id_output_written=${result.richMenuIdOutputWritten}`,
    `rich_menu_id_recorded=${result.richMenuIdRecorded}`,
    `line_send_attempted=${result.lineSendAttempted}`,
    `secret_recorded=${result.secretRecorded}`
  ].join("\n");
}

export async function applyLifecycleRichMenus(input: {
  repoRoot?: string;
  channelAccessToken: string;
  liffId?: string;
  richMenuEnvOutputPath?: string;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<LineRichMenuLifecycleApplyResult> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const token = input.channelAccessToken.trim();
  const liffId = input.liffId?.trim() ?? "";

  if (!token) {
    throw new LineRichMenuOperatorError("line_channel_access_token_missing");
  }

  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  const createdRichMenuIds = new Map<LineRichMenuLifecycleKey, string>();
  let liffUrlApplied = false;

  try {
    for (const menuType of LINE_RICH_MENU_LIFECYCLE_KEYS) {
      const createResult = await createRichMenu({
        repoRoot,
        menuType,
        token,
        liffId,
        fetchImplementation
      });
      createdRichMenuIds.set(menuType, createResult.richMenuId);
      liffUrlApplied = liffUrlApplied || createResult.liffUrlApplied;
    }

    const initialRichMenuId = createdRichMenuIds.get("initial");

    if (!initialRichMenuId) {
      throw new LineRichMenuOperatorError("initial_rich_menu_id_missing");
    }

    await setDefaultRichMenu({
      token,
      richMenuId: initialRichMenuId,
      fetchImplementation
    });

    if (input.richMenuEnvOutputPath) {
      await writeRichMenuEnvOutput(input.richMenuEnvOutputPath, createdRichMenuIds);
    }
  } catch (error) {
    await deleteRichMenusBestEffort({
      token,
      richMenuIds: [...createdRichMenuIds.values()],
      fetchImplementation
    });
    throw error;
  }

  return {
    createRichMenuStatus: "success",
    uploadImageStatus: "success",
    setDefaultStatus: "success",
    lifecycleMenuCount: LINE_RICH_MENU_LIFECYCLE_KEYS.length,
    defaultMenuType: "initial",
    initialRichMenuCreated: true,
    negotiationRichMenuCreated: true,
    aftercareRichMenuCreated: true,
    richMenuEnvOutputWritten: Boolean(input.richMenuEnvOutputPath),
    liffUrlApplied,
    liffIdRecorded: false,
    richMenuIdRecorded: false,
    lineSendAttempted: false,
    secretRecorded: false
  };
}

export function formatLineRichMenuLifecycleApplyResult(
  result: LineRichMenuLifecycleApplyResult
): string {
  return [
    "line_rich_menu_operator_mode=apply_lifecycle",
    `lifecycle_menu_count=${result.lifecycleMenuCount}`,
    `initial_rich_menu_created=${result.initialRichMenuCreated}`,
    `negotiation_rich_menu_created=${result.negotiationRichMenuCreated}`,
    `aftercare_rich_menu_created=${result.aftercareRichMenuCreated}`,
    `default_menu_type=${result.defaultMenuType}`,
    `create_rich_menu_status=${result.createRichMenuStatus}`,
    `upload_rich_menu_image_status=${result.uploadImageStatus}`,
    `set_default_rich_menu_status=${result.setDefaultStatus}`,
    `rich_menu_env_output_written=${result.richMenuEnvOutputWritten}`,
    `liff_url_applied=${result.liffUrlApplied}`,
    `liff_id_recorded=${result.liffIdRecorded}`,
    `rich_menu_id_recorded=${result.richMenuIdRecorded}`,
    `line_send_attempted=${result.lineSendAttempted}`,
    `secret_recorded=${result.secretRecorded}`
  ].join("\n");
}

export async function removeDefaultRichMenu(input: {
  channelAccessToken: string;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<LineRichMenuRemoveDefaultResult> {
  const token = input.channelAccessToken.trim();

  if (!token) {
    throw new LineRichMenuOperatorError("line_channel_access_token_missing");
  }

  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  const response = await fetchImplementation("https://api.line.me/v2/bot/user/all/richmenu", {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new LineRichMenuOperatorError("rich_menu_remove_default_failed");
  }

  return {
    removeDefaultRichMenuStatus: "success",
    richMenuIdRecorded: false,
    lineSendAttempted: false,
    secretRecorded: false
  };
}

export function formatLineRichMenuRemoveDefaultResult(
  result: LineRichMenuRemoveDefaultResult
): string {
  return [
    "line_rich_menu_operator_mode=remove_default",
    `remove_default_rich_menu_status=${result.removeDefaultRichMenuStatus}`,
    `rich_menu_id_recorded=${result.richMenuIdRecorded}`,
    `line_send_attempted=${result.lineSendAttempted}`,
    `secret_recorded=${result.secretRecorded}`
  ].join("\n");
}

export function buildRichMenuDefinitionForApply(
  definition: LineRichMenuDefinition,
  liffId: string
): LineRichMenuDefinition {
  const trimmedLiffId = liffId.trim();

  if (!trimmedLiffId) {
    throw new LineRichMenuOperatorError("line_liff_id_missing");
  }

  return {
    ...definition,
    areas: definition.areas.map((area) => {
      if (area.action.type !== "uri") {
        return area;
      }

      if (area.action.uri === CUSTOMER_REGISTRATION_ENDPOINT) {
        return {
          ...area,
          action: {
            ...area.action,
            uri: buildLiffUrl(trimmedLiffId)
          }
        };
      }

      if (area.action.uri === CONTACT_CHANGE_ENDPOINT) {
        return {
          ...area,
          action: {
            ...area.action,
            uri: buildLiffUrl(trimmedLiffId, "?mode=contact-change")
          }
        };
      }

      return area;
    })
  };
}

async function createRichMenu(input: {
  repoRoot: string;
  menuType: LineRichMenuAssetKey;
  token: string;
  liffId: string;
  fetchImplementation: typeof globalThis.fetch;
}): Promise<{ richMenuId: string; liffUrlApplied: boolean }> {
  const sourceDefinition = await loadAmamiHomeRichMenuDefinition(input.repoRoot, input.menuType);
  const definition = input.liffId
    ? buildRichMenuDefinitionForApply(sourceDefinition, input.liffId)
    : sourceDefinition;
  const validationErrors = validateRichMenuDefinition(definition);

  if (validationErrors.length > 0) {
    throw new LineRichMenuOperatorError("rich_menu_definition_invalid");
  }

  const result = await createRichMenuFromAssets({
    definition,
    imagePath: path.join(input.repoRoot, getRichMenuImagePath(input.menuType)),
    token: input.token,
    fetchImplementation: input.fetchImplementation
  });

  return {
    richMenuId: result.richMenuId,
    liffUrlApplied: Boolean(input.liffId)
  };
}

async function createRichMenuFromAssets(input: {
  definition: LineRichMenuDefinition;
  imagePath: string;
  token: string;
  fetchImplementation: typeof globalThis.fetch;
}): Promise<{ richMenuId: string }> {
  if (validateRichMenuDefinition(input.definition).length > 0) {
    throw new LineRichMenuOperatorError("rich_menu_definition_invalid");
  }

  const image = await readFile(input.imagePath);
  const createResponse = await input.fetchImplementation("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(input.definition)
  });

  if (!createResponse.ok) {
    throw new LineRichMenuOperatorError("rich_menu_create_failed");
  }

  const createBody: unknown = await createResponse.json();
  const richMenuId = readRichMenuId(createBody);

  try {
    const uploadResponse = await input.fetchImplementation(
      `https://api-data.line.me/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.token}`,
          "content-type": "image/png"
        },
        body: image
      }
    );

    if (!uploadResponse.ok) {
      throw new LineRichMenuOperatorError("rich_menu_image_upload_failed");
    }
  } catch (error) {
    await deleteRichMenuBestEffort({
      token: input.token,
      richMenuId,
      fetchImplementation: input.fetchImplementation
    });
    throw error;
  }

  return {
    richMenuId
  };
}

async function resolveCustomAssetPaths(
  repoRoot: string,
  assetDirectory: string,
  requireImage: boolean
): Promise<{ assetDirectory: string; definitionPath: string; imagePath: string }> {
  const trimmedDirectory = assetDirectory.trim();

  if (!trimmedDirectory || path.isAbsolute(trimmedDirectory)) {
    throw new LineRichMenuOperatorError("rich_menu_asset_directory_invalid");
  }

  const resolvedRepoRoot = await realpath(repoRoot);
  const candidateDirectory = path.resolve(resolvedRepoRoot, trimmedDirectory);

  if (!isPathInside(resolvedRepoRoot, candidateDirectory)) {
    throw new LineRichMenuOperatorError("rich_menu_asset_directory_outside_repo");
  }

  const resolvedAssetDirectory = await realpath(candidateDirectory).catch(() => {
    throw new LineRichMenuOperatorError("rich_menu_asset_directory_missing");
  });

  if (!isPathInside(resolvedRepoRoot, resolvedAssetDirectory)) {
    throw new LineRichMenuOperatorError("rich_menu_asset_directory_outside_repo");
  }

  const definitionPath = await resolveAssetFile(resolvedAssetDirectory, "rich-menu.json");
  let imagePath = path.join(resolvedAssetDirectory, "rich-menu.png");

  if (requireImage) {
    imagePath = await resolveAssetFile(resolvedAssetDirectory, "rich-menu.png");
  }

  return { assetDirectory: resolvedAssetDirectory, definitionPath, imagePath };
}

async function resolveAssetFile(assetDirectory: string, filename: string): Promise<string> {
  const resolvedFile = await realpath(path.join(assetDirectory, filename)).catch(() => {
    throw new LineRichMenuOperatorError(`rich_menu_asset_${filename === "rich-menu.png" ? "image" : "definition"}_missing`);
  });

  if (!isPathInside(assetDirectory, resolvedFile)) {
    throw new LineRichMenuOperatorError("rich_menu_asset_file_outside_directory");
  }

  return resolvedFile;
}

function isPathInside(parentPath: string, candidatePath: string): boolean {
  return candidatePath.startsWith(`${parentPath}${path.sep}`);
}

async function setDefaultRichMenu(input: {
  token: string;
  richMenuId: string;
  fetchImplementation: typeof globalThis.fetch;
}): Promise<void> {
  const defaultResponse = await input.fetchImplementation(
    `https://api.line.me/v2/bot/user/all/richmenu/${encodeURIComponent(input.richMenuId)}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.token}`
      }
    }
  );

  if (!defaultResponse.ok) {
    throw new LineRichMenuOperatorError("rich_menu_set_default_failed");
  }
}

async function deleteRichMenu(input: {
  token: string;
  richMenuId: string;
  fetchImplementation: typeof globalThis.fetch;
}): Promise<void> {
  const deleteResponse = await input.fetchImplementation(
    `https://api.line.me/v2/bot/richmenu/${encodeURIComponent(input.richMenuId)}`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${input.token}`
      }
    }
  );

  if (!deleteResponse.ok) {
    throw new LineRichMenuOperatorError("rich_menu_delete_failed");
  }
}

async function deleteRichMenuBestEffort(input: {
  token: string;
  richMenuId: string;
  fetchImplementation: typeof globalThis.fetch;
}): Promise<void> {
  try {
    await deleteRichMenu(input);
  } catch {
    // Preserve the original apply failure while making cleanup best effort.
  }
}

async function deleteRichMenusBestEffort(input: {
  token: string;
  richMenuIds: string[];
  fetchImplementation: typeof globalThis.fetch;
}): Promise<void> {
  for (const richMenuId of [...input.richMenuIds].reverse()) {
    await deleteRichMenuBestEffort({
      token: input.token,
      richMenuId,
      fetchImplementation: input.fetchImplementation
    });
  }
}

async function writeRichMenuEnvOutput(
  outputPath: string,
  richMenuIds: Map<LineRichMenuLifecycleKey, string>
): Promise<void> {
  const replacements = new Map<string, string>();

  for (const menuType of LINE_RICH_MENU_LIFECYCLE_KEYS) {
    const richMenuId = richMenuIds.get(menuType);

    if (!richMenuId) {
      throw new LineRichMenuOperatorError(`${menuType}_rich_menu_id_missing`);
    }

    replacements.set(LINE_RICH_MENU_ENV_KEYS[menuType], richMenuId);
  }

  await writeEnvironmentOutput(outputPath, replacements);
}

async function writeCustomRichMenuIdOutput(
  outputPath: string,
  richMenuId: string
): Promise<void> {
  await writeEnvironmentOutput(
    outputPath,
    new Map([[CUSTOM_LINE_RICH_MENU_ENV_KEY, richMenuId]])
  );
}

async function writeEnvironmentOutput(
  outputPath: string,
  replacements: Map<string, string>
): Promise<void> {
  const existingBody = await readFile(outputPath, "utf8").catch(() => "");

  const seenKeys = new Set<string>();
  const lines = existingBody.length > 0 ? existingBody.split(/\r?\n/) : [];
  const outputLines = lines.map((line) => {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)=/.exec(line);
    const key = match?.[1];

    if (!key || !replacements.has(key)) {
      return line;
    }

    seenKeys.add(key);
    return `${key}=${quoteEnvValue(replacements.get(key) ?? "")}`;
  });

  for (const [key, value] of replacements) {
    if (!seenKeys.has(key)) {
      outputLines.push(`${key}=${quoteEnvValue(value)}`);
    }
  }

  await writeFile(outputPath, `${outputLines.join("\n").replace(/\n+$/, "")}\n`, { mode: 0o600 });
  await chmod(outputPath, 0o600);
}

function quoteEnvValue(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildLiffUrl(liffId: string, suffix = ""): string {
  return `https://liff.line.me/${encodeURIComponent(liffId)}${suffix}`;
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

  const baseValid =
    typeof value.bounds.x === "number" &&
    typeof value.bounds.y === "number" &&
    typeof value.bounds.width === "number" &&
    typeof value.bounds.height === "number" &&
    typeof value.action.type === "string" &&
    typeof value.action.label === "string";

  if (!baseValid) {
    return false;
  }

  if (value.action.type === "message") {
    return typeof value.action.text === "string";
  }

  if (value.action.type === "uri") {
    return typeof value.action.uri === "string";
  }

  return false;
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
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const assetDirectory = readOptionValue(argv, "--asset-dir");

  if (assetDirectory) {
    if (args.has("--apply")) {
      if (process.env.LINE_RICH_MENU_APPLY_APPROVED !== LINE_RICH_MENU_APPLY_APPROVAL) {
        throw new LineRichMenuOperatorError("line_rich_menu_apply_not_approved");
      }

      const result = await applyCustomRichMenu({
        assetDirectory,
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
        richMenuIdOutputPath: readOptionValue(argv, "--rich-menu-id-output") ?? "",
        setDefault: args.has("--set-default")
      });
      console.log(formatCustomLineRichMenuApplyResult(result));
      return;
    }

    const result = await runCustomLineRichMenuDryRun(process.cwd(), assetDirectory);
    console.log(formatLineRichMenuDryRunResult(result));
    return;
  }

  if (args.has("--apply")) {
    if (process.env.LINE_RICH_MENU_APPLY_APPROVED !== LINE_RICH_MENU_APPLY_APPROVAL) {
      throw new LineRichMenuOperatorError("line_rich_menu_apply_not_approved");
    }

    const result = await applyDefaultRichMenu({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
      liffId: process.env.LINE_LIFF_ID ?? process.env.NEXT_PUBLIC_LIFF_ID ?? process.env.LIFF_ID
    });
    console.log(formatLineRichMenuApplyResult(result));
    return;
  }

  if (args.has("--apply-lifecycle")) {
    if (process.env.LINE_RICH_MENU_APPLY_APPROVED !== LINE_RICH_MENU_APPLY_APPROVAL) {
      throw new LineRichMenuOperatorError("line_rich_menu_apply_not_approved");
    }

    const result = await applyLifecycleRichMenus({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
      liffId: process.env.LINE_LIFF_ID ?? process.env.NEXT_PUBLIC_LIFF_ID ?? process.env.LIFF_ID,
      richMenuEnvOutputPath: readOptionValue(argv, "--rich-menu-env-output")
    });
    console.log(formatLineRichMenuLifecycleApplyResult(result));
    return;
  }

  if (args.has("--remove-default")) {
    if (process.env.LINE_RICH_MENU_REMOVE_APPROVED !== LINE_RICH_MENU_REMOVE_APPROVAL) {
      throw new LineRichMenuOperatorError("line_rich_menu_remove_not_approved");
    }

    const result = await removeDefaultRichMenu({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ""
    });
    console.log(formatLineRichMenuRemoveDefaultResult(result));
    return;
  }

  const result = await runLineRichMenuDryRun();
  console.log(formatLineRichMenuDryRunResult(result));
}

function readOptionValue(argv: string[], optionName: string): string | undefined {
  const index = argv.indexOf(optionName);

  if (index === -1) {
    return undefined;
  }

  const value = argv[index + 1]?.trim();
  return value ? value : undefined;
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
