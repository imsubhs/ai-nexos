"use server";

/**
 * Global search (Sprint 12A · Phase 7).
 *
 * There is no single global search read, so this composes the search-capable
 * public reads that already exist, in parallel, and normalises their rows into
 * one result shape:
 *
 *   getProjects(query)          → projects
 *   getClients(query)           → clients
 *   listEmployeesAction(search) → people
 *   searchDeliverables(term)    → deliverables
 *   searchFiles(term)           → files
 *   searchTasks(term)           → tasks        (Sprint 12B)
 *
 * Consequences of that choice, stated rather than hidden: relevance is per
 * source — each read brings its own ordering and there is no cross-source
 * ranking. Meetings and timelines remain absent because neither has a
 * search-capable read; tasks joined the list in Sprint 12B when `searchTasks`
 * was added (technical-debt item 14).
 *
 * Every source is permission-gated by its own action; a caller without
 * `clients.read` simply gets no client results rather than an error.
 */
import { getClients } from "@/features/clients/actions";
import { searchDeliverables } from "@/features/deliverables/actions";
import { searchFiles } from "@/features/files/actions";
import { getProjects } from "@/features/projects/actions";
import { searchTasks } from "@/features/tasks/actions";
import { listEmployeesAction } from "@/features/workforce/employees/actions";

export type SearchGroupKey =
  "projects" | "clients" | "people" | "deliverables" | "files" | "tasks";

export type SearchHit = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

export type SearchGroup = {
  key: SearchGroupKey;
  label: string;
  hits: SearchHit[];
};

const PER_GROUP = 5;

/** A read the current user cannot perform contributes nothing, never an error. */
async function tolerate<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch {
    return fallback;
  }
}

import { RATE_LIMITS, consumeRateLimit, rateLimitHeaders } from "@/lib/security/rate-limit";
import { resolveGuardContext, KeyResolvers } from "@/lib/security/action-guard";
import { ApiError } from "@/lib/security/errors";

export async function globalSearch(term: string): Promise<SearchGroup[]> {
  const query = (term || "").trim();
  if (query.length < 2 || query.length > 64) return [];

  const context = await resolveGuardContext();
  const identifier = KeyResolvers.userAndOrg([], context);
  const decision = await consumeRateLimit(RATE_LIMITS.searchExpensive, identifier);
  if (!decision.allowed) {
    throw new ApiError(
      "rate_limited",
      `Too many search requests. Please try again in ${decision.retryAfterSeconds}s.`,
      { headers: rateLimitHeaders(decision) },
    );
  }

  const [projects, clients, people, deliverables, files, taskRows] =
    await Promise.all([
      tolerate(
        getProjects(query, PER_GROUP, 0),
        [] as Awaited<ReturnType<typeof getProjects>>,
      ),
      tolerate(getClients(query), [] as Awaited<ReturnType<typeof getClients>>),
      tolerate(
        listEmployeesAction({ search: query, page: 1, pageSize: 10 }),
        null as Awaited<ReturnType<typeof listEmployeesAction>> | null,
      ),
      tolerate(
        searchDeliverables(query, 0, PER_GROUP),
        [] as Awaited<ReturnType<typeof searchDeliverables>>,
      ),
      tolerate(
        searchFiles(query, 0, PER_GROUP),
        [] as Awaited<ReturnType<typeof searchFiles>>,
      ),
      tolerate(
        searchTasks(query, 0, PER_GROUP),
        [] as Awaited<ReturnType<typeof searchTasks>>,
      ),
    ]);

  const groups: SearchGroup[] = [
    {
      key: "projects",
      label: "Projects",
      hits: projects.slice(0, PER_GROUP).map((row) => ({
        id: row.projectId,
        title: row.projectName,
        subtitle: row.projectCode ?? null,
        href: `/projects/${row.projectId}`,
      })),
    },
    {
      key: "clients",
      label: "Clients",
      hits: clients.slice(0, PER_GROUP).map((row) => ({
        id: row.clientId,
        title: row.companyName,
        subtitle: row.industry ?? null,
        href: `/clients/${row.clientId}`,
      })),
    },
    {
      key: "people",
      label: "People",
      hits: (people?.rows ?? []).slice(0, PER_GROUP).map((row) => ({
        id: row.userId,
        title: [row.firstName, row.lastName].filter(Boolean).join(" "),
        subtitle: row.designation ?? row.employeeCode ?? null,
        href: `/workforce/employees/${row.userId}`,
      })),
    },
    {
      key: "deliverables",
      label: "Deliverables",
      hits: deliverables.slice(0, PER_GROUP).map((row) => ({
        id: row.deliverableId,
        title: row.title,
        subtitle: row.status ?? null,
        // No deliverable detail route exists; the workspace opens filtered to
        // the title, which is the closest reachable destination.
        href: `/deliverables?search=${encodeURIComponent(row.title)}`,
      })),
    },
    {
      key: "tasks",
      label: "Tasks",
      hits: taskRows.slice(0, PER_GROUP).map((row) => ({
        id: row.taskId,
        title: row.name,
        subtitle: row.taskCode ?? null,
        href: (row as any).projectId
          ? `/projects/${(row as any).projectId}?tab=board`
          : "/tasks",
      })),
    },

    {
      key: "files",
      label: "Files",
      hits: files.slice(0, PER_GROUP).map((row) => ({
        id: row.fileId,
        title: row.title,
        subtitle: row.fileType ?? null,
        href: `/files?search=${encodeURIComponent(row.title)}`,
      })),
    },
  ];

  return groups.filter((group) => group.hits.length > 0);
}
