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

/**
 * The client whose portal the demo walkthrough shows (Acme, `id.clientAcme`).
 *
 * Exported because the portal previously repeated this UUID as a literal in
 * `src/app/portal/(portal)/dashboard/page.tsx`, beside a second literal
 * `"mock-client-id"` used outside demo mode. One name, defined next to the data
 * it identifies, is what keeps the demo identity from drifting into a
 * production code path again.
 */
export const DEMO_PORTAL_CLIENT_ID = "00000000-0000-4000-8000-000000000101";

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
  deliverableBrand: sequentialUuid(501),
  deliverableWireframes: sequentialUuid(502),
  revisionBrandV1: sequentialUuid(511),
  revisionWireframesV1: sequentialUuid(512),
  deptLeadership: sequentialUuid(221),
  deptOperations: sequentialUuid(222),
  deptCreative: sequentialUuid(223),
  userDev: sequentialUuid(215),
  userQa: sequentialUuid(216),
  meetingQuarterly: sequentialUuid(601),
  approvalBrand: sequentialUuid(701),
  notificationBrand: sequentialUuid(801),
  folderBrandAssets: sequentialUuid(901),
  folderLogos: sequentialUuid(902),
  folderDesign: sequentialUuid(903),
  fileBrandBook: sequentialUuid(911),
  fileLogoPrimary: sequentialUuid(912),
  fileLogoMono: sequentialUuid(913),
  fileHomepageWireframe: sequentialUuid(914),
  fileContentAudit: sequentialUuid(915),
  fileLaunchTeaser: sequentialUuid(916),
  notificationEvent: sequentialUuid(821),
  // Sprint 12B — meeting sub-entities and the notification template/event pair.
  attendeeAdmin: sequentialUuid(611),
  attendeePaul: sequentialUuid(612),
  attendeeClient: sequentialUuid(613),
  agendaProgress: sequentialUuid(621),
  agendaRisks: sequentialUuid(622),
  agendaNextSteps: sequentialUuid(623),
  outcomeDecision: sequentialUuid(631),
  outcomeAction: sequentialUuid(632),
  decisionScope: sequentialUuid(641),
  actionItemDeck: sequentialUuid(642),
  meetingActivityCreated: sequentialUuid(651),
  templateDeliverable: sequentialUuid(831),
  templateMeeting: sequentialUuid(832),
  templateTask: sequentialUuid(833),
  notificationMeeting: sequentialUuid(802),
  notificationTask: sequentialUuid(803),
  notificationEventMeeting: sequentialUuid(822),
  notificationEventTask: sequentialUuid(823),
};

/** Current-version id for a seeded file: fileId 9xx ↔ versionId 9xx + 30. */
function seedVersionId(fileId: string): string {
  return sequentialUuid(Number.parseInt(fileId.slice(-12), 10) + 30);
}

