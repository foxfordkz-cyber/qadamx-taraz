// Exact URLs approved by the captain. No callback is derived from query strings,
// deployment aliases, forwarded headers or an arbitrary VITE_ environment value.
export const PRODUCTION_EMAIL_CALLBACK_URL =
  "https://qadamx-taraz.vercel.app/auth/callback";
export const PR43_EMAIL_CALLBACK_URL =
  "https://qadamx-taraz-git-integration-seller-registrat-7d21c0-p-it-chers.vercel.app/auth/callback";
export const PR43_BRANCH = "integration/seller-registration-deploy-review";

export function emailCallbackForBuild(
  environment: string | undefined,
  branch: string | undefined,
) {
  return environment === "preview" && branch === PR43_BRANCH
    ? PR43_EMAIL_CALLBACK_URL
    : PRODUCTION_EMAIL_CALLBACK_URL;
}

export function registrationOriginAllowed(
  callback: string,
  origin: string,
  productionBuild = false,
) {
  // A deployment-specific Vercel URL has different browser storage from the
  // approved branch URL. Start there, too, so the callback can find its verifier.
  if (
    callback !== PR43_EMAIL_CALLBACK_URL &&
    callback !== PRODUCTION_EMAIL_CALLBACK_URL
  )
    return false;
  if (!productionBuild && callback === PRODUCTION_EMAIL_CALLBACK_URL)
    return true;
  return origin === new URL(callback).origin;
}
