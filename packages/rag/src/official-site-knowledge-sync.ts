import { createHash, randomUUID } from "node:crypto";

import { DomUtils, parseDocument } from "htmlparser2";

import type {
  KnowledgePage,
  KnowledgePageRepository,
  KnowledgePageWrite,
  WritableKnowledgePageRepository
} from "./index";

const allowedOfficialHosts = new Set(["amamihome.net", "www.amamihome.net"]);
const ignoredContentTags = new Set([
  "button",
  "footer",
  "form",
  "header",
  "nav",
  "noscript",
  "script",
  "style",
  "svg",
  "template"
]);
const preferredContentTags = ["main", "article", "body"];
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_HTML_BYTES = 1_000_000;
const DEFAULT_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_REFRESH_LEASE_TTL_MS = 30 * 60 * 1000;
const MAX_REFRESH_LEASE_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_REFRESH_LEASE_KEY = "official_site_knowledge_refresh";
const MAX_REDIRECTS = 3;
const MIN_EXTRACTED_TEXT_LENGTH = 40;
const MAX_EXTRACTED_TEXT_LENGTH = 40_000;

export interface OfficialSiteHtmlResult {
  final_url: string;
  html: string;
}

export interface OfficialSiteHttpClient {
  fetchHtml(url: string): Promise<OfficialSiteHtmlResult>;
}

export interface RefreshOfficialSiteKnowledgeInput {
  sources: KnowledgePage[];
  repository: WritableKnowledgePageRepository;
  httpClient?: OfficialSiteHttpClient;
  now?: () => string;
  beforeCommit?: () => Promise<void>;
}

export interface OfficialSiteKnowledgeRefreshResult {
  requested: number;
  refreshed: number;
  failed: number;
}

export interface OfficialSiteKnowledgeRefreshScheduler {
  runNow(): Promise<OfficialSiteKnowledgeRefreshResult | null>;
  stop(): void;
}

export interface OfficialSiteKnowledgeRefreshLeaseRepository {
  tryAcquireOfficialSiteKnowledgeRefreshLease(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
    lease_ttl_seconds: number;
  }): Promise<boolean>;
  renewOfficialSiteKnowledgeRefreshLease(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
    lease_ttl_seconds: number;
  }): Promise<boolean>;
  releaseOfficialSiteKnowledgeRefreshLease(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
  }): Promise<void>;
}

export class FetchOfficialSiteHttpClient implements OfficialSiteHttpClient {
  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    private readonly maxHtmlBytes = DEFAULT_MAX_HTML_BYTES
  ) {}

  async fetchHtml(url: string): Promise<OfficialSiteHtmlResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let currentUrl = assertAllowedOfficialSiteUrl(url);

      for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
        const response = await this.fetchImplementation(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            accept: "text/html,application/xhtml+xml",
            "user-agent": "amami-line-crm-knowledge-sync/1.0"
          }
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");

          if (!location || redirectCount === MAX_REDIRECTS) {
            throw new Error("official_site_redirect_rejected");
          }

          currentUrl = assertAllowedOfficialSiteUrl(new URL(location, currentUrl).toString());
          continue;
        }

        if (!response.ok) {
          throw new Error("official_site_http_status_rejected");
        }

        const responseUrl = response.url || currentUrl;
        const finalUrl = assertAllowedOfficialSiteUrl(responseUrl);
        const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
          throw new Error("official_site_content_type_rejected");
        }

        const declaredLength = Number(response.headers.get("content-length"));

        if (Number.isFinite(declaredLength) && declaredLength > this.maxHtmlBytes) {
          throw new Error("official_site_content_too_large");
        }

        return {
          final_url: finalUrl,
          html: await readResponseTextWithinLimit(response, this.maxHtmlBytes)
        };
      }

      throw new Error("official_site_redirect_rejected");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function refreshOfficialSiteKnowledge(
  input: RefreshOfficialSiteKnowledgeInput
): Promise<OfficialSiteKnowledgeRefreshResult> {
  const httpClient = input.httpClient ?? new FetchOfficialSiteHttpClient();
  const crawledAt = input.now?.() ?? new Date().toISOString();
  const sourcesByUrl = groupSourcesByUrl(input.sources);
  const refreshedPages: KnowledgePageWrite[] = [];
  let failed = 0;

  for (const [url, sources] of sourcesByUrl) {
    try {
      const response = await httpClient.fetchHtml(url);
      assertAllowedOfficialSiteUrl(response.final_url);
      const content = extractOfficialSitePageText(response.html);
      const checksum = createHash("sha256").update(content, "utf8").digest("hex");

      for (const source of sources) {
        refreshedPages.push({
          ...source,
          checksum,
          content,
          last_crawled_at: crawledAt,
          created_at: crawledAt,
          updated_at: crawledAt
        });
      }
    } catch {
      failed += sources.length;
    }
  }

  if (refreshedPages.length > 0) {
    await input.beforeCommit?.();
    await input.repository.upsertMany(refreshedPages);
  }

  return {
    requested: input.sources.length,
    refreshed: refreshedPages.length,
    failed
  };
}

