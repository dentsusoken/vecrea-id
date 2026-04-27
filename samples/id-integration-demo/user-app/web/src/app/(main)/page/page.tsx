import { AfterSignInPage } from "./AfterSignInPage";

/**
 * Post–sign-in landing page for the demo. Unauthenticated users are sent to
 * `/sign-in` (client gate aligned with Expo `app/(main)/page.tsx`).
 */
export default function Page() {
  return <AfterSignInPage />;
}
