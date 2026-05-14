import { SignInContent } from "./SignInContent";

/**
 * Dedicated sign-in screen (card layout) so it is visually distinct from the demo home.
 */
export default async function SignInPage(props: {
  searchParams: Promise<{
    oauthCallback?: string;
    appHomeCallback?: string;
    error?: string;
  }>;
}) {
  const sp = await props.searchParams;
  return (
    <SignInContent
      error={typeof sp.error === "string" ? sp.error : null}
      oauthCallback={
        typeof sp.oauthCallback === "string" ? sp.oauthCallback : null
      }
      appHomeCallback={
        typeof sp.appHomeCallback === "string" ? sp.appHomeCallback : null
      }
    />
  );
}