export function startOfficialSiteKnowledgeRefreshScheduler(input: {
  tenant_id: string;
  sources: KnowledgePage[];
  repository: WritableKnowledgePageRepository;
  leaseRepository: OfficialSiteKnowledgeRefreshLeaseRepository;
  httpClient?: OfficialSiteHttpClient;
  now?: () => string;
  intervalMs?: number;
  initialDelayMs?: number;
  leaseTtlMs?: number;
  leaseRenewIntervalMs?: number;
  leaseKey?: string;
  holderId?: string;
  onResult?: (result: OfficialSiteKnowledgeRefreshResult) => void;
  onError?: () => void;
}): OfficialSiteKnowledgeRefreshScheduler {
  let running = false;
  let stopped = false;
  const holderId = input.holderId ?? randomUUID();
  const leaseKey = input.leaseKey ?? DEFAULT_REFRESH_LEASE_KEY;
  const leaseTtlMs = input.leaseTtlMs ?? DEFAULT_REFRESH_LEASE_TTL_MS;
  const leaseTtlSeconds = Math.ceil(leaseTtlMs / 1_000);
  const leaseRenewIntervalMs =
    input.leaseRenewIntervalMs ?? Math.max(1, Math.floor(leaseTtlMs / 3));

  if (
    !Number.isFinite(leaseTtlMs) ||
    leaseTtlMs <= 0 ||
    !Number.isFinite(leaseRenewIntervalMs) ||
    leaseRenewIntervalMs <= 0 ||
    leaseRenewIntervalMs >= leaseTtlMs ||
    !Number.isSafeInteger(leaseTtlSeconds) ||
    leaseTtlSeconds > MAX_REFRESH_LEASE_TTL_SECONDS
  ) {
    throw new Error("official_site_refresh_lease_timing_invalid");
  }

  const runNow = async (): Promise<OfficialSiteKnowledgeRefreshResult | null> => {
    if (running || stopped) {
      return null;
    }

    running = true;
    let leaseAcquired = false;
    let leaseRenewalTimer: ReturnType<typeof setInterval> | null = null;
    let leaseRenewalInFlight: Promise<void> | null = null;
    let leaseRenewalError: Error | null = null;

    try {
      leaseAcquired = await input.leaseRepository.tryAcquireOfficialSiteKnowledgeRefreshLease({
        tenant_id: input.tenant_id,
        lease_key: leaseKey,
        holder_id: holderId,
        lease_ttl_seconds: leaseTtlSeconds
      });

      if (!leaseAcquired) {
        return null;
      }

      const renewLease = async (): Promise<void> => {
        const renewed = await input.leaseRepository.renewOfficialSiteKnowledgeRefreshLease({
          tenant_id: input.tenant_id,
          lease_key: leaseKey,
          holder_id: holderId,
          lease_ttl_seconds: leaseTtlSeconds
        });

        if (!renewed) {
          throw new Error("official_site_refresh_lease_lost");
        }
      };
      const startLeaseRenewal = (): void => {
        if (leaseRenewalInFlight || leaseRenewalError) {
          return;
        }

        leaseRenewalInFlight = renewLease()
          .catch((error: unknown) => {
            leaseRenewalError = toSafeLeaseError(error);
          })
          .finally(() => {
            leaseRenewalInFlight = null;
          });
      };
      const assertLeaseBeforeCommit = async (): Promise<void> => {
        if (leaseRenewalInFlight) {
          await leaseRenewalInFlight;
        }

        if (leaseRenewalError) {
          throw leaseRenewalError;
        }

        await renewLease();
      };

      leaseRenewalTimer = setInterval(startLeaseRenewal, leaseRenewIntervalMs);
      unrefTimer(leaseRenewalTimer);

      const result = await refreshOfficialSiteKnowledge({
        sources: input.sources,
        repository: input.repository,
        ...(input.httpClient ? { httpClient: input.httpClient } : {}),
        ...(input.now ? { now: input.now } : {}),
        beforeCommit: assertLeaseBeforeCommit
      });
      input.onResult?.(result);
      return result;
    } catch (error) {
      input.onError?.();
      throw error;
    } finally {
      if (leaseRenewalTimer) {
        clearInterval(leaseRenewalTimer);
      }
      if (leaseRenewalInFlight) {
        await leaseRenewalInFlight;
      }

      if (leaseAcquired) {
        try {
          await input.leaseRepository.releaseOfficialSiteKnowledgeRefreshLease({
            tenant_id: input.tenant_id,
            lease_key: leaseKey,
            holder_id: holderId
          });
        } catch {
          input.onError?.();
        }
      }
      running = false;
    }
  };

  const initialTimer = setTimeout(() => {
    void runNow().catch(() => undefined);
  }, input.initialDelayMs ?? 1_000);
  const intervalTimer = setInterval(() => {
    void runNow().catch(() => undefined);
  }, input.intervalMs ?? DEFAULT_REFRESH_INTERVAL_MS);
  unrefTimer(initialTimer);
  unrefTimer(intervalTimer);

  return {
    runNow,
    stop(): void {
      stopped = true;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    }
  };
}

