import {
  InMemoryCustomerRepository,
  InMemoryMessageRepository,
  type CustomerRepository,
  type MessageRepository
} from "@amami-line-crm/domain";

import {
  createSupabaseServiceRoleServerClient,
  readSupabaseConfigFromEnv,
  SupabaseConfigError,
  type SupabaseEnv,
  type SupabaseEnvName
} from "../supabase";
import {
  SupabaseCustomerRepository,
  SupabaseMessageRepository,
  type SupabaseRepositoryClient
} from "../supabase/repositories";

export const repositoryRuntimeModes = ["in_memory", "supabase"] as const;

export type RepositoryRuntimeMode = (typeof repositoryRuntimeModes)[number];

export interface CustomerMessageRepositoryBundle {
  runtime_mode: RepositoryRuntimeMode;
  customerRepository: CustomerRepository;
  messageRepository: MessageRepository;
}

export interface CreateCustomerMessageRepositoriesForRuntimeInput {
  mode?: RepositoryRuntimeMode;
  env?: SupabaseEnv;
  supabaseClient?: SupabaseRepositoryClient;
}

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

export function createInMemoryCustomerMessageRepositories(): CustomerMessageRepositoryBundle {
  return {
    runtime_mode: "in_memory",
    customerRepository: new InMemoryCustomerRepository(),
    messageRepository: new InMemoryMessageRepository()
  };
}

export function createSupabaseCustomerMessageRepositories(input: {
  client: SupabaseRepositoryClient;
}): CustomerMessageRepositoryBundle {
  return {
    runtime_mode: "supabase",
    customerRepository: new SupabaseCustomerRepository(input.client),
    messageRepository: new SupabaseMessageRepository(input.client)
  };
}

export function createSupabaseCustomerMessageRepositoriesFromEnv(
  env: SupabaseEnv = process.env
): CustomerMessageRepositoryBundle {
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
): CustomerMessageRepositoryBundle {
  const mode = input.mode ?? "in_memory";

  if (mode === "in_memory") {
    return createInMemoryCustomerMessageRepositories();
  }

  if (input.supabaseClient) {
    return createSupabaseCustomerMessageRepositories({ client: input.supabaseClient });
  }

  return createSupabaseCustomerMessageRepositoriesFromEnv(input.env);
}
