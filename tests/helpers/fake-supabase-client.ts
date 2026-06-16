import type {
  SupabaseRepositoryClient,
  SupabaseRepositoryErrorLike
} from "@amami-line-crm/db";

export type FakeSupabaseTerminal = "maybeSingle" | "single" | "list";

export interface FakeSupabaseResult {
  data: unknown;
  error: SupabaseRepositoryErrorLike | null;
}

export interface FakeSupabaseOperation {
  table: string;
  action: string;
  column?: string;
  value?: unknown;
  values?: unknown[];
  payload?: unknown;
  options?: unknown;
  columns?: string;
  ascending?: boolean;
  count?: number;
}

export class FakeSupabaseClient {
  readonly operations: FakeSupabaseOperation[] = [];
  private readonly results = new Map<string, FakeSupabaseResult>();

  from(table: string): FakeSupabaseQueryBuilder {
    this.push({ table, action: "from" });
    return new FakeSupabaseQueryBuilder(this, table);
  }

  setResult(table: string, terminal: FakeSupabaseTerminal, result: FakeSupabaseResult): void {
    this.results.set(`${table}:${terminal}`, result);
  }

  getResult(table: string, terminal: FakeSupabaseTerminal): FakeSupabaseResult {
    return this.results.get(`${table}:${terminal}`) ?? { data: null, error: null };
  }

  push(operation: FakeSupabaseOperation): void {
    this.operations.push(operation);
  }

  asRepositoryClient(): SupabaseRepositoryClient {
    return this as unknown as SupabaseRepositoryClient;
  }
}

export class FakeSupabaseQueryBuilder implements PromiseLike<FakeSupabaseResult> {
  constructor(
    private readonly client: FakeSupabaseClient,
    private readonly table: string
  ) {}

  select(columns = "*"): this {
    this.client.push({ table: this.table, action: "select", columns });
    return this;
  }

  eq(column: string, value: unknown): this {
    this.client.push({ table: this.table, action: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.client.push({ table: this.table, action: "in", column, values });
    return this;
  }

  order(column: string, options: { ascending: boolean }): this {
    this.client.push({
      table: this.table,
      action: "order",
      column,
      ascending: options.ascending
    });
    return this;
  }

  limit(count: number): this {
    this.client.push({ table: this.table, action: "limit", count });
    return this;
  }

  insert(payload: unknown): this {
    this.client.push({ table: this.table, action: "insert", payload });
    return this;
  }

  upsert(payload: unknown, options: unknown): this {
    this.client.push({ table: this.table, action: "upsert", payload, options });
    return this;
  }

  update(payload: unknown): this {
    this.client.push({ table: this.table, action: "update", payload });
    return this;
  }

  maybeSingle(): Promise<FakeSupabaseResult> {
    this.client.push({ table: this.table, action: "maybeSingle" });
    return Promise.resolve(this.client.getResult(this.table, "maybeSingle"));
  }

  single(): Promise<FakeSupabaseResult> {
    this.client.push({ table: this.table, action: "single" });
    return Promise.resolve(this.client.getResult(this.table, "single"));
  }

  then<TResult1 = FakeSupabaseResult, TResult2 = never>(
    onfulfilled?: ((value: FakeSupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    this.client.push({ table: this.table, action: "execute" });
    return Promise.resolve(this.client.getResult(this.table, "list")).then(
      onfulfilled,
      onrejected
    );
  }
}
