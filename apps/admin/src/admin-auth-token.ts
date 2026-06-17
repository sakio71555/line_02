export type AdminAccessTokenProvider = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>;

export async function readAdminAccessToken(
  provider: AdminAccessTokenProvider | null | undefined
): Promise<string | null> {
  if (!provider) {
    return null;
  }

  let value: string | null | undefined;

  try {
    value = await provider();
  } catch {
    throw new Error("Admin auth token provider failed.");
  }

  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim();

  return token.length > 0 ? token : null;
}

export function createBearerAuthorizationHeader(accessToken: string): string | null {
  const token = accessToken.trim();

  return token.length > 0 ? `Bearer ${token}` : null;
}
