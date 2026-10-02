import { db } from "@/db";
import { organizations, organizationSequences } from "@/db/schema";
import { zonedParts } from "@/features/workforce/shared/business-day";
import { eq, sql } from "drizzle-orm";
import {
  codePrefixSchema,
  RESERVED_CODE_PREFIXES,
  validateCodePrefix,
} from "./schemas";

export { codePrefixSchema, RESERVED_CODE_PREFIXES, validateCodePrefix };

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CodeEntityType =
  | "project_code"
  | "task_code"
  | "correction_code"
  | "project"
  | "task"
  | "correction";

export interface GenerateCodeOptions {
  organizationId: string;
  entityType: CodeEntityType;
  tx?: typeof db | DbTransaction;
  /** Explicit year override, useful for deterministic rollover testing. */
  year?: number;
}

/**
 * Normalizes input entityType to canonical database entityType in organization_sequences.
 */
function normalizeEntityType(entityType: CodeEntityType): "project_code" | "task_code" | "correction_code" {
  switch (entityType) {
    case "project":
    case "project_code":
      return "project_code";
    case "task":
    case "task_code":
      return "task_code";
    case "correction":
    case "correction_code":
      return "correction_code";
    default:
      throw new Error(`Unsupported code entity type: ${entityType}`);
  }
}

/**
 * Format a generated code from component parts.
 */
export function formatEntityCode(
  prefix: string,
  entityType: CodeEntityType,
  sequenceValue: number,
  year: number,
): string {
  const normType = normalizeEntityType(entityType);
  const paddedSeq = sequenceValue.toString().padStart(4, "0");

  switch (normType) {
    case "project_code":
      return `${prefix}-${year}-${paddedSeq}`;
    case "task_code":
      return `${prefix}-T-${year}-${paddedSeq}`;
    case "correction_code":
      return `COR-${paddedSeq}`;
  }
}

/**
 * Concurrency-safe, tenant-scoped sequential identifier generator.
 *
 * Atomically allocates the next monotonic sequence value for the tenant
 * and entity type within the caller's transaction (or db connection),
 * resolves the tenant's configured code prefix and timezone, and returns
 * the canonical formatted identifier.
 */
export async function generateEntityCode(
  options: GenerateCodeOptions,
): Promise<string> {
  const { organizationId, entityType, year: explicitYear } = options;
  const client = options.tx ?? db;

  if (!organizationId) {
    throw new Error("organizationId is required for code generation");
  }

  // 1. Resolve tenant's code_prefix and timezone
  const [org] = await client
    .select({
      codePrefix: organizations.codePrefix,
      timezone: organizations.timezone,
    })
    .from(organizations)
    .where(eq(organizations.organizationId, organizationId));

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  const prefix = org.codePrefix || "NEX";
  const normType = normalizeEntityType(entityType);

  // 2. Resolve target year in tenant's configured timezone
  const year =
    explicitYear !== undefined
      ? explicitYear
      : zonedParts(new Date(), org.timezone ?? "UTC").year;

  // 3. Atomically upsert row-level sequence lock
  const [sequence] = await client
    .insert(organizationSequences)
    .values({
      organizationId,
      entityType: normType,
      nextValue: 1,
    })
    .onConflictDoUpdate({
      target: [
        organizationSequences.organizationId,
        organizationSequences.entityType,
      ],
      set: { nextValue: sql`${organizationSequences.nextValue} + 1` },
    })
    .returning();

  return formatEntityCode(prefix, normType, sequence.nextValue, year);
}

/**
 * Generate a sequential project code format: {PREFIX}-{YYYY}-{XXXX}
 */
export async function generateProjectCode(
  organizationId: string,
  tx: typeof db | DbTransaction = db,
  year?: number,
): Promise<string> {
  return generateEntityCode({
    organizationId,
    entityType: "project_code",
    tx,
    year,
  });
}

/**
 * Generate a sequential task code format: {PREFIX}-T-{YYYY}-{XXXX}
 */
export async function generateTaskCode(
  organizationId: string,
  tx: typeof db | DbTransaction = db,
  year?: number,
): Promise<string> {
  return generateEntityCode({
    organizationId,
    entityType: "task_code",
    tx,
    year,
  });
}
