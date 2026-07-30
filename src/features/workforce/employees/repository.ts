/**
 * EmployeeReadRepository (merge doc 14 §13.1) — read-only projection over
 * platform users ⋈ departments ⋈ today's attendance. Conformist boundary:
 * NO write methods may ever be added here; user administration belongs to
 * the Identity context (/settings/members).
 *
 * Implementations: mock-repository.ts (DemoStore) and real-repository.ts
 * (Drizzle; runtime wiring lands in Phase 7). Server actions (WP-104)
 * reach data only through this interface.
 */
import type { z } from "zod";
import type { listEmployeesSchema } from "./schemas";
import type { EmployeeDirectoryEntry, EmployeeListResult } from "./types";

export type EmployeeListFilters = z.output<typeof listEmployeesSchema>;

export interface EmployeeReadRepository {
  list(
    organizationId: string,
    filters: EmployeeListFilters,
  ): Promise<EmployeeListResult>;
  findById(
    organizationId: string,
    userId: string,
  ): Promise<EmployeeDirectoryEntry | null>;
  /** Non-archived employees reporting directly to `managerId` (read-only). */
  listDirectReports(
    organizationId: string,
    managerId: string,
  ): Promise<EmployeeDirectoryEntry[]>;
}