export function extractOfficialSitePageText(html: string): string {
  const document = parseDocument(html, { decodeEntities: true });
  const ignoredElements = DomUtils.findAll(
    (element) => ignoredContentTags.has(element.name.toLowerCase()),
    document.children
  );

  for (const element of ignoredElements) {
    DomUtils.removeElement(element);
  }

  const preferredRoot = preferredContentTags
    .map((tagName) =>
      DomUtils.findOne(
        (element) => element.name.toLowerCase() === tagName,
        document.children
      )
    )
    .find((element) => element !== null);
  const content = normalizeExtractedText(DomUtils.innerText(preferredRoot ?? document));

  if (content.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new Error("official_site_content_too_short");
  }

  return content.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

export function isWritableKnowledgePageRepository(
  repository: KnowledgePageRepository
): repository is WritableKnowledgePageRepository {
  const maybeWritable = repository as { upsertMany?: unknown };

  return typeof maybeWritable.upsertMany === "function";
}

export function isOfficialSiteKnowledgeRefreshLeaseRepository(
  repository: KnowledgePageRepository
): repository is KnowledgePageRepository & OfficialSiteKnowledgeRefreshLeaseRepository {
  const maybeLeaseRepository = repository as {
    tryAcquireOfficialSiteKnowledgeRefreshLease?: unknown;
    renewOfficialSiteKnowledgeRefreshLease?: unknown;
    releaseOfficialSiteKnowledgeRefreshLease?: unknown;
  };

  return (
    typeof maybeLeaseRepository.tryAcquireOfficialSiteKnowledgeRefreshLease === "function" &&
    typeof maybeLeaseRepository.renewOfficialSiteKnowledgeRefreshLease === "function" &&
    typeof maybeLeaseRepository.releaseOfficialSiteKnowledgeRefreshLease === "function"
  );
}

function toSafeLeaseError(error: unknown): Error {
  if (error instanceof Error && error.message === "official_site_refresh_lease_lost") {
    return error;
  }

  return new Error("official_site_refresh_lease_renewal_failed");
}

function assertAllowedOfficialSiteUrl(value: string): string {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();

  if (
    url.protocol !== "https:" ||
    !allowedOfficialHosts.has(hostname) ||
    (url.port !== "" && url.port !== "443") ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error("official_site_url_rejected");
  }

  url.hash = "";
  return url.toString();
}

async function readResponseTextWithinLimit(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytesRead = 0;

  while (true) {
    const chunk = await reader.read();

    if (chunk.done) {
      break;
    }

    bytesRead += chunk.value.byteLength;

    if (bytesRead > maxBytes) {
      await reader.cancel();
      throw new Error("official_site_content_too_large");
    }

    chunks.push(decoder.decode(chunk.value, { stream: true }));
  }

  chunks.push(decoder.decode());
  return chunks.join("");
}

function groupSourcesByUrl(sources: KnowledgePage[]): Map<string, KnowledgePage[]> {
  const grouped = new Map<string, KnowledgePage[]>();

  for (const source of sources) {
    const url = assertAllowedOfficialSiteUrl(source.url);
    const existing = grouped.get(url) ?? [];
    existing.push(source);
    grouped.set(url, existing);
  }

  return grouped;
}

function normalizeExtractedText(value: string): string {
  return value
    .replaceAll("\u00a0", " ")
    .replaceAll("\r", "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
  (timer as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();
}
