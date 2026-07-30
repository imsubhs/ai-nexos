import { describe, expect, it } from "vitest";
import {
  safeInternalPath,
  DEFAULT_AUTHENTICATED_PATH,
} from "@/features/auth/redirect";

describe("safeInternalPath (open-redirect guard)", () => {
  it("accepts plain internal paths", () => {
    expect(safeInternalPath("/projects/123")).toBe("/projects/123");
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
  });

  it.each([
    ["https://evil.example.com", "absolute URL"],
    ["//evil.example.com", "protocol-relative URL"],
    ["javascript:alert(1)", "javascript scheme"],
    ["\\\\evil.example.com", "backslash UNC"],
    ["/dash\nboard", "newline injection"],
    ["", "empty string"],
  ])("rejects %s (%s)", (input) => {
    expect(safeInternalPath(input)).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it("rejects portal and auth-internal destinations", () => {
    expect(safeInternalPath("/portal/s/token")).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
    expect(safeInternalPath("/auth/callback")).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it("handles null/undefined/non-string FormData values", () => {
    expect(safeInternalPath(null)).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(safeInternalPath(undefined)).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(safeInternalPath(new File([], "f") as FormDataEntryValue)).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
  });

  it("honors a custom fallback", () => {
    expect(safeInternalPath(null, "/")).toBe("/");
  });
});
