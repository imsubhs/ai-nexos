/**
 * Password hashing for share-link passwords.
 *
 * scrypt from the Node standard library rather than a dependency: it is
 * memory-hard, it is the only password KDF shipped in core, and adding bcrypt
 * or argon2 would add a native build step to a deployment target that does not
 * need one.
 *
 * These are *share-link* passwords — a short-lived secret an agency gives a
 * client alongside a link — not account credentials, which Supabase Auth owns.
 * The parameters below are sized accordingly: strong enough that a leaked
 * `share_passwords` table is not a bulk-crackable list, cheap enough that a
 * legitimate client is not kept waiting.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * cost=2^15, blockSize=8, parallelisation=1 — roughly 32 MB and ~100 ms per
 * hash on current server hardware. `maxmem` must be raised above Node's 32 MB
 * default or scrypt refuses these parameters outright.
 */
const SCRYPT_PARAMS = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 96 * 1024 * 1024,
} as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 32;

/** Rejects absurd inputs before spending 100 ms of CPU on them. */
const MAX_PASSWORD_LENGTH = 512;

export type PasswordHash = {
  /** Hex-encoded derived key. Fits the schema's varchar(255). */
  readonly hash: string;
  /** Hex-encoded per-password salt. */
  readonly salt: string;
};

/** Derives a fresh salt and hash for a new share password. */
export async function hashSharePassword(
  password: string,
): Promise<PasswordHash> {
  assertHashable(password);
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return { hash: derived.toString("hex"), salt: salt.toString("hex") };
}

/**
 * Verifies a candidate password against a stored hash and salt.
 *
 * Always compares in constant time, and never short-circuits on a length
 * mismatch in a way an attacker can time: a stored value of the wrong length is
 * a corrupt record, which is reported as a failed match rather than an error,
 * because the caller's only correct response either way is to deny access.
 */
export async function verifySharePassword(
  password: string,
  stored: PasswordHash,
): Promise<boolean> {
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH)
    return false;

  let expected: Buffer;
  let salt: Buffer;
  try {
    expected = Buffer.from(stored.hash, "hex");
    salt = Buffer.from(stored.salt, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH || salt.length === 0) return false;

  const derived = await scrypt(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return timingSafeEqual(derived, expected);
}

function assertHashable(password: string): void {
  if (password.length === 0) {
    throw new Error("A share password must not be empty.");
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `A share password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
    );
  }
}

/**
 * Constant-time comparison of two opaque tokens.
 *
 * `a === b` on a secret leaks its prefix through timing: the comparison exits
 * at the first differing byte, so an attacker who can measure the difference
 * recovers the value one character at a time. Used for any token compared in
 * application code rather than by the database.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // Lengths are not secret, but bailing out early on a mismatch would leak
  // them; hash both to a fixed width so the comparison is always the same size.
  if (left.length !== right.length) {
    // Still burn a comparison of equal length so the timing is uniform.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}
