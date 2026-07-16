import { describe, expect, it, vi } from "vitest";

import {
  extractOfficialSitePageText,
  FetchOfficialSiteHttpClient,
  InMemoryKnowledgePageRepository,
  refreshOfficialSiteKnowledge,
  startOfficialSiteKnowledgeRefreshScheduler,
  type KnowledgePage,
  type OfficialSiteKnowledgeRefreshLeaseRepository,
  type OfficialSiteHttpClient
} from "@amami-line-crm/rag";

const crawledAt = "2026-07-16T00:00:00.000Z";

describe("official site knowledge sync", () => {
  it("extracts visible main content without navigation, scripts, or forms", () => {
    const content = extractOfficialSitePageText(`
      <html>
        <body>
          <nav>サイト共通メニューと非公開の管理導線</nav>
          <main>
            <h1>アマミホームの家づくり相談</h1>
            <p>住まいづくりの流れやモデルハウス見学についてご案内します。</p>
            <p>詳しい条件は公式情報をご確認ください。</p>
          </main>
          <form><input value="フォーム入力値"></form>
          <script>window.secretValue = "never include";</script>
        </body>
      </html>
    `);

    expect(content).toContain("アマミホームの家づくり相談");
    expect(content).toContain("モデルハウス見学");
    expect(content).not.toContain("サイト共通メニュー");
    expect(content).not.toContain("フォーム入力値");
    expect(content).not.toContain("secretValue");
  });

  it("refreshes successful pages, deduplicates source URLs, and preserves failed pages", async () => {
    const successfulSource = createSource({
      id: "knowledge_success",
      url: "https://amamihome.net/consultation/",
      title: "家づくり相談"
    });
    const duplicateSource = createSource({
      id: "knowledge_success_duplicate",
      url: successfulSource.url,
      title: "相談案内"
    });
    const failedSource = createSource({
      id: "knowledge_failed",
      url: "https://amamihome.net/unavailable/",
      title: "取得失敗ページ",
      content: "取得失敗時も保持する既存の安全なナレッジ本文です。"
    });
    const repository = new InMemoryKnowledgePageRepository([
      successfulSource,
      duplicateSource,
      failedSource
    ]);
    const httpClient: OfficialSiteHttpClient = {
      fetchHtml: vi.fn(async (url: string) => {
        if (url === failedSource.url) {
          throw new Error("sensitive upstream detail");
        }

        return {
          final_url: url,
          html: `
            <html><main>
              <h1>家づくり相談</h1>
              <p>新築や住まいづくりの進め方について、公式サイトの最新情報をご案内します。</p>
              <p>モデルハウス見学や資料請求の案内も確認できます。</p>
            </main></html>
          `
        };
      })
    };

    const result = await refreshOfficialSiteKnowledge({
      sources: [successfulSource, duplicateSource, failedSource],
      repository,
      httpClient,
      now: () => crawledAt
    });

    expect(result).toEqual({ requested: 3, refreshed: 2, failed: 1 });
    expect(httpClient.fetchHtml).toHaveBeenCalledTimes(2);
    const pages = await repository.listByTenant("tenant_amamihome");
    const refreshedPage = pages.find((page) => page.id === successfulSource.id);
    const preservedPage = pages.find((page) => page.id === failedSource.id);

    expect(refreshedPage).toMatchObject({
      last_crawled_at: crawledAt,
      content: expect.stringContaining("公式サイトの最新情報")
    });
    expect(refreshedPage).toHaveProperty("checksum", expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(preservedPage).toMatchObject({
      content: failedSource.content,
      last_crawled_at: null
    });
  });

  it("rejects redirects outside the official HTTPS hosts", async () => {
    const fetchImplementation = vi.fn(async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/untrusted" }
      })
    );
    const client = new FetchOfficialSiteHttpClient(fetchImplementation as typeof fetch);

    await expect(client.fetchHtml("https://amamihome.net/")).rejects.toThrow(
      "official_site_url_rejected"
    );
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("allows only one scheduler instance to refresh while the shared lease is held", async () => {
    const source = createSource();
    const repository = new InMemoryKnowledgePageRepository([source]);
    const leaseRepository = new InMemoryRefreshLeaseRepository();
    let releaseFetch: (() => void) | undefined;
    const fetchGate = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });
    let fetchStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      fetchStarted = resolve;
    });
    const httpClient: OfficialSiteHttpClient = {
      fetchHtml: vi.fn(async (url: string) => {
        fetchStarted?.();
        await fetchGate;
        return {
          final_url: url,
          html: `<main><h1>公式サイト</h1><p>家づくり相談とモデルハウス見学に関する最新の公式情報を掲載しています。</p></main>`
        };
      })
    };
    const schedulerA = startOfficialSiteKnowledgeRefreshScheduler({
      tenant_id: "tenant_amamihome",
      sources: [source],
      repository,
      leaseRepository,
      httpClient,
      now: () => crawledAt,
      initialDelayMs: 60_000,
      intervalMs: 60_000,
      holderId: "api_instance_a"
    });
    const schedulerB = startOfficialSiteKnowledgeRefreshScheduler({
      tenant_id: "tenant_amamihome",
      sources: [source],
      repository,
      leaseRepository,
      httpClient,
      now: () => crawledAt,
      initialDelayMs: 60_000,
      intervalMs: 60_000,
      holderId: "api_instance_b"
    });

    try {
      const firstRun = schedulerA.runNow();
      await started;

      await expect(schedulerB.runNow()).resolves.toBeNull();
      expect(httpClient.fetchHtml).toHaveBeenCalledTimes(1);

      releaseFetch?.();
      await expect(firstRun).resolves.toEqual({ requested: 1, refreshed: 1, failed: 0 });
      expect(leaseRepository.activeLeaseCount()).toBe(0);
    } finally {
      releaseFetch?.();
      schedulerA.stop();
      schedulerB.stop();
    }
  });

  it("renews the shared lease while a long refresh is still running", async () => {
    const source = createSource();
    const repository = new InMemoryKnowledgePageRepository([source]);
    const leaseRepository = new InMemoryRefreshLeaseRepository();
    let releaseFetch: (() => void) | undefined;
    const fetchGate = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });
    const httpClient: OfficialSiteHttpClient = {
      async fetchHtml(url) {
        await fetchGate;
        return {
          final_url: url,
          html: `<main><h1>公式サイト</h1><p>長い同期処理の間もリースを安全に更新するための公式情報です。家づくり相談やモデルハウス見学に関する最新情報を掲載しています。</p></main>`
        };
      }
    };
    const scheduler = startOfficialSiteKnowledgeRefreshScheduler({
      tenant_id: "tenant_amamihome",
      sources: [source],
      repository,
      leaseRepository,
      httpClient,
      initialDelayMs: 60_000,
      intervalMs: 60_000,
      leaseTtlMs: 30,
      leaseRenewIntervalMs: 5,
      holderId: "api_instance_long_refresh"
    });

    try {
      const run = scheduler.runNow();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(leaseRepository.renewalCount()).toBeGreaterThan(0);

      releaseFetch?.();
      await expect(run).resolves.toEqual({ requested: 1, refreshed: 1, failed: 0 });
      expect(leaseRepository.renewalCount()).toBeGreaterThan(1);
    } finally {
      releaseFetch?.();
      scheduler.stop();
    }
  });

  it("does not write refreshed pages after the shared lease is lost", async () => {
    const source = createSource();
    const repository = new InMemoryKnowledgePageRepository([source]);
    const onError = vi.fn();
    const leaseRepository: OfficialSiteKnowledgeRefreshLeaseRepository = {
      async tryAcquireOfficialSiteKnowledgeRefreshLease() {
        return true;
      },
      async renewOfficialSiteKnowledgeRefreshLease() {
        return false;
      },
      async releaseOfficialSiteKnowledgeRefreshLease() {}
    };
    const scheduler = startOfficialSiteKnowledgeRefreshScheduler({
      tenant_id: "tenant_amamihome",
      sources: [source],
      repository,
      leaseRepository,
      httpClient: {
        async fetchHtml(url) {
          return {
            final_url: url,
            html: `<main><h1>公式サイト</h1><p>リース喪失時には保存してはいけない更新内容です。家づくり相談やモデルハウス見学に関する情報も保存対象にしてはいけません。</p></main>`
          };
        }
      },
      initialDelayMs: 60_000,
      intervalMs: 60_000,
      leaseTtlMs: 1_000,
      leaseRenewIntervalMs: 300,
      holderId: "api_instance_lost_lease",
      onError
    });

    try {
      await expect(scheduler.runNow()).rejects.toThrow("official_site_refresh_lease_lost");
      expect(onError).toHaveBeenCalledTimes(1);
      await expect(repository.listByTenant("tenant_amamihome")).resolves.toEqual([source]);
    } finally {
      scheduler.stop();
    }
  });
});

