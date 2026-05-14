import { genericOAuth } from "better-auth/plugins";

/**
 * Maps OIDC userinfo / id_token claims to Better Auth user fields.
 *
 * Better Auth’s generic-oauth handler rejects the flow when `name` is falsy
 * (error `name_is_missing`). Display name resolution order: `name`, then OIDC
 * `preferred_username`, then `email`, then `sub`, then the literal `"User"`.
 */
function mapOidcStyleProfileToUser(profile: Record<string, unknown>) {
  const sub = typeof profile.sub === "string" ? profile.sub : "";
  const email = typeof profile.email === "string" ? profile.email : undefined;
  const nameFromProvider =
    typeof profile.name === "string" && profile.name.trim().length > 0
      ? profile.name.trim()
      : undefined;
  const preferredUsername =
    typeof profile.preferred_username === "string" &&
    profile.preferred_username.length > 0
      ? profile.preferred_username
      : undefined;
  const name =
    nameFromProvider ??
    preferredUsername ??
    email ??
    (sub || "User");

  return {
    id: sub || undefined,
    email,
    name,
    emailVerified: Boolean(profile.email_verified ?? profile.emailVerified),
    image:
      typeof profile.picture === "string" ? profile.picture : undefined,
  };
}

/**
 * Generic OAuth plugin with a single provider id `custom`, driven by
 * `CUSTOM_PROVIDER_*` env vars. Uses OIDC discovery and {@link mapOidcStyleProfileToUser}
 * so IdPs that omit `name` still satisfy Better Auth.
 *
 * @see https://www.better-auth.com/docs/plugins/generic-oauth
 */
export const customProvider = genericOAuth({
  config: [
    {
      providerId: "custom",
      clientId: process.env.CUSTOM_PROVIDER_CLIENT_ID as string,
      // Public client: do NOT send a secret (token_endpoint_auth_method = none).
      clientSecret: undefined,
      discoveryUrl: process.env.CUSTOM_PROVIDER_DISCOVERY_URL as string,
      scopes: ["openid", "email", "profile"],
      pkce: true,
      authorizationUrlParams: (ctx) => {
        const additionalData =
          (ctx.body as { additionalData?: Record<string, unknown> } | undefined)
            ?.additionalData ?? {};
        const prompt =
          typeof additionalData.prompt === "string" ? additionalData.prompt : null;
        return prompt ? { prompt } : {};
      },
      mapProfileToUser: async (profile) =>
        mapOidcStyleProfileToUser(profile as Record<string, unknown>),
    },
  ],
});
