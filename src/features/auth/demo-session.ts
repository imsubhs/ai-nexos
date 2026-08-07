/**
 * The demo-workspace session cookie — one definition, one set of flags.
 *
 * This cookie was previously written in two places with different attributes.
 * `enterDemoWorkspace()` set it `httpOnly`, `sameSite=lax` and `secure` in
 * production; `features/auth/mock-actions.ts` set it with `path` alone — no
 * `httpOnly`, so any script on the page could read or forge it, and no
 * `secure`, so it travelled in clear over plain http. Two writers of one
 * security-relevant cookie will always drift; there is now one.
 *
 * The cookie is only ever *honoured* when `isDemoMode()` is true, and that
 * function returns false under `NODE_ENV=production` regardless of how
 * DEMO_MODE is set. So the blast radius of forging this value in production is
 * nil — but it is set correctly anyway, because the guarantee that makes it
 * harmless should not be the only thing standing between a forged cookie and
 * an owner-role session.
 *
 * Split from the actions that use it so `src/proxy.ts`, which may run on the
 * Edge runtime and cannot import `next/headers`, can share the constants.
 */

export const DEMO_SESSION_COOKIE = "demo_session";

/** The only value treated as an active demo session. */
export const DEMO_SESSION_VALUE = "true";

/** Eight hours: long enough for a walkthrough, short enough to expire on its own. */
const DEMO_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/**
 * Attributes for the demo cookie.
 *
 * - `httpOnly`  — no script needs to read it, so no script may.
 * - `sameSite: "lax"` — it must survive a top-level navigation back from the
 *   sign-in redirect, which `strict` would drop, but must not ride along with
 *   a cross-site subrequest.
 * - `secure` outside development — a session cookie sent over plain http is
 *   readable by anything on the path.
 */
export function demoSessionCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV !== "development",
    maxAge: DEMO_SESSION_MAX_AGE_SECONDS,
  };
}

/** True when the supplied cookie value denotes an active demo session. */
export function isDemoSessionValue(value: string | undefined): boolean {
  return value === DEMO_SESSION_VALUE;
}

/** The minimal cookie-store surface these helpers need. */
type WritableCookieStore = {
  set(
    name: string,
    value: string,
    options: ReturnType<typeof demoSessionCookieOptions>,
  ): unknown;
  delete(name: string): unknown;
};

/** Starts a demo session on the given cookie store. */
export function setDemoSessionCookie(store: WritableCookieStore): void {
  store.set(
    DEMO_SESSION_COOKIE,
    DEMO_SESSION_VALUE,
    demoSessionCookieOptions(),
  );
}

/** Ends a demo session. */
export function clearDemoSessionCookie(store: WritableCookieStore): void {
  store.delete(DEMO_SESSION_COOKIE);
}
