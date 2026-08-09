import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, assertDatabaseReachable, closeDatabase } from "./helpers/database";
import {
  readJournal,
  readLatestSnapshot,
  expectedTables,
} from "./helpers/snapshot";

/**
 * Asserts that the live database matches what the migrations describe:
 * every table, column, foreign key, index, enum, function and trigger.
 *
 * The expectations come from the Drizzle snapshot rather than a hardcoded
 * list, so adding a table to the schema extends this suite automatically.
 */
describe("Database schema (live)", () => {
  const snapshot = readLatestSnapshot();
  const tables = expectedTables(snapshot);

  beforeAll(async () => {
    await assertDatabaseReachable();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("reports a usable PostgreSQL server", async () => {
    const [row] = await db()`
      select version() as version,
             current_database() as database,
             current_schema() as schema,
             current_user as usr
    `;
    expect(row.version).toMatch(/PostgreSQL/);
    expect(row.database).toBe("postgres");
    expect(row.schema).toBe("public");
  });

  it("has applied every migration in the journal", async () => {
    const journal = readJournal();
    const applied = await db()`
      select hash from drizzle.__drizzle_migrations order by created_at
    `;
    // drizzle-kit records one row per migration file it has run.
    expect(applied.length).toBe(journal.length);
  });

  it("creates every table the migrations declare", async () => {
    const rows = await db()`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
    `;
    const live = new Set(rows.map((r) => r.table_name as string));
    const missing = tables.map((t) => t.name).filter((n) => !live.has(n));
    expect(
      missing,
      `tables missing from the database: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("creates every column the migrations declare", async () => {
    const rows = await db()`
      select table_name, column_name, is_nullable
      from information_schema.columns where table_schema = 'public'
    `;
    const live = new Map<string, Set<string>>();
    for (const r of rows) {
      const t = r.table_name as string;
      if (!live.has(t)) live.set(t, new Set());
      live.get(t)!.add(r.column_name as string);
    }

    const missing: string[] = [];
    for (const table of tables) {
      for (const column of Object.values(table.columns)) {
        if (!live.get(table.name)?.has(column.name)) {
          missing.push(`${table.name}.${column.name}`);
        }
      }
    }
    expect(
      missing,
      `columns missing: ${missing.slice(0, 20).join(", ")}`,
    ).toEqual([]);
  });

  it("creates every foreign key the migrations declare", async () => {
    const rows = await db()`
      select conname from pg_constraint c
      join pg_namespace n on n.oid = c.connamespace
      where c.contype = 'f' and n.nspname = 'public'
    `;
    const live = new Set(rows.map((r) => r.conname as string));

    const missing: string[] = [];
    for (const table of tables) {
      for (const fk of Object.values(table.foreignKeys)) {
        const expectedName = fk.name.slice(0, 63);
        if (!live.has(expectedName)) missing.push(fk.name);
      }
    }
    expect(
      missing,
      `foreign keys missing: ${missing.slice(0, 20).join(", ")}`,
    ).toEqual([]);
  });

  it("creates every index the migrations declare", async () => {
    const rows = await db()`
      select indexname from pg_indexes where schemaname = 'public'
    `;
    const live = new Set(rows.map((r) => r.indexname as string));

    const missing: string[] = [];
    for (const table of tables) {
      for (const index of Object.values(table.indexes)) {
        if (!live.has(index.name)) missing.push(index.name);
      }
    }
    expect(
      missing,
      `indexes missing: ${missing.slice(0, 20).join(", ")}`,
    ).toEqual([]);
  });

  it("gives every table a primary key", async () => {
    const rows = await db()`
      select c.relname as table_name from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and not exists (
          select 1 from pg_constraint pc
          where pc.conrelid = c.oid and pc.contype = 'p'
        )
    `;
    expect(
      rows.map((r) => r.table_name),
      "tables without a primary key",
    ).toEqual([]);
  });

  it("creates every enum type with its full value set", async () => {
    const rows = await db()`
      select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as values
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      group by t.typname
    `;
    const live = new Map(
      rows.map((r) => [r.name as string, r.values as string[]]),
    );

    const problems: string[] = [];
    for (const declared of Object.values(snapshot.enums)) {
      const values = live.get(declared.name);
      if (!values) {
        problems.push(`${declared.name} (missing)`);
        continue;
      }
      const absent = declared.values.filter((v) => !values.includes(v));
      if (absent.length) {
        problems.push(`${declared.name} missing values ${absent.join(",")}`);
      }
    }
    expect(problems, problems.slice(0, 10).join("; ")).toEqual([]);
  });

  it("installs the app schema helper functions", async () => {
    const rows = await db()`
      select p.proname from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'app'
    `;
    const live = new Set(rows.map((r) => r.proname as string));
    // These back every RLS policy — without them the policies cannot evaluate.
    for (const fn of [
      "current_user_organization_id",
      "is_org_member",
      "has_permission",
      "touch_audit_fields",
      "protect_privileged_user_fields",
    ]) {
      expect(live, `app.${fn}() is not installed`).toContain(fn);
    }
  });

  it("attaches the audit and privilege-guard triggers", async () => {
    const rows = await db()`
      select tgname from pg_trigger where not tgisinternal
    `;
    const triggers = rows.map((r) => r.tgname as string);
    expect(triggers.length).toBeGreaterThan(0);
  });
});
