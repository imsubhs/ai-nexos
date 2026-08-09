/**
 * Absolute URL for a share token.
 *
 * Both share dialogs previously built this as
 * `${window.location.origin}/portal/s/${token}`, which is wrong twice over.
 *
 *   · `window.location.origin` is the **app** domain, because that is where an
 *     internal user is standing when they issue the link. `src/proxy.ts`
 *     redirects `/portal/*` on the internal domain straight back to `/`, so the
 *     link a user copied and emailed to a client resolved to the dashboard root
 *     — for a recipient who has no account and would be bounced to `/login`.
 *   · `/portal/...` is the internal route shape. The proxy rewrites
 *     `portal.<domain>/s/{token}` onto it precisely so that shape never appears
 *     in a public URL; pasting it into one hands an external recipient the
 *     application's internal routing.
 *
 * The correct address is `PORTAL_URL/s/{token}` — the configured portal origin
 * plus the public path — which the proxy then rewrites to the `/portal/s/[token]`
 * route on arrival. `NEXT_PUBLIC_PORTAL_URL` is production-required and must be
 * https (enforced in `src/lib/env.server.ts`), so a production share link
 * cannot be an unencrypted URL carrying an unauthenticated credential.
 *
 * No domain is hardcoded: the value comes from configuration, and in local
 * development it falls back to `http://portal.localhost:3000`, which is the
 * host the proxy already routes.
 */

import { PORTAL_URL, SHARE_LINK_PATH } from "@/config/app";

export function buildShareUrl(token: string): string {
  // `new URL` rather than string concatenation so a configured value with or
  // without a trailing slash produces the same result.
  return new URL(`${SHARE_LINK_PATH}/${token}`, PORTAL_URL).toString();
}
