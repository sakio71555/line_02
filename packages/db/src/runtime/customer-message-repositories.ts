import {
  InMemoryAlertRepository,
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type AlertRepository,
  type CustomerRepository,
  type KnowledgePage,
  type LineAttachmentStorage,
  type MessageRepository
} from "@amami-line-crm/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createSupabaseServiceRoleServerClient,
  readSupabaseConfigFromEnv,
  SupabaseAlertRepository,
  SupabaseConfigError,
  SupabaseCustomerRepository,
  SupabaseKnowledgePageRepository,
  SupabaseLineAttachmentStorage,
  SupabaseMessageRepository,
  type SupabaseEnv,
  type SupabaseEnvName,
  type SupabaseRepositoryClient
} from "../supabase";

export const repositoryRuntimeModes = ["in_memory", "supabase"] as const;

export type RepositoryRuntimeMode = (typeof repositoryRuntimeModes)[number];

export interface CustomerMessageRepositoryBundle {
  runtime_mode: RepositoryRuntimeMode;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
  alertRepository?: AlertRepository;
  knowledgePageRepository?: KnowledgePageRepositoryRuntime;
  lineAttachmentStorage?: LineAttachmentStorage;
}

export interface CustomerMessageAlertRepositoryBundle extends CustomerMessageRepositoryBundle {
  alertRepository: AlertRepository;
}

export interface CustomerMessageAlertKnowledgeRepositoryBundle
  extends CustomerMessageAlertRepositoryBundle {
  knowledgePageRepository: KnowledgePageRepositoryRuntime;
}

export interface KnowledgePageRepositoryRuntime {
  listByTenant(tenantId: string): Promise<KnowledgePage[]>;
  upsertMany(pages: KnowledgePage[]): Promise<void> | void;
  tryAcquireOfficialSiteKnowledgeRefreshLease?(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
    lease_ttl_seconds: number;
  }): Promise<boolean>;
  renewOfficialSiteKnowledgeRefreshLease?(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
    lease_ttl_seconds: number;
  }): Promise<boolean>;
  releaseOfficialSiteKnowledgeRefreshLease?(input: {
    tenant_id: string;
    lease_key: string;
    holder_id: string;
  }): Promise<void>;
}

export interface CreateCustomerMessageRepositoriesForRuntimeInput {
  mode?: RepositoryRuntimeMode;
  env?: SupabaseEnv;
  supabaseClient?: SupabaseRuntimeRepositoryClient;
}

export type SupabaseRuntimeRepositoryClient = SupabaseRepositoryClient &
  Partial<Pick<SupabaseClient, "storage">>;

export class SupabaseRuntimeNotConfiguredError extends Error {
  readonly code = "supabase_runtime_not_configured";
  readonly missing: SupabaseEnvName[];
  readonly invalid: SupabaseEnvName[];

  constructor(input: { missing?: SupabaseEnvName[]; invalid?: SupabaseEnvName[] }) {
    const missing = input.missing ?? [];
    const invalid = input.invalid ?? [];
    const details = [
      missing.length > 0 ? `missing env ${missing.join(", ")}` : null,
      invalid.length > 0 ? `invalid env ${invalid.join(", ")}` : null
    ].filter(Boolean);

    super(
      [
        "supabase_runtime_not_configured",
        details.length > 0 ? details.join("; ") : "Supabase runtime env is not configured"
      ].join(": ")
    );
    this.name = "SupabaseRuntimeNotConfiguredError";
    this.missing = missing;
    this.invalid = invalid;
  }
}

export function createInMemoryCustomerMessageRepositories(): CustomerMessageAlertKnowledgeRepositoryBundle {
  return {
    runtime_mode: "in_memory",
    customerRepository: new InMemoryCustomerRepository(),
    messageRepository: new InMemoryMessageRepository(),
    alertRepository: new InMemoryAlertRepository(),
    knowledgePageRepository: new EmptyInMemoryKnowledgePageRepository()
  };
}

export function createSupabaseCustomerMessageRepositories(input: {
  client: SupabaseRuntimeRepositoryClient;
}): CustomerMessageAlertKnowledgeRepositoryBundle {
  return {
    runtime_mode: "supabase",
    customerRepository: new SupabaseCustomerRepository(input.client),
    messageRepository: new SupabaseMessageRepository(input.client),
    alertRepository: new SupabaseAlertRepository(input.client),
    knowledgePageRepository: new SupabaseKnowledgePageRepository(input.client),
    ...(input.client.storage
      ? {
          lineAttachmentStorage: new SupabaseLineAttachmentStorage(
            input.client as Pick<SupabaseClient, "storage">
          )
        }
      : {})
  };
}

export function createSupabaseCustomerMessageRepositoriesFromEnv(
  env: SupabaseEnv = process.env
): CustomerMessageAlertKnowledgeRepositoryBundle {
  try {
    const config = readSupabaseConfigFromEnv(env);
    const client = createSupabaseServiceRoleServerClient(config);

    return createSupabaseCustomerMessageRepositories({ client });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      throw new SupabaseRuntimeNotConfiguredError({
        missing: error.missing,
        invalid: error.invalid
      });
    }

    throw error;
  }
}

export function createCustomerMessageRepositoriesForRuntime(
  input: CreateCustomerMessageRepositoriesForRuntimeInput = {}
): CustomerMessageAlertKnowledgeRepositoryBundle {
  const mode = input.mode ?? "in_memory";

  if (mode === "in_memory") {
    return createInMemoryCustomerMessageRepositories();
  }

  if (input.supabaseClient) {
    return createSupabaseCustomerMessageRepositories({ client: input.supabaseClient });
  }

  return createSupabaseCustomerMessageRepositoriesFromEnv(input.env);
}

class EmptyInMemoryKnowledgePageRepository implements KnowledgePageRepositoryRuntime {
  private readonly pages: KnowledgePage[] = [];

  async listByTenant(tenantId: string): Promise<KnowledgePage[]> {
    return this.pages.filter((page) => page.tenant_id === tenantId);
  }

  upsertMany(pages: KnowledgePage[]): void {
    for (const page of pages) {
      const index = this.pages.findIndex((existing) => existing.id === page.id);

      if (index >= 0) {
        this.pages[index] = page;
      } else {
        this.pages.push(page);
      }
    }
  }
}
