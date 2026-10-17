// Inspect only the public URL. Never repair it or include its value in an error.
// Explicit reverse-proxy prefixes remain supported (including isolated QA URLs).
export function supabaseProjectUrlIssue(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      !["https:", "http:"].includes(url.protocol) ||
      !!url.username ||
      !!url.password ||
      !!url.search ||
      !!url.hash ||
      /\/(rest|auth|storage|functions|realtime)\/v1(?:\/|$)/i.test(url.pathname)
    );
  } catch {
    return true;
  }
}
