/**
 * Deterministic in-memory database for DEMO_MODE.
 *
 * Mock actions read and write these collections so that demo sessions behave
 * like a real database: creates show up in lists, updates persist, archives
 * disappear — for the lifetime of the server process.
 *
 * The store lives on globalThis because Next.js may evaluate the same module
 * in more than one bundle (RSC render vs. server action); a plain module-level
 * singleton would split state between them.
 *
 * Determinism: seed rows use fixed UUIDs and fixed timestamps; generated ids
 * are sequential UUIDs. All ids are valid UUIDs so zod `.uuid()` form
 * validation accepts references to demo entities.
 */

export const DEMO_ORG_ID = "00000000-0000-4000-8000-00000000f001";
export const DEMO_USER_ID = "00000000-0000-4000-8000-00000000f002";

const SEED_DATE = new Date("2026-07-01T09:00:00.000Z");

function seedDate(daysOffset: number): Date {
  return new Date(SEED_DATE.getTime() + daysOffset * 24 * 60 * 60 * 1000);
}

/** Deterministic sequential UUID: 00000000-0000-4000-8000-<n, zero-padded>. */
function sequentialUuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
}

/** Fixed ids for seed rows, readable at a glance in the UI/devtools. */
const id = {
  clientAcme: sequentialUuid(101),
  clientNorthwind: sequentialUuid(102),
  contactJohn: sequentialUuid(111),
  contactPriya: sequentialUuid(112),
  projectWebsite: sequentialUuid(201),
  projectBrand: sequentialUuid(202),
  memberAdmin: sequentialUuid(211),
  timelineWebsite: sequentialUuid(301),
  phasePlanning: sequentialUuid(311),
  phasePreProd: sequentialUuid(312),
  phaseProduction: sequentialUuid(313),
  phasePostProd: sequentialUuid(314),
  phaseDelivery: sequentialUuid(315),
  milestoneDiscovery: sequentialUuid(321),
  milestoneWireframes: sequentialUuid(322),
  milestoneBuild: sequentialUuid(323),
  milestoneLaunch: sequentialUuid(324),
  depWireframesBuild: sequentialUuid(331),
  taskAudit: sequentialUuid(401),
  taskWireframes: sequentialUuid(402),
  taskCopy: sequentialUuid(403),
};

export type DemoStore = {
  /** Monotonic counter backing generated ids and entity codes. */
  nextId: number;
  clients: any[];
  clientContacts: any[];
  activityLogs: any[];
  projects: any[];
  projectMembers: any[];
  timelines: any[];
  projectPhases: any[];
  milestones: any[];
  timelineDependencies: any[];
  timelineVersions: any[];
  tasks: any[];
  taskTimeEntries: any[];
  taskDependencies: any[];
};

export const DEMO_USER_SUMMARY = {
  userId: DEMO_USER_ID,
  firstName: "Demo",
  lastName: "Administrator",
  email: "admin@demo.local",
  avatarUrl: null,
};

