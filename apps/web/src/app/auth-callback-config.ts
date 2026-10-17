// One exact callback for the shared Cloudflare build. No callback is derived
// from query strings, hosting metadata, forwarded headers or a VITE_ value.
export const PRODUCTION_EMAIL_CALLBACK_URL =
  "https://qadamx-taraz.pages.dev/auth/callback";

export function registrationOriginAllowed(
  callback: string,
  origin: string,
  productionBuild = false,
) {
  if (callback !== PRODUCTION_EMAIL_CALLBACK_URL) return false;
  if (origin === new URL(callback).origin) return true;
  // Only isolated loopback development/tests bypass the deployed-origin check.
  // A production bundle never permits localhost or another deployment alias.
  if (productionBuild) return false;
  try {
    const url = new URL(origin);
    return (
      url.origin === origin &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
