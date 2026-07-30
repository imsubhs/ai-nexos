import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// The Drizzle client (src/db) is constructed eagerly at import and throws when
// DATABASE_URL is unset. Tests that import a slice touching the event publisher
// only ever exercise the DEMO_MODE path (no query is issued), so a dummy URL is
// enough to satisfy the lazy client constructor without opening a connection.
process.env.DATABASE_URL ??= "postgres://demo:demo@localhost:5432/demo";

afterEach(() => {
  cleanup();
});