class InMemoryRefreshLeaseRepository implements OfficialSiteKnowledgeRefreshLeaseRepository {
  private readonly holders = new Map<string, string>();
  private renewals = 0;

  async tryAcquireOfficialSiteKnowledgeRefreshLease(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
  }): Promise<boolean> {
    const key = `${input.tenant_id}:${input.lease_key}`;
    const currentHolder = this.holders.get(key);

    if (currentHolder && currentHolder !== input.holder_id) {
      return false;
    }

    this.holders.set(key, input.holder_id);
    return true;
  }

  async renewOfficialSiteKnowledgeRefreshLease(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
  }): Promise<boolean> {
    const key = `${input.tenant_id}:${input.lease_key}`;

    if (this.holders.get(key) !== input.holder_id) {
      return false;
    }

    this.renewals += 1;
    return true;
  }

  async releaseOfficialSiteKnowledgeRefreshLease(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
  }): Promise<void> {
    const key = `${input.tenant_id}:${input.lease_key}`;

    if (this.holders.get(key) === input.holder_id) {
      this.holders.delete(key);
    }
  }

  activeLeaseCount(): number {
    return this.holders.size;
  }

  renewalCount(): number {
    return this.renewals;
  }
}

function createSource(overrides: Partial<KnowledgePage> = {}): KnowledgePage {
  return {
    id: "knowledge_test",
    tenant_id: "tenant_amamihome",
    url: "https://amamihome.net/",
    title: "公式サイト",
    category: "会社案内",
    source_type: "official_site",
    content: "同期前の安全な初期ナレッジ本文です。公式サイト取得前の内容として保持します。",
    allowed_for_ai: true,
    last_crawled_at: null,
    ...overrides
  };
}
