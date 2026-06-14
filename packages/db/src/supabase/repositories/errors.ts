export interface SupabaseRepositoryErrorLike {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export class SupabaseRepositoryError extends Error {
  constructor(
    readonly table: string,
    readonly operation: string,
    readonly causeError: SupabaseRepositoryErrorLike
  ) {
    super(`Supabase ${table}.${operation} failed: ${causeError.message}`);
    this.name = "SupabaseRepositoryError";
  }
}

export interface SupabaseRepositoryResult<T> {
  data: T | null;
  error: SupabaseRepositoryErrorLike | null;
}

export function unwrapSupabaseResult<T>(
  result: SupabaseRepositoryResult<T>,
  table: string,
  operation: string
): T | null {
  if (result.error) {
    throw new SupabaseRepositoryError(table, operation, result.error);
  }

  return result.data;
}
