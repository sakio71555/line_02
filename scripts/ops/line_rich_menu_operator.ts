import { mkdir, open, readFile, realpath, rename, rmdir, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
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
export const LINE_RICH_MENU_PUBLICATION_LEASE_TTL_SECONDS = 300;
export const LINE_RICH_MENU_PUBLICATION_LEASE_REQUEST_TIMEOUT_MILLISECONDS = 10_000;
export const LINE_RICH_MENU_PUBLICATION_LOCK_PATH = path.join(
  "tmp",
  "locks",
  "line-rich-menu-publication.lock"
);
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
  richMenuEnvOutputWritten: true;
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

export interface LineRichMenuPublicationLease {
  readonly renewalIntervalMilliseconds?: number;
  tryAcquire(holderId: string): Promise<boolean>;
  renew(holderId: string): Promise<boolean>;
  release(holderId: string): Promise<boolean>;
}

export class LineRichMenuOperatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LineRichMenuOperatorError";
  }
}

export class LineRichMenuCleanupRequiredError extends LineRichMenuOperatorError {
  readonly applyFailureReason: string;
  readonly cleanupFailureCount: number;

  constructor(applyFailureReason: string, cleanupFailureCount: number) {
    super("rich_menu_apply_failed_cleanup_required");
    this.name = "LineRichMenuCleanupRequiredError";
    this.applyFailureReason = applyFailureReason;
    this.cleanupFailureCount = cleanupFailureCount;
  }
}

class LineRichMenuMutationOutcomeUnknownError extends LineRichMenuOperatorError {
  constructor() {
    super("rich_menu_mutation_result_unknown");
    this.name = "LineRichMenuMutationOutcomeUnknownError";
  }
}