export type DemoStore = {
  /** Monotonic counter backing generated ids and entity codes. */
  nextId: number;
  organizations: any[];
  organizationMemberships: any[];
  departments: any[];
  users: any[];
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
  // Task sub-collections (Sprint 12B): assignment, comments and the activity
  // trail the task domain has always had tables for.
  taskAssignees: any[];
  taskComments: any[];
  taskActivity: any[];
  deliverables: any[];
  deliverableFiles: any[];
  meetings: any[];
  // Meetings sub-collections (Sprint 12B). Previously created lazily by
  // mock-actions on first write, which meant the seeded meeting had no
  // attendees, agenda or outcomes to show and the drawer had nothing to render.
  meetingAttendees: any[];
  meetingAgenda: any[];
  meetingOutcomes: any[];
  meetingDecisions: any[];
  meetingActionItems: any[];
  meetingActivity: any[];
  approvalCycles: any[];
  notifications: any[];
  // Sprint 12B: the in-app template set the notification feed renders from.
  notificationTemplates: any[];
  notificationPreferences: any[];
  reviews: any[];
  aiAgents: any[];
  aiAgentSessions: any[];
  aiAgentExecutionRuns: any[];
  automationWorkflows: any[];
  automationWorkflowVersions: any[];
  automationExecutionRuns: any[];
  automationDeadLetterQueue: any[];
  // Workforce · Attendance (merge doc 14 §13.3; Sprint 3A / WP-108 subset).
  attendanceRecords: any[];
  attendanceBreaks: any[];
  // Workforce · Corrections (merge doc 14 §13.3; Sprint 3B / WP-120).
  attendanceCorrections: any[];
  // Workforce · Work Validation result read model (Sprint 4B) — the engine's
  // rich per-day result (timeline/focus/violations/derived) projected by the
  // attendance event handler; hot-path minutes stay on attendanceRecords.
  attendanceValidations: any[];
  // L3 domain event log (merge doc 14 §11.1) — demo mirror of the events
  // table; notification/search consumers read this in later phases.
  domainEvents: any[];
  // Digital Asset Management (DAM) collections (files feature).
  files: any[];
  fileVersions: any[];
  fileRelations: any[];
  fileShares: any[];
  fileFolders: any[];
  // Approval sub-collections (approvals feature).
  approvalEvents: any[];
  approvalConditions: any[];
  // Deliverables sub-collections (deliverables feature).
  deliverableRevisions: any[];
  deliverableReviewSessions: any[];
  deliverableApprovals: any[];
  deliverableShareLinks: any[];
  deliverableReviewComments: any[];
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

  const organizations = [
    {
      organizationId: DEMO_ORG_ID,
      // Column names mirror src/db/schema/organizations.ts exactly. Sprint 12A
      // P1-02: this row previously used `name` / `brandColors[]`, which the
      // Organisation Profile form (which reads the real column names) could
      // neither load nor persist. Schema parity is asserted by
      // tests/demo-store-schema-parity.test.ts.
      organizationName: "AI NEX OS Demo",
      legalName: "AI NEX OS LLC",
      slug: "demo-workspace",
      codePrefix: "NEX",
      logoUrl: null,
      website: "https://demo.ainexos.com",
      industry: "Technology",
      timezone: "UTC",
      currency: "USD",
      country: "US",
      address: null,
      contactEmail: "hello@demo.ainexos.com",
      contactPhone: null,
      brandPrimaryColor: "#0f172a",
      brandSecondaryColor: "#38bdf8",
      status: "active",
      ...auditFields(-60),
    },
  ];

  // Workforce carry-in (merge doc 17 WP-103): departments get real UUIDs so
  // the E-1 `departmentId` filter (zod .uuid()) round-trips in demo mode.
  const departments = [
    {
      departmentId: id.deptLeadership,
      organizationId: DEMO_ORG_ID,
      name: "Leadership",
      ...auditFields(-60),
    },
    {
      departmentId: id.deptOperations,
      organizationId: DEMO_ORG_ID,
      name: "Operations",
      ...auditFields(-60),
    },
    {
      departmentId: id.deptCreative,
      organizationId: DEMO_ORG_ID,
      name: "Creative Studio",
      ...auditFields(-60),
    },
  ];

  // Manager chain (acyclic): admin ← Sarah ← Paul ← {Tara, Devon, Quinn}.
  // Paul's 3+ member team is required by WP-130 QA (doc 17 WP-103 acceptance).
  const users = [
    {
      userId: DEMO_USER_ID,
      organizationId: DEMO_ORG_ID,
      email: "admin@demo.local",
      firstName: "Demo",
      lastName: "Administrator",
      avatarUrl: null,
      designation: "Principal Admin",
      roleId: "demo-role-owner",
      departmentId: id.deptLeadership,
      employeeCode: "AIC-0001",
      managerId: null,
      location: "New York, US",
      employmentType: "full_time",
      hireDate: "2024-01-15",
      terminationDate: null,
      status: "active",
      ...auditFields(-60),
    },
    {
      userId: sequentialUuid(212),
      organizationId: DEMO_ORG_ID,
      email: "super@demo.local",
      firstName: "Sarah",
      lastName: "Super",
      avatarUrl: null,
      designation: "Operations Director",
      roleId: "demo-role-super_admin",
      departmentId: id.deptOperations,
      employeeCode: "AIC-0002",
      managerId: DEMO_USER_ID,
      location: "New York, US",
      employmentType: "full_time",
      hireDate: "2024-03-01",
      terminationDate: null,
      status: "active",
      ...auditFields(-50),
    },
    {
      userId: sequentialUuid(213),
      organizationId: DEMO_ORG_ID,
      email: "pm@demo.local",
      firstName: "Paul",
      lastName: "Manager",
      avatarUrl: null,
      designation: "Senior PM",
      roleId: "demo-role-project_manager",
      departmentId: id.deptCreative,
      employeeCode: "AIC-0003",
      managerId: sequentialUuid(212),
      location: "Austin, US",
      employmentType: "full_time",
      hireDate: "2024-06-10",
      terminationDate: null,
      status: "active",
      ...auditFields(-40),
    },
    {
      userId: sequentialUuid(214),
      organizationId: DEMO_ORG_ID,
      email: "team@demo.local",
      firstName: "Tara",
      lastName: "Member",
      avatarUrl: null,
      designation: "Designer",
      roleId: "demo-role-team_member",
      departmentId: id.deptCreative,
      employeeCode: "AIC-0004",
      managerId: sequentialUuid(213),
      location: "Remote",
      employmentType: "full_time",
      hireDate: "2025-02-03",
      terminationDate: null,
      status: "active",
      ...auditFields(-30),
    },
    {
      userId: id.userDev,
      organizationId: DEMO_ORG_ID,
      email: "devon@demo.local",
      firstName: "Devon",
      lastName: "Builder",
      avatarUrl: null,
      designation: "Frontend Engineer",
      roleId: "demo-role-team_member",
      departmentId: id.deptCreative,
      employeeCode: "AIC-0005",
      managerId: sequentialUuid(213),
      location: "Remote",
      employmentType: "full_time",
      hireDate: "2025-04-21",
      terminationDate: null,
      status: "active",
      ...auditFields(-25),
    },
    {
      userId: id.userQa,
      organizationId: DEMO_ORG_ID,
      email: "quinn@demo.local",
      firstName: "Quinn",
      lastName: "Assure",
      avatarUrl: null,
      designation: "QA Analyst",
      roleId: "demo-role-team_member",
      departmentId: id.deptCreative,
      employeeCode: "AIC-0006",
      managerId: sequentialUuid(213),
      location: "London, UK",
      employmentType: "contract",
      hireDate: "2025-09-08",
      terminationDate: null,
      status: "active",
      ...auditFields(-20),
    },
    // Sprint 2 (WP-105B): lifecycle coverage — one inactive, one archived.
    {
      userId: sequentialUuid(217),
      organizationId: DEMO_ORG_ID,
      email: "ivy@demo.local",
      firstName: "Ivy",
      lastName: "Onleave",
      avatarUrl: null,
      designation: "Copywriter",
      roleId: "demo-role-team_member",
      departmentId: id.deptCreative,
      employeeCode: "AIC-0007",
      managerId: sequentialUuid(213),
      location: "Remote",
      employmentType: "part_time",
      hireDate: "2025-11-17",
      terminationDate: null,
      status: "inactive",
      ...auditFields(-15),
    },
    {
      userId: sequentialUuid(218),
      organizationId: DEMO_ORG_ID,
      email: "alumni@demo.local",
      firstName: "Alex",
      lastName: "Alumni",
      avatarUrl: null,
      designation: "Motion Designer",
      roleId: "demo-role-team_member",
      departmentId: id.deptCreative,
      employeeCode: "AIC-0008",
      managerId: null,
      location: "Berlin, DE",
      employmentType: "contract",
      hireDate: "2025-01-20",
      terminationDate: "2026-06-30",
      status: "archived",
      ...auditFields(-10),
      isArchived: true,
    },
  ];

  const organizationMemberships = users.map((u, idx) => ({
    membershipId: sequentialUuid(900 + idx),
    userId: u.userId,
    organizationId: u.organizationId,
    roleId: u.roleId,
    departmentId: u.departmentId ?? null,
    designation: u.designation ?? null,
    employmentType: u.employmentType ?? "full_time",
    workingHours: null,
    status: u.status === "archived" ? "suspended" : "active",
    isDefault: true,
    joinedAt: seedDate(-60),
    invitedAt: null,
    acceptedAt: seedDate(-60),
    suspendedAt: u.status === "archived" ? seedDate(-10) : null,
    removedAt: null,
    ...auditFields(-60),
  }));

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
    {
      activityId: sequentialUuid(504),
      organizationId: DEMO_ORG_ID,
      userId: DEMO_USER_ID,
      module: "client_portal",
      action: "Deliverable Uploaded",
      entityType: "deliverable",
      entityId: id.clientAcme,
      description: "Brand Guidelines v2",
      metadata: { clientId: id.clientAcme },
      createdAt: seedDate(-1),
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
      description:
        "Full redesign of the Acme marketing site with a new design system.",
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
      description:
        "Multi-channel launch campaign for Northwind's autumn slate.",
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
    status:
      orderIndex === 0
        ? "completed"
        : orderIndex === 1
          ? "in_progress"
          : "not_started",
    ...auditFields(-21),
  }));

  const milestoneSeed: Array<
    [string, string, string, number, number, number, string]
  > = [
    [
      id.milestoneDiscovery,
      id.phasePlanning,
      "Discovery & Audit",
      -21,
      -14,
      100,
      "completed",
    ],
    [
      id.milestoneWireframes,
      id.phasePreProd,
      "Wireframes",
      -13,
      -2,
      80,
      "in_progress",
    ],
    [
      id.milestoneBuild,
      id.phaseProduction,
      "Build & Integration",
      0,
      21,
      10,
      "in_progress",
    ],
    [id.milestoneLaunch, id.phaseDelivery, "Launch", 28, 35, 0, "not_started"],
  ];

  const milestones = milestoneSeed.map(
    ([milestoneId, phaseId, name, start, end, progress, status]) => ({
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
    }),
  );

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

  // [taskId, taskCode, name, status, priority, taskType, progress]
  const taskSeed: Array<
    [string, string, string, string, string, string, number]
  > = [
    [
      id.taskAudit,
      "AIC-T-2026-0001",
      "Content audit",
      "completed",
      "medium",
      "research",
      100,
    ],
    [
      id.taskWireframes,
      "AIC-T-2026-0002",
      "Design wireframes",
      "in_progress",
      "high",
      "design",
      60,
    ],
    [
      id.taskCopy,
      "AIC-T-2026-0003",
      "Draft homepage copy",
      "todo",
      "medium",
      "creative",
      0,
    ],
  ];

  // Column names mirror src/db/schema/tasks.ts. Sprint 12A added the columns
  // the task detail dialog reads but the seed never carried (timelineId,
  // phaseId, taskType, progress, scheduling) — previously rendered as "—".
  const tasks = taskSeed.map(
    (
      [taskId, taskCode, name, status, priority, taskType, progress],
      index,
    ) => ({
      taskId,
      taskCode,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      timelineId: id.timelineWebsite,
      phaseId: id.phasePreProd,
      milestoneId: id.milestoneWireframes,
      parentTaskId: null,
      name,
      description: null,
      status,
      priority,
      taskType,
      startDate: seedDate(-13),
      dueDate: seedDate(-2 + index),
      estimatedDurationMins: 480,
      actualDurationMins: status === "completed" ? 420 : 0,
      progress,
      isTemplate: false,
      recurrenceRule: null,
      isPrivate: false,
      assignees: [],
      ...auditFields(-20 + index),
    }),
  );

  // Sprint 12B: task assignment, comments and history. The tables have existed
  // since Sprint 11; nothing wrote to them, so the detail dialog had no
  // assignee, no discussion and no history to render.
  const taskAssignees = [
    {
      assigneeId: sequentialUuid(411),
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      taskId: id.taskWireframes,
      userId: sequentialUuid(214), // Tara — Designer
      ...auditFields(-19),
    },
    {
      assigneeId: sequentialUuid(412),
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      taskId: id.taskCopy,
      userId: sequentialUuid(217), // Ivy — Copywriter
      ...auditFields(-18),
    },
  ];

  const taskComments = [
    {
      commentId: sequentialUuid(421),
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      taskId: id.taskWireframes,
      content: { text: "Desktop frames are done; mobile is next." },
      ...auditFields(-4),
    },
    {
      commentId: sequentialUuid(422),
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      taskId: id.taskWireframes,
      content: { text: "Acme asked for a taller hero — reflected in v3." },
      ...auditFields(-2),
    },
  ];

  const taskActivity = [
    {
      activityId: sequentialUuid(431),
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      taskId: id.taskWireframes,
      eventType: "created",
      metadata: { name: "Design wireframes" },
      ...auditFields(-19),
    },
    {
      activityId: sequentialUuid(432),
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      taskId: id.taskWireframes,
      eventType: "status_changed",
      metadata: { from: "todo", to: "in_progress" },
      ...auditFields(-13),
    },
  ];

  // Sprint 12A (P2-01): "pending" is not a member of deliverableStatusEnum, so
  // the row was unreachable through every status filter while still rendering
  // as "Pending". Both rows now carry the full schema column set — projectId,
  // type, currentRevisionId and isLocked are read by the directory, the detail
  // drawer and the approval/revision/share actions.
  const deliverables = [
    {
      deliverableId: id.deliverableBrand,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      clientId: id.clientAcme,
      taskId: null,
      title: "Brand Guidelines v2",
      description: "Refreshed brand system: logo usage, palette, typography.",
      type: "brand_identity",
      status: "client_review",
      currentRevisionId: id.revisionBrandV1,
      isLocked: false,
      aiMetadata: null,
      ...auditFields(-2),
    },
    {
      deliverableId: id.deliverableWireframes,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      clientId: id.clientAcme,
      taskId: id.taskWireframes,
      title: "Homepage Wireframes",
      description: "Desktop and mobile wireframes for the new homepage.",
      type: "presentation",
      status: "approved",
      currentRevisionId: id.revisionWireframesV1,
      isLocked: true,
      aiMetadata: null,
      ...auditFields(-5),
    },
  ];

  const deliverableRevisions = [
    {
      revisionId: id.revisionBrandV1,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      deliverableId: id.deliverableBrand,
      versionNumber: 1,
      reason: null,
      requestedBy: DEMO_USER_ID,
      clientRequesterName: null,
      status: "client_review",
      comparisonMetadata: null,
      ...auditFields(-2),
    },
    {
      revisionId: id.revisionWireframesV1,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      deliverableId: id.deliverableWireframes,
      versionNumber: 1,
      reason: null,
      requestedBy: DEMO_USER_ID,
      clientRequesterName: null,
      status: "approved",
      comparisonMetadata: null,
      ...auditFields(-5),
    },
  ];

  const meetings = [
    {
      meetingId: id.meetingQuarterly,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      timelineId: id.timelineWebsite,
      templateId: null,
      title: "Quarterly Review",
      description: "Progress review with Acme against the Q3 roadmap.",
      meetingType: "client_review",
      status: "scheduled",
      startTime: seedDate(1),
      endTime: seedDate(1.04),
      timezone: "UTC",
      location: "Acme HQ — Room 4",
      meetingUrl: "https://meet.google.com/demo-quarterly",
      provider: "google_meet",
      externalMeetingId: null,
      isPrivate: false,
      isConfidential: false,
      notes: null,
      aiSummaryId: null,
      aiSummaryProcessingStatus: null,
      ...auditFields(-10),
    },
  ];

  // Sprint 12B: the meeting sub-collections the aggregate always had columns
  // for. Without these the drawer's attendee, agenda, decision and action-item
  // panels open empty on a seeded meeting and the module reads as unbuilt.
  const meetingAttendees = [
    {
      attendeeId: id.attendeeAdmin,
      organizationId: DEMO_ORG_ID,
      meetingId: id.meetingQuarterly,
      userId: DEMO_USER_ID,
      externalEmail: null,
      role: "organizer",
      rsvpStatus: "accepted",
      ...auditFields(-10),
    },
    {
      attendeeId: id.attendeePaul,
      organizationId: DEMO_ORG_ID,
      meetingId: id.meetingQuarterly,
      userId: sequentialUuid(213),
      externalEmail: null,
      role: "participant",
      rsvpStatus: "tentative",
      ...auditFields(-9),
    },
    {
      attendeeId: id.attendeeClient,
      organizationId: DEMO_ORG_ID,
      meetingId: id.meetingQuarterly,
      userId: null,
      externalEmail: "john@acme.example.com",
      role: "participant",
      rsvpStatus: "pending",
      ...auditFields(-9),
    },
  ];

  const meetingAgenda = [
    {
      agendaItemId: id.agendaProgress,
      organizationId: DEMO_ORG_ID,
      meetingId: id.meetingQuarterly,
      title: "Q3 progress against the roadmap",
      description: "Milestone-by-milestone walkthrough.",
      orderIndex: 0,
      timeAllottedMins: 20,
      speakerId: DEMO_USER_ID,
      isCompleted: true,
      ...auditFields(-9),
    },
    {
      agendaItemId: id.agendaRisks,
      organizationId: DEMO_ORG_ID,
      meetingId: id.meetingQuarterly,
      title: "Open risks and blockers",
      description: null,
      orderIndex: 1,
      timeAllottedMins: 15,
      speakerId: sequentialUuid(213),
      isCompleted: false,
      ...auditFields(-9),
    },
    {
      agendaItemId: id.agendaNextSteps,
      organizationId: DEMO_ORG_ID,
      meetingId: id.meetingQuarterly,
      title: "Next steps and owners",
      description: null,
      orderIndex: 2,
      timeAllottedMins: 10,
      speakerId: null,
      isCompleted: false,
      ...auditFields(-9),
    },
  ];

  const meetingOutcomes = [
    {
      outcomeId: id.outcomeDecision,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      meetingId: id.meetingQuarterly,
      outcomeType: "decision",
      title: "Ship the homepage before the interior pages",
      description:
        "Acme wants the marketing hero live for the autumn campaign.",
      raisedById: DEMO_USER_ID,
      ownerId: DEMO_USER_ID,
      ...auditFields(-9),
    },
    {
      outcomeId: id.outcomeAction,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      meetingId: id.meetingQuarterly,
      outcomeType: "action_item",
      title: "Circulate the revised wireframe deck",
      description: "Send v3 to Acme with the annotated changes.",
      raisedById: DEMO_USER_ID,
      ownerId: sequentialUuid(213),
      ...auditFields(-9),
    },
  ];

  const meetingDecisions = [
    {
      decisionId: id.decisionScope,
      organizationId: DEMO_ORG_ID,
      outcomeId: id.outcomeDecision,
      decisionType: "strategic",
      status: "accepted",
      priority: "high",
      reason: "Campaign launch date is fixed.",
      impactDescription: "Interior pages move to the following sprint.",
      riskLevel: "medium",
      ...auditFields(-9),
    },
  ];

  const meetingActionItems = [
    {
      actionItemId: id.actionItemDeck,
      organizationId: DEMO_ORG_ID,
      outcomeId: id.outcomeAction,
      status: "open",
      priority: "medium",
      dueDate: seedDate(3),
      estimatedDurationMins: 60,
      promotedToTaskId: null,
      ...auditFields(-9),
    },
  ];

  const meetingActivity = [
    {
      activityId: id.meetingActivityCreated,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      meetingId: id.meetingQuarterly,
      eventType: "meeting_created",
      metadata: { title: "Quarterly Review" },
      createdBy: DEMO_USER_ID,
      createdAt: seedDate(-10),
    },
  ];

  // Digital Asset Management seed. Previously empty, which left the Files
  // workspace and its folder browser showing an empty state end to end and
  // therefore unreviewable. Two levels of hierarchy under the website
  // project (Brand Assets ▸ Logos) plus a sibling folder and one root-level
  // file, so the flat list, the folder browser, breadcrumbs, and the
  // status/type/size columns all have something real to render.
  const fileFolders = [
    {
      folderId: id.folderBrandAssets,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      parentId: null,
      name: "Brand Assets",
      color: "#3B82F6",
      ...auditFields(-18),
    },
    {
      folderId: id.folderLogos,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      parentId: id.folderBrandAssets,
      name: "Logos",
      color: "#8B5CF6",
      ...auditFields(-17),
    },
    {
      folderId: id.folderDesign,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      parentId: null,
      name: "Design",
      color: "#10B981",
      ...auditFields(-16),
    },
  ];

  const fileSeed: Array<
    [string, string | null, string, string, string, number, number]
  > = [
    // [fileId, folderId, title, fileType, status, sizeBytes, daysOffset]
    // status values come from fileLifecycleStatusEnum (src/db/schema/enums.ts);
    // the spread covers a terminal-positive, a ready, an uploaded, and one
    // still mid-pipeline so every StatusBadge branch is exercised.
    [
      id.fileBrandBook,
      id.folderBrandAssets,
      "Brand Book 2026.pdf",
      "document",
      "published",
      4_718_592,
      -18,
    ],
    [
      id.fileLogoPrimary,
      id.folderLogos,
      "Logo — Primary.svg",
      "image",
      "published",
      24_576,
      -17,
    ],
    [
      id.fileLogoMono,
      id.folderLogos,
      "Logo — Monochrome.svg",
      "image",
      "ready",
      21_504,
      -17,
    ],
    [
      id.fileHomepageWireframe,
      id.folderDesign,
      "Homepage Wireframe v3.png",
      "image",
      "uploaded",
      1_887_437,
      -12,
    ],
    [
      id.fileLaunchTeaser,
      id.folderDesign,
      "Launch Teaser Cut.mp4",
      "video",
      "thumbnail_generation",
      68_157_440,
      -6,
    ],
    [
      id.fileContentAudit,
      null,
      "Content Audit.xlsx",
      "document",
      "archived",
      512_000,
      -20,
    ],
  ];

  const files = fileSeed.map(
    ([
      fileId,
      folderId,
      title,
      fileType,
      status,
      totalSizeBytes,
      daysOffset,
    ]) => ({
      fileId,
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      folderId,
      title,
      description: null,
      fileType,
      status,
      // Sprint 12A: seeded files previously had no current version, so share
      // links (generateShareLink takes a versionId) were unreachable for every
      // demo file. Each file now has a v1 in fileVersions below.
      currentVersionId: seedVersionId(fileId),
      totalSizeBytes,
      aiMetadata: null,
      ...auditFields(daysOffset),
    }),
  );

  const MIME_BY_TYPE: Record<string, string> = {
    document: "application/pdf",
    image: "image/svg+xml",
    video: "video/mp4",
  };

  const fileVersions = fileSeed.map(
    ([fileId, , title, fileType, , totalSizeBytes, daysOffset]) => ({
      versionId: seedVersionId(fileId),
      organizationId: DEMO_ORG_ID,
      projectId: id.projectWebsite,
      fileId,
      versionNumber: 1,
      storagePath: `demo/${id.projectWebsite}/${fileId}/v1`,
      originalFilename: title,
      mimeType: MIME_BY_TYPE[fileType] ?? "application/octet-stream",
      sizeBytes: totalSizeBytes,
      sha256Hash: `demo-sha256-${fileId.slice(-6)}`,
      metadata: null,
      changeReason: null,
      uploadedBy: DEMO_USER_ID,
      ...auditFields(daysOffset),
    }),
  );

  const approvalCycles = [
    {
      cycleId: id.approvalBrand,
      organizationId: DEMO_ORG_ID,
      entityType: "deliverable",
      entityId: id.deliverableBrand,
      status: "pending",
      ...auditFields(-2),
    },
  ];

  // Sprint 12A: notifications now mirror src/db/schema/notifications.ts. The
  // previous row carried `title`/`message`/`isRead`, none of which exist on
  // the table — the notification read model is deliberately event-derived
  // (eventId + priority + status), so a rendered headline requires a
  // template join the read layer does not perform. See SPRINT-12A.md.
  const notifications = [
    {
      notificationId: id.notificationBrand,
      organizationId: DEMO_ORG_ID,
      eventId: id.notificationEvent,
      userId: DEMO_USER_ID,
      priority: "normal",
      status: "delivered",
      readAt: null,
      ...auditFields(-2),
    },
    {
      notificationId: id.notificationMeeting,
      organizationId: DEMO_ORG_ID,
      eventId: id.notificationEventMeeting,
      userId: DEMO_USER_ID,
      priority: "high",
      status: "delivered",
      readAt: null,
      ...auditFields(-1),
    },
    {
      notificationId: id.notificationTask,
      organizationId: DEMO_ORG_ID,
      eventId: id.notificationEventTask,
      userId: DEMO_USER_ID,
      priority: "low",
      status: "read",
      readAt: seedDate(-3),
      ...auditFields(-4),
    },
  ];

  // Sprint 12B: the events the notifications above point at. `notifications`
  // has always been an event-derived read model — eventId + priority + status,
  // no subject and no body — so without these rows the bell had nothing to
  // render but a delivery state. This is the demo mirror of the `events`
  // schema; the real adapter joins the same three tables.
  const domainEvents = [
    {
      eventId: id.notificationEvent,
      organizationId: DEMO_ORG_ID,
      eventType: "deliverable",
      eventVersion: 1,
      aggregateType: "deliverable",
      aggregateId: id.deliverableBrand,
      payload: {
        title: "Brand Guidelines v2",
        status: "client_review",
        actorName: "Demo Administrator",
        deliverableId: id.deliverableBrand,
      },
      actorId: DEMO_USER_ID,
      createdAt: seedDate(-2),
    },
    {
      eventId: id.notificationEventMeeting,
      organizationId: DEMO_ORG_ID,
      eventType: "meeting",
      eventVersion: 1,
      aggregateType: "meeting",
      aggregateId: id.meetingQuarterly,
      payload: {
        title: "Quarterly Review",
        status: "scheduled",
        actorName: "Demo Administrator",
        meetingId: id.meetingQuarterly,
      },
      actorId: DEMO_USER_ID,
      createdAt: seedDate(-1),
    },
    {
      eventId: id.notificationEventTask,
      organizationId: DEMO_ORG_ID,
      eventType: "task",
      eventVersion: 1,
      aggregateType: "task",
      aggregateId: id.taskWireframes,
      payload: {
        title: "Design wireframes",
        status: "in_progress",
        actorName: "Paul Manager",
        taskId: id.taskWireframes,
      },
      actorId: sequentialUuid(213),
      createdAt: seedDate(-4),
    },
  ];

  // In-app templates. `{{token}}` paths are resolved against the event payload
  // by src/features/notifications/templates.ts.
  const notificationTemplates = [
    {
      templateId: id.templateDeliverable,
      organizationId: DEMO_ORG_ID,
      eventType: "deliverable",
      channel: "in_app",
      subjectTemplate: "Deliverable updated: {{title}}",
      bodyTemplate: "{{actorName}} moved “{{title}}” to {{status}}.",
      actionUrlTemplate: "/deliverables",
      ...auditFields(-60),
    },
    {
      templateId: id.templateMeeting,
      organizationId: DEMO_ORG_ID,
      eventType: "meeting",
      channel: "in_app",
      subjectTemplate: "Meeting: {{title}}",
      bodyTemplate: "{{actorName}} scheduled “{{title}}” ({{status}}).",
      actionUrlTemplate: "/meetings",
      ...auditFields(-60),
    },
    {
      templateId: id.templateTask,
      organizationId: DEMO_ORG_ID,
      eventType: "task",
      channel: "in_app",
      subjectTemplate: "Task: {{title}}",
      bodyTemplate: "{{actorName}} set “{{title}}” to {{status}}.",
      actionUrlTemplate: "/tasks",
      ...auditFields(-60),
    },
  ];

  // ── Workforce · Attendance seeds (merge doc 14 §13.3; Sprint 3A) ──────────
  // Dates are anchored to the current day so "today" is demonstrable; minutes
  // are DERIVED from the seeded clock timestamps (never hand-typed constants —
  // review rule), matching the finalizer in attendance/clock-service.ts.
  const attendanceRecords: any[] = [];
  const attendanceBreaks: any[] = [];
  {
    const MIN = 60_000;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const anchor = new Date();
    let attnSeq = 0;
    const dayOf = (d: Date) => d.toISOString().slice(0, 10);

    const seedCompleted = (
      userId: string,
      day: string,
      inH: number,
      inM: number,
      outH: number,
      breakMinutes: number,
      wfh = false,
    ) => {
      const clockInAt = new Date(`${day}T${pad(inH)}:${pad(inM)}:00.000Z`);
      const clockOutAt = new Date(`${day}T${pad(outH)}:00:00.000Z`);
      const sessionMin = Math.round(
        (clockOutAt.getTime() - clockInAt.getTime()) / MIN,
      );
      const effectiveMin = Math.max(0, sessionMin - breakMinutes);
      const isLate = inH * 60 + inM > 9 * 60 + 15;
      const halfDay = sessionMin < (8 * 60) / 2;
      const status = wfh
        ? "WFH"
        : isLate
          ? "LATE"
          : halfDay
            ? "HALF_DAY"
            : "PRESENT";
      const overtimeMin =
        effectiveMin - 8 * 60 > 30 ? effectiveMin - 8 * 60 : 0;
      const attendanceId = sequentialUuid(9000 + attnSeq);
      const breakId = sequentialUuid(9500 + attnSeq);
      attnSeq++;
      attendanceRecords.push({
        attendanceId,
        organizationId: DEMO_ORG_ID,
        userId,
        date: day,
        clockInAt,
        clockOutAt,
        status,
        isLate,
        workingMinutes: sessionMin,
        breakMinutes,
        idleMinutes: 0,
        focusMinutes: 0,
        effectiveMinutes: effectiveMin,
        overtimeMinutes: overtimeMin,
        clockInContext: { device: "MacBook Pro", browser: "Chrome" },
        clockOutContext: { device: "MacBook Pro", browser: "Chrome" },
        notes: null,
        ...auditFields(-1),
      });
      const breakStart = new Date(clockInAt.getTime() + 3 * 60 * MIN);
      attendanceBreaks.push({
        breakId,
        organizationId: DEMO_ORG_ID,
        attendanceId,
        startAt: breakStart,
        endAt: new Date(breakStart.getTime() + breakMinutes * MIN),
        kind: "break",
        ...auditFields(-1),
      });
    };

    const seedOpen = (
      userId: string,
      day: string,
      inH: number,
      inM: number,
    ) => {
      const clockInAt = new Date(`${day}T${pad(inH)}:${pad(inM)}:00.000Z`);
      const attendanceId = sequentialUuid(9000 + attnSeq);
      attnSeq++;
      attendanceRecords.push({
        attendanceId,
        organizationId: DEMO_ORG_ID,
        userId,
        date: day,
        clockInAt,
        clockOutAt: null,
        status: "WORKING",
        isLate: inH * 60 + inM > 9 * 60 + 15,
        workingMinutes: 0,
        breakMinutes: 0,
        idleMinutes: 0,
        focusMinutes: 0,
        effectiveMinutes: 0,
        overtimeMinutes: 0,
        clockInContext: { device: "MacBook Pro", browser: "Chrome" },
        clockOutContext: null,
        notes: null,
        ...auditFields(-1),
      });
    };

    // Demo admin (AIC-0001): 30 calendar days of working-day history ending
    // YESTERDAY, so today has no record and the admin can clock in (A-1 demo).
    for (let back = 30; back >= 1; back--) {
      const d = new Date(anchor.getTime() - back * 24 * 60 * MIN);
      const weekday = d.getUTCDay(); // 0 Sun … 6 Sat
      if (weekday === 0 || weekday === 6) continue; // working days only
      // Deterministic variety keyed off the day number (no Math.random).
      const dom = d.getUTCDate();
      if (dom % 10 === 3)
        seedCompleted(DEMO_USER_ID, dayOf(d), 9, 40, 18, 45); // LATE
      else if (dom % 7 === 0)
        seedCompleted(DEMO_USER_ID, dayOf(d), 9, 0, 13, 15); // HALF_DAY
      else if (dom % 5 === 0)
        seedCompleted(DEMO_USER_ID, dayOf(d), 9, 5, 18, 60, true); // WFH
      else seedCompleted(DEMO_USER_ID, dayOf(d), 9, 5, 18, 60); // PRESENT
    }

    // Team: two members clocked in TODAY (open sessions light up the directory
    // + the employees today-status join), one already completed today.
    const today = dayOf(anchor);
    seedOpen(sequentialUuid(213), today, 9, 2); // Paul — WORKING
    seedOpen(sequentialUuid(214), today, 9, 25); // Tara — WORKING (late)
    seedCompleted(sequentialUuid(212), today, 8, 55, 17, 30); // Sarah — PRESENT
  }

  // ── Workforce · Corrections seeds (merge doc 14 §13.3; Sprint 3B) ─────────
  // Five requests across all lifecycle states, on past dates relative to the
  // current day so the correction window (policy 10.5) accepts them.
  const attendanceCorrections: any[] = [];
  {
    const anchor = new Date();
    const dayBack = (n: number) =>
      new Date(anchor.getTime() - n * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    const at = (day: string, hhmm: string) => `${day}T${hhmm}:00.000Z`;
    let corrSeq = 0;
    const mkCorrection = (fields: Record<string, unknown>) => {
      corrSeq++;
      attendanceCorrections.push({
        correctionId: sequentialUuid(9800 + corrSeq),
        organizationId: DEMO_ORG_ID,
        correctionCode: `COR-${corrSeq.toString().padStart(4, "0")}`,
        requestedClockInAt: null,
        requestedClockOutAt: null,
        requestedStatus: null,
        evidenceUrl: null,
        approvalCycleId: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        appliedAt: null,
        createdAt: seedDate(-3),
        ...fields,
      });
    };

    mkCorrection({
      userId: DEMO_USER_ID,
      date: dayBack(3),
      correctionType: "LOGIN_TIME",
      requestedClockInAt: at(dayBack(3), "09:00"),
      reason: "Badge reader failed; actual arrival was 09:00.",
      status: "PENDING",
    });
    mkCorrection({
      userId: sequentialUuid(214), // Tara
      date: dayBack(5),
      correctionType: "BOTH",
      requestedClockInAt: at(dayBack(5), "09:05"),
      requestedClockOutAt: at(dayBack(5), "18:10"),
      reason: "Forgot to clock in and out during the client workshop.",
      status: "UNDER_REVIEW",
    });
    mkCorrection({
      userId: id.userDev, // Devon
      date: dayBack(7),
      correctionType: "LOGOUT_TIME",
      requestedClockOutAt: at(dayBack(7), "19:30"),
      reason: "Stayed late for the release; forgot to clock out.",
      status: "APPROVED",
      reviewedBy: DEMO_USER_ID,
      reviewedAt: seedDate(-6),
      reviewNote: "Confirmed against the deploy log.",
    });
    mkCorrection({
      userId: id.userQa, // Quinn
      date: dayBack(8),
      correctionType: "STATUS_CHANGE",
      requestedStatus: "WFH",
      reason: "Worked from home that day; status was recorded as absent.",
      status: "REJECTED",
      reviewedBy: sequentialUuid(212), // Sarah
      reviewedAt: seedDate(-7),
      reviewNote: "No WFH approval on record for that date.",
    });
    mkCorrection({
      userId: sequentialUuid(213), // Paul
      date: dayBack(10),
      correctionType: "OTHER",
      reason: "Requested in error — will resubmit with the right date.",
      status: "CANCELLED",
    });
  }

  return {
    nextId: 1000,
    organizations,
    organizationMemberships,
    departments,
    users,
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
    taskAssignees,
    taskComments,
    taskActivity,
    deliverables,
    meetings,
    meetingAttendees,
    meetingAgenda,
    meetingOutcomes,
    meetingDecisions,
    meetingActionItems,
    meetingActivity,
    approvalCycles,
    notifications,
    notificationTemplates,
    notificationPreferences: [],
    reviews: [],
    aiAgents: [],
    aiAgentSessions: [],
    aiAgentExecutionRuns: [],
    automationWorkflows: [],
    automationWorkflowVersions: [],
    automationExecutionRuns: [],
    automationDeadLetterQueue: [],
    attendanceRecords,
    attendanceBreaks,
    attendanceCorrections,
    attendanceValidations: [],
    domainEvents,
    // DAM collections — files/fileFolders are seeded (see fileSeed above);
    // the rest are populated on first use by mock-actions.
    files,
    fileVersions,
    fileRelations: [],
    fileShares: [],
    fileFolders,
    // Approval sub-collections.
    approvalEvents: [],
    approvalConditions: [],
    // Deliverables sub-collections.
    deliverableRevisions,
    deliverableFiles: [],
    deliverableReviewSessions: [],
    deliverableApprovals: [],
    deliverableShareLinks: [],
    deliverableReviewComments: [],
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

export function resetDemoStore(): DemoStore {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: DemoStore };
  g[GLOBAL_KEY] = createSeedData();
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
