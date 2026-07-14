/**
 * Post-login destination validation — the single guard against open
 * redirects. Used by the proxy, the sign-in actions, and the auth callback.
 * Only same-site internal paths are allowed; portal and auth internals are
 * never valid destinations.
 */
export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

export function safeInternalPath(
  path: FormDataEntryValue | string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_PATH,
): string {
  if (typeof path !== "string" || path.length === 0) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("\\") || path.includes("\n") || path.includes("\r")) {
    return fallback;
  }
  if (path.startsWith("/portal") || path.startsWith("/auth")) return fallback;
  return path;
}