export function createSupabaseLineRichMenuPublicationLease(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  tenantId: string;
  channelId: string;
  leaseTtlSeconds?: number;
  requestTimeoutMilliseconds?: number;
  fetchImplementation?: typeof globalThis.fetch;
}): LineRichMenuPublicationLease {
  const supabaseUrl = input.supabaseUrl.trim().replace(/\/+$/, "");
  const serviceRoleKey = input.serviceRoleKey.trim();
  const tenantId = input.tenantId.trim();
  const channelId = input.channelId.trim();
  const leaseTtlSeconds = input.leaseTtlSeconds ?? LINE_RICH_MENU_PUBLICATION_LEASE_TTL_SECONDS;
  const requestTimeoutMilliseconds =
    input.requestTimeoutMilliseconds ??
    LINE_RICH_MENU_PUBLICATION_LEASE_REQUEST_TIMEOUT_MILLISECONDS;

  if (!supabaseUrl || !serviceRoleKey || !tenantId || !channelId) {
    throw new LineRichMenuOperatorError("rich_menu_publication_lease_config_missing");
  }

  try {
    const parsedUrl = new URL(supabaseUrl);

    if (parsedUrl.protocol !== "https:") {
      throw new Error("invalid_protocol");
    }
  } catch {
    throw new LineRichMenuOperatorError("rich_menu_publication_lease_url_invalid");
  }

  if (!Number.isInteger(leaseTtlSeconds) || leaseTtlSeconds < 1 || leaseTtlSeconds > 3600) {
    throw new LineRichMenuOperatorError("rich_menu_publication_lease_ttl_invalid");
  }

  if (
    !Number.isInteger(requestTimeoutMilliseconds) ||
    requestTimeoutMilliseconds < 1 ||
    requestTimeoutMilliseconds > 60_000
  ) {
    throw new LineRichMenuOperatorError("rich_menu_publication_lease_request_timeout_invalid");
  }

  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  const channelFingerprint = createHash("sha256").update(channelId).digest("hex");
  const leaseKey = `line_rich_menu_publication:${channelFingerprint.slice(0, 32)}`;

  const callLeaseRpc = async (
    functionName: "try_acquire_runtime_lease" | "renew_runtime_lease" | "release_runtime_lease",
    holderId: string
  ): Promise<boolean> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMilliseconds);

    try {
      let response: Response;

      try {
        response = await fetchImplementation(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            p_tenant_id: tenantId,
            p_lease_key: leaseKey,
            p_holder_id: holderId,
            ...(functionName === "release_runtime_lease"
              ? {}
              : { p_lease_ttl_seconds: leaseTtlSeconds })
          }),
          signal: controller.signal
        });
      } catch {
        throw new LineRichMenuOperatorError("rich_menu_publication_lease_request_failed");
      }

      if (!response.ok) {
        throw new LineRichMenuOperatorError("rich_menu_publication_lease_request_failed");
      }

      try {
        const result: unknown = await response.json();

        if (typeof result !== "boolean") {
          throw new Error("invalid_boolean_response");
        }

        return result;
      } catch {
        if (controller.signal.aborted) {
          throw new LineRichMenuOperatorError("rich_menu_publication_lease_request_failed");
        }

        throw new LineRichMenuOperatorError("rich_menu_publication_lease_response_invalid");
      }
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    renewalIntervalMilliseconds: Math.max(250, Math.floor((leaseTtlSeconds * 1000) / 3)),
    tryAcquire: (holderId) => callLeaseRpc("try_acquire_runtime_lease", holderId),
    renew: (holderId) => callLeaseRpc("renew_runtime_lease", holderId),
    release: (holderId) => callLeaseRpc("release_runtime_lease", holderId)
  };
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
    validationPassed:
      validationErrors.length === 0 &&
      imageAvailable &&
      imageBytes !== null &&
      imageBytes <= 1_000_000,
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
    validationPassed:
      validationErrors.length === 0 &&
      imageAvailable &&
      imageBytes !== null &&
      imageBytes <= 1_000_000,
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
  publicationLease: LineRichMenuPublicationLease;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<LineRichMenuApplyResult> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const token = input.channelAccessToken.trim();
  const liffId = input.liffId?.trim() ?? "";

  if (!token) {
    throw new LineRichMenuOperatorError("line_channel_access_token_missing");
  }

  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  return withLineRichMenuPublicationLock(
    repoRoot,
    input.publicationLease,
    async (assertLeaseOwned) => {
      const guardedFetch = createPublicationLeaseGuardedFetch(
        fetchImplementation,
        assertLeaseOwned
      );
      const createResult = await createRichMenu({
        repoRoot,
        menuType: "default",
        token,
        liffId,
        fetchImplementation: guardedFetch
      });
      try {
        await setDefaultRichMenu({
          token,
          richMenuId: createResult.richMenuId,
          fetchImplementation: guardedFetch
        });
      } catch (error) {
        await rollbackRichMenusAndRethrow({
          error,
          token,
          richMenuIds: [createResult.richMenuId],
          activeRichMenuId: createResult.richMenuId,
          defaultRichMenuSetAttempted: true,
          fetchImplementation: guardedFetch
        });
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
  );
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
  publicationLease: LineRichMenuPublicationLease;
  fetchImplementation?: typeof globalThis.fetch;
  writeRichMenuIdOutputImplementation?: (outputPath: string, richMenuId: string) => Promise<void>;
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
  return withLineRichMenuPublicationLock(
    repoRoot,
    input.publicationLease,
    async (assertLeaseOwned) => {
      const guardedFetch = createPublicationLeaseGuardedFetch(
        fetchImplementation,
        assertLeaseOwned
      );
      const paths = await resolveCustomAssetPaths(repoRoot, input.assetDirectory, true);
      const definition = await loadRichMenuDefinitionFromAssetDirectory(
        repoRoot,
        input.assetDirectory
      );
      const createResult = await createRichMenuFromAssets({
        definition,
        imagePath: paths.imagePath,
        token,
        fetchImplementation: guardedFetch
      });
      let defaultRichMenuSetAttempted = false;

      try {
        if (input.setDefault) {
          defaultRichMenuSetAttempted = true;
          await setDefaultRichMenu({
            token,
            richMenuId: createResult.richMenuId,
            fetchImplementation: guardedFetch
          });
        }

        const writeRichMenuIdOutputImplementation =
          input.writeRichMenuIdOutputImplementation ?? writeCustomRichMenuIdOutput;
        await assertLeaseOwned();
        await writeRichMenuIdOutputImplementation(richMenuIdOutputPath, createResult.richMenuId);
      } catch (error) {
        await rollbackRichMenusAndRethrow({
          error,
          token,
          richMenuIds: [createResult.richMenuId],
          activeRichMenuId: createResult.richMenuId,
          defaultRichMenuSetAttempted,
          fetchImplementation: guardedFetch
        });
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
  );
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
  richMenuEnvOutputPath: string;
  publicationLease: LineRichMenuPublicationLease;
  fetchImplementation?: typeof globalThis.fetch;
  writeRichMenuEnvOutputImplementation?: (
    outputPath: string,
    richMenuIds: ReadonlyMap<LineRichMenuLifecycleKey, string>
  ) => Promise<void>;
}): Promise<LineRichMenuLifecycleApplyResult> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const token = input.channelAccessToken.trim();
  const liffId = input.liffId?.trim() ?? "";
  const richMenuEnvOutputPath = input.richMenuEnvOutputPath.trim();

  if (!token) {
    throw new LineRichMenuOperatorError("line_channel_access_token_missing");
  }

  if (!richMenuEnvOutputPath) {
    throw new LineRichMenuOperatorError("rich_menu_env_output_path_missing");
  }

  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  return withLineRichMenuPublicationLock(
    repoRoot,
    input.publicationLease,
    async (assertLeaseOwned) => {
      const guardedFetch = createPublicationLeaseGuardedFetch(
        fetchImplementation,
        assertLeaseOwned
      );
      const createdRichMenuIds = new Map<LineRichMenuLifecycleKey, string>();
      let liffUrlApplied = false;
      let defaultRichMenuSetAttempted = false;

      try {
        for (const menuType of LINE_RICH_MENU_LIFECYCLE_KEYS) {
          const createResult = await createRichMenu({
            repoRoot,
            menuType,
            token,
            liffId,
            fetchImplementation: guardedFetch
          });
          createdRichMenuIds.set(menuType, createResult.richMenuId);
          liffUrlApplied = liffUrlApplied || createResult.liffUrlApplied;
        }

        const initialRichMenuId = createdRichMenuIds.get("initial");

        if (!initialRichMenuId) {
          throw new LineRichMenuOperatorError("initial_rich_menu_id_missing");
        }

        defaultRichMenuSetAttempted = true;
        await setDefaultRichMenu({
          token,
          richMenuId: initialRichMenuId,
          fetchImplementation: guardedFetch
        });

        const writeRichMenuEnvOutputImplementation =
          input.writeRichMenuEnvOutputImplementation ?? writeRichMenuEnvOutput;
        await assertLeaseOwned();
        await writeRichMenuEnvOutputImplementation(richMenuEnvOutputPath, createdRichMenuIds);
      } catch (error) {
        await rollbackRichMenusAndRethrow({
          error,
          token,
          richMenuIds: [...createdRichMenuIds.values()],
          activeRichMenuId: createdRichMenuIds.get("initial"),
          defaultRichMenuSetAttempted,
          fetchImplementation: guardedFetch
        });
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
        richMenuEnvOutputWritten: true,
        liffUrlApplied,
        liffIdRecorded: false,
        richMenuIdRecorded: false,
        lineSendAttempted: false,
        secretRecorded: false
      };
    }
  );
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

export function formatLineRichMenuOperatorFailure(error: unknown): string {
  if (error instanceof LineRichMenuCleanupRequiredError) {
    return [
      "line_rich_menu_operator_status=failed",
      `failure_reason=${error.message}`,
      `apply_failure_reason=${error.applyFailureReason}`,
      "cleanup_required=true",
      `cleanup_failure_count=${error.cleanupFailureCount}`
    ].join("\n");
  }

  if (error instanceof LineRichMenuOperatorError) {
    return [
      "line_rich_menu_operator_status=failed",
      `failure_reason=${error.message}`,
      "cleanup_required=false"
    ].join("\n");
  }

  return [
    "line_rich_menu_operator_status=failed",
    "failure_reason=unexpected_error",
    "cleanup_required=false"
  ].join("\n");
}

export async function removeDefaultRichMenu(input: {
  repoRoot?: string;
  channelAccessToken: string;
  publicationLease: LineRichMenuPublicationLease;
  fetchImplementation?: typeof globalThis.fetch;
}): Promise<LineRichMenuRemoveDefaultResult> {
  const repoRoot = input.repoRoot ?? process.cwd();
  const token = input.channelAccessToken.trim();

  if (!token) {
    throw new LineRichMenuOperatorError("line_channel_access_token_missing");
  }

  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  return withLineRichMenuPublicationLock(
    repoRoot,
    input.publicationLease,
    async (assertLeaseOwned) => {
      const guardedFetch = createPublicationLeaseGuardedFetch(
        fetchImplementation,
        assertLeaseOwned
      );
      await clearDefaultRichMenu({ token, fetchImplementation: guardedFetch });

      return {
        removeDefaultRichMenuStatus: "success",
        richMenuIdRecorded: false,
        lineSendAttempted: false,
        secretRecorded: false
      };
    }
  );
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
  let createResponse: Response;

  try {
    createResponse = await input.fetchImplementation("https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(input.definition)
    });
  } catch (error) {
    if (error instanceof LineRichMenuMutationOutcomeUnknownError) {
      throw new LineRichMenuCleanupRequiredError("rich_menu_create_result_unknown", 1);
    }

    throw error;
  }

  if (!createResponse.ok) {
    throw new LineRichMenuOperatorError("rich_menu_create_failed");
  }

  let richMenuId: string;

  try {
    const createBody: unknown = await createResponse.json();
    richMenuId = readRichMenuId(createBody);
  } catch {
    throw new LineRichMenuCleanupRequiredError("rich_menu_create_result_unknown", 1);
  }

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
    const uploadError =
      error instanceof LineRichMenuMutationOutcomeUnknownError
        ? new LineRichMenuOperatorError("rich_menu_image_upload_result_unknown")
        : error;

    await cleanupRichMenusAndRethrow({
      error: uploadError,
      token: input.token,
      richMenuIds: [richMenuId],
      fetchImplementation: input.fetchImplementation
    });
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
    throw new LineRichMenuOperatorError(
      `rich_menu_asset_${filename === "rich-menu.png" ? "image" : "definition"}_missing`
    );
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
  let defaultResponse: Response;

  try {
    defaultResponse = await input.fetchImplementation(
      `https://api.line.me/v2/bot/user/all/richmenu/${encodeURIComponent(input.richMenuId)}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.token}`
        }
      }
    );
  } catch (error) {
    if (error instanceof LineRichMenuMutationOutcomeUnknownError) {
      throw new LineRichMenuOperatorError("rich_menu_set_default_result_unknown");
    }

    throw error;
  }

  if (!defaultResponse.ok) {
    throw new LineRichMenuOperatorError("rich_menu_set_default_failed");
  }
}

