export interface SupabaseRepositoryErrorLike {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export class SupabaseRepositoryError extends Error {
  readonly causeError: SupabaseRepositoryErrorLike;

  constructor(
    readonly table: string,
    readonly operation: string,
    causeError: SupabaseRepositoryErrorLike
  ) {
    const safeCauseError = toSafeSupabaseRepositoryErrorLike(causeError);

    super(formatSupabaseRepositoryErrorMessage(table, operation, safeCauseError));
    this.name = "SupabaseRepositoryError";
    this.causeError = safeCauseError;
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

function formatSupabaseRepositoryErrorMessage(
  table: string,
  operation: string,
  causeError: SupabaseRepositoryErrorLike
): string {
  const code = causeError.code ? ` (${causeError.code})` : "";

  return `Supabase ${table}.${operation} failed${code}: ${causeError.message}`;
}

function toSafeSupabaseRepositoryErrorLike(
  error: SupabaseRepositoryErrorLike
): SupabaseRepositoryErrorLike {
  const safeError: SupabaseRepositoryErrorLike = {
    message: "Supabase repository operation failed"
  };
  const code = sanitizeErrorCode(error.code);

  if (code) {
    safeError.code = code;
  }

  return safeError;
}

function sanitizeErrorCode(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  const sanitized = code.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80);

  return sanitized.length > 0 ? sanitized : undefined;
}