function createSeedData(): DemoStore {
  const auditFields = (daysOffset: number) => ({
    createdAt: seedDate(daysOffset),
    updatedAt: seedDate(daysOffset),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  });

  const clients = [
    {
      clientId: id.clientAcme,
      organizationId: DEMO_ORG_ID,
      companyName: "Acme Global",
      industry: "Technology",
      website: "https://acme.example.com",
      address: "1 Market Street",
      country: "United States",
      notes: "Flagship demo client.",
      status: "active",
      clientHealth: "good",
      logoUrl: null,
      brandColors: ["#0f172a", "#38bdf8"],
      preferredCommunication: "email",
      ...auditFields(-30),
    },
    {
      clientId: id.clientNorthwind,
      organizationId: DEMO_ORG_ID,
      companyName: "Northwind Studios",
      industry: "Media & Entertainment",
      website: "https://northwind.example.com",
      address: "42 Harbour Lane",
      country: "United Kingdom",
      notes: "Prospect converted in June.",
      status: "active",
      clientHealth: "at_risk",
      logoUrl: null,
      brandColors: ["#7c2d12", "#fb923c"],
      preferredCommunication: "slack",
      ...auditFields(-12),
    },
  ];

  const clientContacts = [
    {
      contactId: id.contactJohn,
      clientId: id.clientAcme,
      name: "John Doe",
      contactType: "primary",
      designation: "Marketing Director",
      email: "john@acme.example.com",
      phone: "+1 555 0100",
      linkedin: null,
      notes: null,
      status: "active",
      ...auditFields(-30),
    },
    {
      contactId: id.contactPriya,
      clientId: id.clientNorthwind,
      name: "Priya Shah",
      contactType: "billing",
      designation: "Finance Lead",
      email: "priya@northwind.example.com",
      phone: "+44 20 7946 0100",
      linkedin: null,
      notes: null,
      status: "active",
      ...auditFields(-12),
    },
  ];

  const activityLogs = [
    {
      activityId: sequentialUuid(501),
      organizationId: DEMO_ORG_ID,
      userId: DEMO_USER_ID,
      module: "clients",
      action: "create",
      entityType: "client",
      entityId: id.clientAcme,
      description: "Created client Acme Global",
      metadata: null,
      createdAt: seedDate(-30),
    },
    {
      activityId: sequentialUuid(502),
      organizationId: DEMO_ORG_ID,
      userId: DEMO_USER_ID,
      module: "clients",
      action: "create",
      entityType: "client_contact",
      entityId: id.clientAcme,
      description: "Added contact John Doe",
      metadata: null,
      createdAt: seedDate(-29),
    },
    {
      activityId: sequentialUuid(503),
      organizationId: DEMO_ORG_ID,
      userId: DEMO_USER_ID,
      module: "clients",
      action: "create",
      entityType: "client",
      entityId: id.clientNorthwind,
      description: "Created client Northwind Studios",
      metadata: null,
      createdAt: seedDate(-12),
    },
  ];

  const clientSummary = (clientId: string) => {
    const client = clients.find((c) => c.clientId === clientId)!;
    return { companyName: client.companyName, status: client.status };
  };

  const projects = [
    {
      projectId: id.projectWebsite,
      organizationId: DEMO_ORG_ID,
      projectCode: "AIC-2026-0001",
      projectName: "Website Redesign",
      description: "Full redesign of the Acme marketing site with a new design system.",
      clientId: id.clientAcme,
      projectManager: DEMO_USER_ID,
      creativeDirector: null,
      departmentId: null,
      priority: "high",
      status: "in_progress",
      startDate: seedDate(-21),
      estimatedEndDate: seedDate(35),
      actualEndDate: null,
      completionPercentage: 45,
      budget: "15000",
      healthStatus: "on_track",
      visibility: "internal",
      tags: ["web", "design-system"],
      ...auditFields(-21),
      client: clientSummary(id.clientAcme),
      manager: { ...DEMO_USER_SUMMARY },
    },
    {
      projectId: id.projectBrand,
      organizationId: DEMO_ORG_ID,
      projectCode: "AIC-2026-0002",
      projectName: "Brand Campaign Q3",
      description: "Multi-channel launch campaign for Northwind's autumn slate.",
      clientId: id.clientNorthwind,
      projectManager: DEMO_USER_ID,
      creativeDirector: null,
      departmentId: null,
      priority: "medium",
      status: "planning",
      startDate: seedDate(-5),
      estimatedEndDate: seedDate(60),
      actualEndDate: null,
      completionPercentage: 10,
      budget: "8000",
      healthStatus: "on_track",
      visibility: "internal",
      tags: ["campaign"],
      ...auditFields(-5),
      client: clientSummary(id.clientNorthwind),
      manager: { ...DEMO_USER_SUMMARY },
    },
  ];

  const projectMembers = [
    {
      memberId: id.memberAdmin,
      projectId: id.projectWebsite,
      userId: DEMO_USER_ID,
      role: "project_manager",
      status: "active",
      ...auditFields(-21),
      user: { ...DEMO_USER_SUMMARY },
    },
  ];

  const timelines = [
    {
      timelineId: id.timelineWebsite,
      projectId: id.projectWebsite,
      organizationId: DEMO_ORG_ID,
      status: "in_progress",
      startDate: seedDate(-21),
      endDate: seedDate(35),
      overallProgress: 45,
      ...auditFields(-21),
    },
  ];

  const phaseSeed: Array<[string, string, number]> = [
    [id.phasePlanning, "planning", 0],
    [id.phasePreProd, "pre_production", 1],
    [id.phaseProduction, "production", 2],
    [id.phasePostProd, "post_production", 3],
    [id.phaseDelivery, "delivery", 4],
  ];

  const projectPhases = phaseSeed.map(([phaseId, name, orderIndex]) => ({
    phaseId,
    timelineId: id.timelineWebsite,
    organizationId: DEMO_ORG_ID,
    name,
    orderIndex,
    startDate: null,
    endDate: null,
    status: orderIndex === 0 ? "completed" : orderIndex === 1 ? "in_progress" : "not_started",
    ...auditFields(-21),
  }));

  const milestoneSeed: Array<[string, string, string, number, number, number, string]> = [
    [id.milestoneDiscovery, id.phasePlanning, "Discovery & Audit", -21, -14, 100, "completed"],
    [id.milestoneWireframes, id.phasePreProd, "Wireframes", -13, -2, 80, "in_progress"],
    [id.milestoneBuild, id.phaseProduction, "Build & Integration", 0, 21, 10, "in_progress"],
    [id.milestoneLaunch, id.phaseDelivery, "Launch", 28, 35, 0, "not_started"],
  ];

  const milestones = milestoneSeed.map(([milestoneId, phaseId, name, start, end, progress, status]) => ({
    milestoneId,
    timelineId: id.timelineWebsite,
    phaseId,
    organizationId: DEMO_ORG_ID,
    name,
    description: null,
    startDate: seedDate(start as number),
    endDate: seedDate(end as number),
    progress,
    status,
    ...auditFields(-21),
  }));

  const timelineDependencies = [
    {
      dependencyId: id.depWireframesBuild,
      timelineId: id.timelineWebsite,
      organizationId: DEMO_ORG_ID,
      predecessorId: id.milestoneWireframes,
      successorId: id.milestoneBuild,
      dependencyType: "FS",
      ...auditFields(-20),
    },
  ];

  const taskSeed: Array<[string, string, string, string, string]> = [
    [id.taskAudit, "AIC-T-2026-0001", "Content audit", "completed", "medium"],
    [id.taskWireframes, "AIC-T-2026-0002", "Design wireframes", "in_progress", "high"],
    [id.taskCopy, "AIC-T-2026-0003", "Draft homepage copy", "todo", "medium"],
  ];

  const tasks = taskSeed.map(([taskId, taskCode, name, status, priority], index) => ({
    taskId,
    taskCode,
    organizationId: DEMO_ORG_ID,
    projectId: id.projectWebsite,
    milestoneId: id.milestoneWireframes,
    name,
    description: null,
    status,
    priority,
    isPrivate: false,
    estimatedDurationMins: 480,
    actualDurationMins: status === "completed" ? 420 : 0,
    assignees: [],
    ...auditFields(-20 + index),
  }));

  return {
    nextId: 1000,
    clients,
    clientContacts,
    activityLogs,
    projects,
    projectMembers,
    timelines,
    projectPhases,
    milestones,
    timelineDependencies,
    timelineVersions: [],
    tasks,
    taskTimeEntries: [],
    taskDependencies: [],
  };
}

const GLOBAL_KEY = "__AI_NEXOS_DEMO_STORE__";

export function getDemoStore(): DemoStore {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: DemoStore };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createSeedData();
  }
  return g[GLOBAL_KEY];
}

/** Next deterministic UUID for entities created during the session. */
export function nextDemoId(store: DemoStore): string {
  return sequentialUuid(store.nextId++);
}

/** Next number in a per-session sequence, for AIC-YYYY-XXXX style codes. */
export function nextDemoCode(store: DemoStore, prefix: string): string {
  const sequence = store.nextId++;
  return `${prefix}-${sequence.toString().padStart(4, "0")}`;
}

export function logDemoActivity(
  store: DemoStore,
  module: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  metadata?: Record<string, unknown>,
): void {
  store.activityLogs.push({
    activityId: nextDemoId(store),
    organizationId: DEMO_ORG_ID,
    userId: DEMO_USER_ID,
    module,
    action,
    entityType,
    entityId,
    description,
    metadata: metadata ?? null,
    createdAt: new Date(),
  });
}
