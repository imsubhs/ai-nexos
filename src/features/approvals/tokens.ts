import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { getSigningSecret } from "@/lib/env";

/**
 * Resolved per call rather than captured at import time: a missing secret must
 * fail loudly in production instead of falling back to a constant living in
 * this file, which would make every external review token forgeable.
 */
const jwtSecret = () => getSigningSecret("JWT_SECRET");

export async function signExternalReviewToken(
  reviewId: string,
  externalEmail: string,
  expiresIn: string = "7d",
) {
  const jti = randomBytes(16).toString("hex");

  const token = await new SignJWT({ reviewId, externalEmail })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(jwtSecret());

  return token;
}

export async function verifyExternalReviewToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as { reviewId: string; externalEmail: string; jti: string };
  } catch (err) {
    throw new Error("Invalid or expired external review token");
  }
}
