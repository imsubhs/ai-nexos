/**
 * Result envelope for the workforce commands the UI invokes directly.
 *
 * The domain actions throw `AttendanceError` / `CorrectionError` with messages
 * written to be read by the person who hit the rule ("You have already clocked
 * in today."). Next redacts an error thrown out of a server action in a
 * production build, so a thrown domain error reaches the browser as a generic
 * "an error occurred" — the rule is enforced, but the user is not told which
 * rule. These wrappers convert the throw into a value so the message survives.
 *
 * Only *expected* domain violations are converted. An unexpected error (a
 * dropped connection, a bug) is re-thrown so it still reaches the error
 * boundary and the logs rather than being flattened into a form message.
 */
import { AttendanceError } from "../attendance/repository";
import { CorrectionError } from "../corrections/repository";

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string; key: string };

/** Runs `command`, converting known domain violations into a failed result. */
export async function toActionResult<T>(
  command: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await command() };
  } catch (error) {
    if (error instanceof AttendanceError || error instanceof CorrectionError) {
      return { ok: false, error: error.message, key: error.key };
    }
    // Zod rejections are the other expected failure: the DTO layer speaks the
    // same "tell the user what is wrong" language as the domain rules.
    if (isZodError(error)) {
      return {
        ok: false,
        error: firstZodMessage(error),
        key: "validation/invalid-input",
      };
    }
    throw error;
  }
}

type ZodLike = { name: string; issues: { message: string }[] };

function isZodError(error: unknown): error is ZodLike {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as ZodLike).name === "ZodError" &&
    Array.isArray((error as ZodLike).issues)
  );
}

function firstZodMessage(error: ZodLike): string {
  return error.issues[0]?.message ?? "That input is not valid.";
}