async function clearDefaultRichMenu(input: {
  token: string;
  fetchImplementation: typeof globalThis.fetch;
}): Promise<void> {
  let response: Response;

  try {
    response = await input.fetchImplementation("https://api.line.me/v2/bot/user/all/richmenu", {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${input.token}`
      }
    });
  } catch (error) {
    if (error instanceof LineRichMenuMutationOutcomeUnknownError) {
      throw new LineRichMenuCleanupRequiredError(
        "rich_menu_remove_default_result_unknown",
        1
      );
    }

    throw error;
  }

  if (!response.ok) {
    throw new LineRichMenuOperatorError("rich_menu_remove_default_failed");
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
}): Promise<boolean> {
  try {
    await deleteRichMenu(input);
    return true;
  } catch {
    return false;
  }
}

async function deleteRichMenusBestEffort(input: {
  token: string;
  richMenuIds: string[];
  fetchImplementation: typeof globalThis.fetch;
}): Promise<number> {
  let cleanupFailureCount = 0;

  for (const richMenuId of [...input.richMenuIds].reverse()) {
    const cleanupSucceeded = await deleteRichMenuBestEffort({
      token: input.token,
      richMenuId,
      fetchImplementation: input.fetchImplementation
    });

    if (!cleanupSucceeded) {
      cleanupFailureCount += 1;
    }
  }

  return cleanupFailureCount;
}

async function cleanupRichMenusAndRethrow(input: {
  error: unknown;
  token: string;
  richMenuIds: string[];
  fetchImplementation: typeof globalThis.fetch;
}): Promise<never> {
  const additionalCleanupFailureCount = await deleteRichMenusBestEffort({
    token: input.token,
    richMenuIds: input.richMenuIds,
    fetchImplementation: input.fetchImplementation
  });
  const priorCleanupFailureCount =
    input.error instanceof LineRichMenuCleanupRequiredError ? input.error.cleanupFailureCount : 0;
  const cleanupFailureCount = priorCleanupFailureCount + additionalCleanupFailureCount;

  if (cleanupFailureCount > 0) {
    throw new LineRichMenuCleanupRequiredError(
      getSanitizedApplyFailureReason(input.error),
      cleanupFailureCount
    );
  }

  throw input.error;
}

async function rollbackRichMenusAndRethrow(input: {
  error: unknown;
  token: string;
  richMenuIds: string[];
  activeRichMenuId?: string;
  defaultRichMenuSetAttempted: boolean;
  fetchImplementation: typeof globalThis.fetch;
}): Promise<never> {
  const preserveRichMenuId = input.defaultRichMenuSetAttempted ? input.activeRichMenuId : undefined;
  let additionalCleanupFailureCount = 0;

  if (preserveRichMenuId) {
    additionalCleanupFailureCount += 1;
  }

  const deletableRichMenuIds = preserveRichMenuId
    ? input.richMenuIds.filter((richMenuId) => richMenuId !== preserveRichMenuId)
    : input.richMenuIds;

  additionalCleanupFailureCount += await deleteRichMenusBestEffort({
    token: input.token,
    richMenuIds: deletableRichMenuIds,
    fetchImplementation: input.fetchImplementation
  });

  const priorCleanupFailureCount =
    input.error instanceof LineRichMenuCleanupRequiredError ? input.error.cleanupFailureCount : 0;
  const cleanupFailureCount = priorCleanupFailureCount + additionalCleanupFailureCount;

  if (cleanupFailureCount > 0) {
    throw new LineRichMenuCleanupRequiredError(
      getSanitizedApplyFailureReason(input.error),
      cleanupFailureCount
    );
  }

  throw input.error;
}

async function withLineRichMenuPublicationLock<T>(
  repoRoot: string,
  publicationLease: LineRichMenuPublicationLease,
  operation: (assertLeaseOwned: () => Promise<void>) => Promise<T>
): Promise<T> {
  const holderId = randomUUID();
  const releaseLocalLock = await acquireLineRichMenuPublicationLock(repoRoot, holderId);
  let sharedLeaseAcquired = false;
  let sharedLeaseLost = false;
  let renewalInFlight: Promise<void> | undefined;
  let renewalTimer: ReturnType<typeof setInterval> | undefined;
  let operationSucceeded = false;
  let operationResult: T | undefined;
  let operationError: unknown;

  try {
    sharedLeaseAcquired = await publicationLease.tryAcquire(holderId);

    if (!sharedLeaseAcquired) {
      throw new LineRichMenuOperatorError("rich_menu_publication_locked");
    }

    const assertLeaseOwned = async (): Promise<void> => {
      if (sharedLeaseLost) {
        throw new LineRichMenuOperatorError("rich_menu_publication_lease_lost");
      }

      if (!renewalInFlight) {
        renewalInFlight = (async () => {
          let renewed = false;

          try {
            renewed = await publicationLease.renew(holderId);
          } catch {
            renewed = false;
          }

          if (!renewed) {
            sharedLeaseLost = true;
            throw new LineRichMenuOperatorError("rich_menu_publication_lease_lost");
          }
        })().finally(() => {
          renewalInFlight = undefined;
        });
      }

      await renewalInFlight;
    };

    if (publicationLease.renewalIntervalMilliseconds) {
      renewalTimer = setInterval(() => {
        void assertLeaseOwned().catch(() => undefined);
      }, publicationLease.renewalIntervalMilliseconds);
      renewalTimer.unref?.();
    }

    operationResult = await operation(assertLeaseOwned);

    try {
      await assertLeaseOwned();
    } catch {
      throw new LineRichMenuCleanupRequiredError(
        "rich_menu_publication_completion_state_unknown",
        1
      );
    }

    operationSucceeded = true;
  } catch (error) {
    operationError = error;
  }

  if (renewalTimer) {
    clearInterval(renewalTimer);
  }

  await renewalInFlight?.catch(() => undefined);

  let lockReleaseFailureCount = 0;

  if (sharedLeaseAcquired) {
    try {
      if (!(await publicationLease.release(holderId)) && !sharedLeaseLost) {
        lockReleaseFailureCount += 1;
      }
    } catch {
      if (!sharedLeaseLost) {
        lockReleaseFailureCount += 1;
      }
    }
  }

  try {
    await releaseLocalLock();
  } catch {
    lockReleaseFailureCount += 1;
  }

  if (lockReleaseFailureCount > 0) {
    const priorCleanupFailureCount =
      operationError instanceof LineRichMenuCleanupRequiredError
        ? operationError.cleanupFailureCount
        : 0;
    throw new LineRichMenuCleanupRequiredError(
      operationSucceeded
        ? "rich_menu_publication_lock_release_failed"
        : getSanitizedApplyFailureReason(operationError),
      priorCleanupFailureCount + lockReleaseFailureCount
    );
  }

  if (!operationSucceeded) {
    throw operationError;
  }

  return operationResult as T;
}

async function acquireLineRichMenuPublicationLock(
  repoRoot: string,
  holderId: string
): Promise<() => Promise<void>> {
  const lockPath = path.join(repoRoot, LINE_RICH_MENU_PUBLICATION_LOCK_PATH);
  const ownerPath = path.join(lockPath, `owner-${holderId}.json`);

  try {
    await mkdir(path.dirname(lockPath), { recursive: true, mode: 0o700 });
  } catch {
    throw new LineRichMenuOperatorError("rich_menu_publication_lock_prepare_failed");
  }

  try {
    await mkdir(lockPath, { mode: 0o700 });
  } catch (error) {
    if (getErrorCode(error) === "EEXIST") {
      throw new LineRichMenuOperatorError("rich_menu_publication_locked");
    }

    throw new LineRichMenuOperatorError("rich_menu_publication_lock_acquire_failed");
  }

  let ownerHandle: Awaited<ReturnType<typeof open>> | undefined;

  try {
    ownerHandle = await open(ownerPath, "wx", 0o600);
    await ownerHandle.writeFile(
      JSON.stringify({ version: 1, holder_id: holderId, pid: process.pid }) + "\n",
      "utf8"
    );
    await ownerHandle.sync();
    await ownerHandle.close();
    ownerHandle = undefined;
  } catch {
    await ownerHandle?.close().catch(() => undefined);
    await unlink(ownerPath).catch(() => undefined);
    await rmdir(lockPath).catch(() => undefined);
    throw new LineRichMenuOperatorError("rich_menu_publication_lock_acquire_failed");
  }

  let released = false;

  return async () => {
    if (released) {
      return;
    }

    released = true;

    try {
      await unlink(ownerPath);
      await rmdir(lockPath);
    } catch {
      throw new LineRichMenuOperatorError("rich_menu_publication_lock_release_failed");
    }
  };
}

function createPublicationLeaseGuardedFetch(
  fetchImplementation: typeof globalThis.fetch,
  assertLeaseOwned: () => Promise<void>
): typeof globalThis.fetch {
  return (async (input, init) => {
    await assertLeaseOwned();
    let response: Response;

    try {
      response = await fetchImplementation(input, init);
    } catch {
      throw new LineRichMenuMutationOutcomeUnknownError();
    }

    try {
      await assertLeaseOwned();
    } catch {
      throw new LineRichMenuMutationOutcomeUnknownError();
    }

    return response;
  }) as typeof globalThis.fetch;
}

function getErrorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === "string" ? error.code : undefined;
}

function getSanitizedApplyFailureReason(error: unknown): string {
  if (error instanceof LineRichMenuCleanupRequiredError) {
    return error.applyFailureReason;
  }

  if (error instanceof LineRichMenuOperatorError) {
    return error.message;
  }

  return "unexpected_error";
}

async function writeRichMenuEnvOutput(
  outputPath: string,
  richMenuIds: ReadonlyMap<LineRichMenuLifecycleKey, string>
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

async function writeCustomRichMenuIdOutput(outputPath: string, richMenuId: string): Promise<void> {
  await writeEnvironmentOutput(outputPath, new Map([[CUSTOM_LINE_RICH_MENU_ENV_KEY, richMenuId]]));
}

export async function writeEnvironmentOutput(
  outputPath: string,
  replacements: Map<string, string>,
  writeAtomically: (outputPath: string, body: string) => Promise<void> = writeFileAtomically,
  readExisting: (outputPath: string) => Promise<string> = readExistingEnvironmentOutput
): Promise<void> {
  const existingBody = await readExisting(outputPath);

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

  await writeAtomically(outputPath, `${outputLines.join("\n").replace(/\n+$/, "")}\n`);
}

async function readExistingEnvironmentOutput(outputPath: string): Promise<string> {
  try {
    return await readFile(outputPath, "utf8");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function writeFileAtomically(outputPath: string, body: string): Promise<void> {
  const temporaryPath = path.join(
    path.dirname(outputPath),
    `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`
  );
  let fileHandle: Awaited<ReturnType<typeof open>> | undefined;

  try {
    fileHandle = await open(temporaryPath, "wx", 0o600);
    await fileHandle.writeFile(body, "utf8");
    await fileHandle.sync();
    await fileHandle.close();
    fileHandle = undefined;
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await fileHandle?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
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

      const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
      const result = await applyCustomRichMenu({
        assetDirectory,
        channelAccessToken,
        richMenuIdOutputPath: readOptionValue(argv, "--rich-menu-id-output") ?? "",
        setDefault: args.has("--set-default"),
        publicationLease: createPublicationLeaseFromEnvironment()
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

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
    const result = await applyDefaultRichMenu({
      channelAccessToken,
      liffId: process.env.LINE_LIFF_ID ?? process.env.NEXT_PUBLIC_LIFF_ID ?? process.env.LIFF_ID,
      publicationLease: createPublicationLeaseFromEnvironment()
    });
    console.log(formatLineRichMenuApplyResult(result));
    return;
  }

  if (args.has("--apply-lifecycle")) {
    if (process.env.LINE_RICH_MENU_APPLY_APPROVED !== LINE_RICH_MENU_APPLY_APPROVAL) {
      throw new LineRichMenuOperatorError("line_rich_menu_apply_not_approved");
    }

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
    const result = await applyLifecycleRichMenus({
      channelAccessToken,
      liffId: process.env.LINE_LIFF_ID ?? process.env.NEXT_PUBLIC_LIFF_ID ?? process.env.LIFF_ID,
      richMenuEnvOutputPath: readOptionValue(argv, "--rich-menu-env-output") ?? "",
      publicationLease: createPublicationLeaseFromEnvironment()
    });
    console.log(formatLineRichMenuLifecycleApplyResult(result));
    return;
  }

  if (args.has("--remove-default")) {
    if (process.env.LINE_RICH_MENU_REMOVE_APPROVED !== LINE_RICH_MENU_REMOVE_APPROVAL) {
      throw new LineRichMenuOperatorError("line_rich_menu_remove_not_approved");
    }

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
    const result = await removeDefaultRichMenu({
      channelAccessToken,
      publicationLease: createPublicationLeaseFromEnvironment()
    });
    console.log(formatLineRichMenuRemoveDefaultResult(result));
    return;
  }

  const result = await runLineRichMenuDryRun();
  console.log(formatLineRichMenuDryRunResult(result));
}

function createPublicationLeaseFromEnvironment(): LineRichMenuPublicationLease {
  return createSupabaseLineRichMenuPublicationLease({
    supabaseUrl: process.env.SUPABASE_URL ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    tenantId: process.env.TENANT_ID ?? "",
    channelId: process.env.LINE_CHANNEL_ID ?? ""
  });
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
    console.error(formatLineRichMenuOperatorFailure(error));
    process.exitCode = 1;
  });
}
