import { tenantIdSchema } from "@amami-line-crm/domain";

import type { AdminAuthError } from "./auth-error-response";

export interface SelectedTenantIdTransportInput {
  selectedTenantIdHeader: string | undefined;
  fallbackSelectedTenantId?: string | null | undefined;
}

export type SelectedTenantIdTransportResult =
  | {
      ok: true;
      selectedTenantId: string | null;
    }
  | {
      ok: false;
      error: AdminAuthError;
    };

export function resolveSelectedTenantIdTransport(
  input: SelectedTenantIdTransportInput
): SelectedTenantIdTransportResult {
  const headerResult = normalizeSelectedTenantId(input.selectedTenantIdHeader);

  if (!headerResult.ok) {
    return headerResult;
  }

  if (headerResult.selectedTenantId !== null) {
    return headerResult;
  }

  return normalizeSelectedTenantId(input.fallbackSelectedTenantId);
}

export function normalizeSelectedTenantId(input: unknown): SelectedTenantIdTransportResult {
  if (input === undefined || input === null) {
    return { ok: true, selectedTenantId: null };
  }

  if (typeof input !== "string") {
    return selectedTenantIdFailure();
  }

  const selectedTenantId = input.trim();

  if (!selectedTenantId) {
    return { ok: true, selectedTenantId: null };
  }

  if (!tenantIdSchema.safeParse(selectedTenantId).success) {
    return selectedTenantIdFailure();
  }

  return {
    ok: true,
    selectedTenantId
  };
}

function selectedTenantIdFailure(): SelectedTenantIdTransportResult {
  return {
    ok: false,
    error: { code: "invalid_selected_tenant_id" }
  };
}
