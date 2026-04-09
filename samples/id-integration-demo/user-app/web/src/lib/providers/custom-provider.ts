import { genericOAuth } from "better-auth/plugins";

function mapOidcStyleProfileToUser(profile: Record<string, unknown>) {
  const sub = typeof profile.sub === "string" ? profile.sub : "";
  const email = typeof profile.email === "string" ? profile.email : undefined;
  // Better Auth generic-oauth rejects the flow when `name` is falsy (see
  // `name_is_missing`). Prefer `name`, then OIDC `preferred_username`, then email / sub.
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

export const customProvider = genericOAuth({
  config: [
    {
      providerId: "custom",
      clientId: process.env.CUSTOM_PROVIDER_CLIENT_ID as string,
      clientSecret: process.env.CUSTOM_PROVIDER_CLIENT_SECRET as string,
      discoveryUrl: process.env.CUSTOM_PROVIDER_DISCOVERY_URL as string,
      scopes: ["openid", "email", "profile"],
      // Some IdPs omit `name` on userinfo / id_token claims; still satisfy Better Auth.
      mapProfileToUser: async (profile) =>
        mapOidcStyleProfileToUser(profile as Record<string, unknown>),
    },
  ],
});
