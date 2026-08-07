import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { APP_URL } from "@/config/app";
import { safeInternalPath } from "@/features/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { logSecurityEvent } from "@/lib/security/logger";

/**
 * Auth callback for both flows:
 *  - PKCE (?code=…): OAuth and same-browser magic links.
 *  - Token hash (?token_hash=…&type=email): magic links opened in a
 *    different browser/device, where no PKCE verifier cookie exists.
 */

/**
 * Where this handler is allowed to send the browser.
 *
 * Previously the destination was built from `new URL(request.url).origin`,
 * which Next derives from the Host header. That header is caller-supplied: an
 * attacker who can influence it — a misconfigured edge, a proxy that forwards
 * Host verbatim, a Host-splitting request — gets the redirect pointed at their
 * own domain, *after* the session cookie has been set. `safeInternalPath()`
 * guards the path and never saw the origin, so the one part of the URL it does
 * not cover was the one an attacker controlled.
 *
 * The configured application URL is not caller-supplied, so it is used instead.
 */
function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, APP_URL), {
    headers: { "Cache-Control": "no-store" },
  });
}

/** The subset of OTP types this application actually issues. */
const ACCEPTED_OTP_TYPES: ReadonlySet<string> = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const next = safeInternalPath(searchParams.get("next"));

  // This endpoint verifies a credential, so it is a guessing surface like any
  // other. The budget is loose enough not to interfere with a legitimate user
  // retrying a stale link.
  const ip = getClientIp(request.headers);
  const throttle = await consumeRateLimit(RATE_LIMITS.authCallbackByIp, ip);
  if (!throttle.allowed) {
    logSecurityEvent("authcallback.throttled", "throttled", { ip });
    return redirectTo("/login?error=rate_limited");
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectTo(next);
  } else if (tokenHash && otpType && ACCEPTED_OTP_TYPES.has(otpType)) {
    // The type is checked against a fixed set rather than cast straight from
    // the query string, so an unexpected value reaches the Supabase client as
    // a refusal here instead of as an unvalidated argument there.
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });
    if (!error) return redirectTo(next);
  }

  logSecurityEvent("authcallback.failed", "denied", { ip });
  return redirectTo("/login?error=auth_callback");
}
