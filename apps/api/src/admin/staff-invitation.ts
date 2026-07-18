export interface StaffInvitationService {
  invite(email: string): Promise<{
    authUserId: string;
    outcome: "sent" | "reconciled";
  }>;
}

type InvitationFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

interface SupabaseInviteResponse {
  id?: unknown;
  user?: {
    id?: unknown;
  };
}

interface SupabaseAdminUsersResponse {
  users?: Array<{
    id?: unknown;
    email?: unknown;
  }>;
  next_page?: unknown;
  last_page?: unknown;
}

const adminUsersPageSize = 200;
const adminUsersPageLimit = 100;

export function createProductionStaffInvitationService(
  env: NodeJS.ProcessEnv,
  fetchImpl: InvitationFetch = fetch
): StaffInvitationService | undefined {
  const supabaseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return undefined;
  }

  return {
    async invite(email: string): Promise<{
      authUserId: string;
      outcome: "sent" | "reconciled";
    }> {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error("staff_invitation_invalid_email");
      }

      let response: Response | null = null;
      try {
        response = await fetchImpl(`${supabaseUrl}/auth/v1/invite`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: normalizedEmail })
        });
      } catch {
        // An interrupted request may still have created the auth user. Reconcile by email below.
      }

      if (response?.ok) {
        const payload = await readJson<SupabaseInviteResponse>(response);
        const authUserId = readAuthUserId(payload);
        if (authUserId) {
          return { authUserId, outcome: "sent" };
        }
      }

      const reconciledAuthUserId = await findAuthUserIdByEmail({
        email: normalizedEmail,
        fetchImpl,
        serviceRoleKey,
        supabaseUrl
      });
      if (reconciledAuthUserId) {
        return { authUserId: reconciledAuthUserId, outcome: "reconciled" };
      }

      throw new Error(response?.ok ? "staff_invitation_invalid_response" : "staff_invitation_failed");
    }
  };
}

function readAuthUserId(payload: SupabaseInviteResponse): string | null {
  if (typeof payload.id === "string" && payload.id.trim()) {
    return payload.id.trim();
  }
  return typeof payload.user?.id === "string" && payload.user.id.trim()
    ? payload.user.id.trim()
    : null;
}

async function findAuthUserIdByEmail(input: {
  email: string;
  fetchImpl: InvitationFetch;
  serviceRoleKey: string;
  supabaseUrl: string;
}): Promise<string | null> {
  let page = 1;

  while (page <= adminUsersPageLimit) {
    const endpoint = new URL(`${input.supabaseUrl}/auth/v1/admin/users`);
    endpoint.searchParams.set("page", String(page));
    endpoint.searchParams.set("per_page", String(adminUsersPageSize));
    let response: Response;
    try {
      response = await input.fetchImpl(endpoint, {
        method: "GET",
        headers: {
          apikey: input.serviceRoleKey,
          Authorization: `Bearer ${input.serviceRoleKey}`
        }
      });
    } catch {
      return null;
    }
    if (!response.ok) {
      return null;
    }

    const payload = await readJson<SupabaseAdminUsersResponse>(response);
    const users = Array.isArray(payload.users) ? payload.users : [];
    const user = users.find(
      (candidate) =>
        typeof candidate.email === "string" &&
        candidate.email.trim().toLowerCase() === input.email &&
        typeof candidate.id === "string" &&
        Boolean(candidate.id.trim())
    );
    if (typeof user?.id === "string") {
      return user.id.trim();
    }

    const nextPage = readPositiveInteger(payload.next_page);
    const lastPage = readPositiveInteger(payload.last_page);
    if (nextPage && nextPage > page) {
      page = nextPage;
      continue;
    }
    if ((lastPage && page < lastPage) || users.length === adminUsersPageSize) {
      page += 1;
      continue;
    }
    return null;
  }

  return null;
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}
