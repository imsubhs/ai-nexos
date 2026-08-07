import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads the migration journal and the snapshot it points at, so the schema
 * assertions describe what the migrations *say* rather than a hand-maintained
 * list that drifts the moment a table is added.
 */

const MIGRATIONS_DIR = join(process.cwd(), "database", "migrations");
const META_DIR = join(MIGRATIONS_DIR, "meta");

export interface JournalEntry {
  idx: number;
  tag: string;
}

export interface SnapshotTable {
  name: string;
  schema: string;
  columns: Record<string, { name: string; notNull: boolean; type: string }>;
  indexes: Record<string, { name: string; isUnique: boolean }>;
  foreignKeys: Record<
    string,
    { name: string; tableFrom: string; tableTo: string }
  >;
  compositePrimaryKeys: Record<string, unknown>;
  uniqueConstraints: Record<string, unknown>;
  checkConstraints: Record<string, unknown>;
  isRLSEnabled: boolean;
}

export interface Snapshot {
  tables: Record<string, SnapshotTable>;
  enums: Record<string, { name: string; schema: string; values: string[] }>;
}

export function readJournal(): JournalEntry[] {
  const journal = JSON.parse(
    readFileSync(join(META_DIR, "_journal.json"), "utf8"),
  ) as { entries: JournalEntry[] };
  return journal.entries;
}

/** The snapshot corresponding to the final journal entry. */
export function readLatestSnapshot(): Snapshot {
  const entries = readJournal();
  const idx = String(entries[entries.length - 1].idx).padStart(4, "0");
  return JSON.parse(
    readFileSync(join(META_DIR, `${idx}_snapshot.json`), "utf8"),
  ) as Snapshot;
}

/** Migration SQL files on disk, ordered as the journal lists them. */
export function readMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** Public-schema tables the migrations create. */
export function expectedTables(snapshot: Snapshot): SnapshotTable[] {
  return Object.values(snapshot.tables).filter(
    (t) => t.schema === "" || t.schema === "public",
  );
}
