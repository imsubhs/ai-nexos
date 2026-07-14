import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_development_secret");

export async function signExternalReviewToken(reviewId: string, externalEmail: string, expiresIn: string = "7d") {
  const jti = randomBytes(16).toString("hex");
  
  const token = await new SignJWT({ reviewId, externalEmail })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
    
  return token;
}

export async function verifyExternalReviewToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { reviewId: string, externalEmail: string, jti: string };
  } catch (err) {
    throw new Error("Invalid or expired external review token");
  }
}
