/**
 * Application configuration (TRD §9: configuration is never hardcoded).
 * The product is AI NEX OS; the tenant (AI Collective) is data, not code —
 * organization identity always comes from the database.
 */
export const APP_NAME = "AI NEX OS";
export const APP_TAGLINE = "The Operating System for Creative Execution.";

/** Internal dashboard host, e.g. app.aicollective.agency */
export const APP_DOMAIN =
  process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost:3000";

/** Client portal host, e.g. portal.aicollective.agency */
export const PORTAL_DOMAIN =
  process.env.NEXT_PUBLIC_PORTAL_DOMAIN ?? "portal.localhost:3000";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? `http://${APP_DOMAIN}`;

export const PORTAL_URL =
  process.env.NEXT_PUBLIC_PORTAL_URL ?? `http://${PORTAL_DOMAIN}`;

/** Public share links: portal.<domain>/s/{secure_token} */
export const SHARE_LINK_PATH = "/s";
