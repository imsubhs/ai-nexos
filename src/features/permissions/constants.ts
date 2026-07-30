/**
 * Permission vocabulary — the single source of truth shared by the
 * application layer and the database (app.has_permission()).
 * Modules mirror the platform modules (SDS §15); actions mirror TRD §11.
 */
export const MODULES = [
  "organization",
  "departments",
  "users",
  "roles",
  "clients",
  "projects",
  "timeline",
  "tasks",
  "deliverables",
  "approvals",
  "revisions",
  "files",
  "meetings",
  "comments",
  "notifications",
  "reports",
  "analytics",
  "share_links",
  "ai",
  "settings",
  // Workforce bounded context (merge docs 14 §9 / 13 §2). SQL mirror
  // (app.has_permission) is updated via the D-7 parity mechanism in Phase 7.
  "attendance",
  "corrections",
] as const;

export const ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "comment",
  "approve",
  "review",
  "upload",
  "download",
  "share",
  "export",
  "restore",
  "archive",
  // Workforce actions (merge doc 14 §9): clock in/out + breaks; team-scope reads.
  "clock",
  "view_team",
] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];

/** Module → allowed actions. "*" wildcard on either axis grants all. */
export type PermissionMap = Partial<Record<Module | "*", (Action | "*")[]>>;

/**
 * Default system roles (PRD Module 02, DBD §11).
 * Seeded per-organization; org admins can add custom roles later.
 */
export const SYSTEM_ROLES: {
  roleKey: string;
  roleName: string;
  description: string;
  permissions: PermissionMap;
}[] = [
  {
    roleKey: "owner",
    roleName: "Owner",
    description: "Full platform control.",
    permissions: { "*": ["*"] },
  },
  {
    roleKey: "super_admin",
    roleName: "Super Admin",
    description: "Operational administration across the organization.",
    permissions: {
      organization: ["read", "update"],
      departments: ["*"],
      users: ["*"],
      roles: ["*"],
      clients: ["*"],
      projects: ["*"],
      timeline: ["*"],
      tasks: ["*"],
      deliverables: ["*"],
      approvals: ["*"],
      revisions: ["*"],
      files: ["*"],
      meetings: ["*"],
      comments: ["*"],
      notifications: ["*"],
      reports: ["*"],
      analytics: ["*"],
      share_links: ["*"],
      ai: ["*"],
      settings: ["read", "update"],
      attendance: ["*"],
      corrections: ["*"],
    },
  },
  {
    roleKey: "hr",
    roleName: "HR",
    description:
      "People operations: employee directory, attendance oversight, correction reviews, workforce reporting.",
    permissions: {
      organization: ["read"],
      departments: ["*"],
      users: ["read"],
      settings: ["read"],
      notifications: ["read", "update"],
      reports: ["read", "export"],
      attendance: ["clock", "read", "view_team"],
      corrections: ["create", "read", "review"],
    },
  },
  {
    roleKey: "creative_director",
    roleName: "Creative Director",
    description: "Creative quality, reviews, approvals, production planning.",
    permissions: {
      organization: ["read"],
      departments: ["read"],
      users: ["read"],
      clients: ["read"],
      projects: ["read", "create", "update"],
      timeline: ["*"],
      tasks: ["*"],
      deliverables: ["*"],
      approvals: ["*"],
      revisions: ["*"],
      files: ["read", "upload", "download", "share"],
      meetings: ["*"],
      comments: ["*"],
      reports: ["read", "export"],
      analytics: ["read"],
      share_links: ["read", "create", "update"],
      ai: ["read", "create"],
      attendance: ["clock", "read", "view_team"],
      corrections: ["create", "read"],
    },
  },
  {
    roleKey: "project_manager",
    roleName: "Project Manager",
    description: "Execution: timelines, tasks, client communication.",
    permissions: {
      organization: ["read"],
      departments: ["read"],
      users: ["read"],
      clients: ["read", "create", "update"],
      projects: ["read", "create", "update", "archive"],
      timeline: ["*"],
      tasks: ["*"],
      deliverables: ["read", "create", "update", "upload"],
      approvals: ["read", "create", "review"],
      revisions: ["*"],
      files: ["read", "upload", "download", "share"],
      meetings: ["*"],
      comments: ["*"],
      reports: ["read", "create", "export"],
      analytics: ["read"],
      share_links: ["*"],
      ai: ["read", "create"],
      attendance: ["clock", "read", "view_team"],
      corrections: ["create", "read"],
    },
  },
  {
    roleKey: "team_member",
    roleName: "Team Member",
    description:
      "Baseline creative role (AI Artist, Designer, Editor, Prompt Engineer).",
    permissions: {
      organization: ["read"],
      departments: ["read"],
      users: ["read"],
      projects: ["read"],
      timeline: ["read"],
      tasks: ["read", "update", "comment"],
      deliverables: ["read", "create", "update", "upload"],
      revisions: ["read", "update"],
      files: ["read", "upload", "download"],
      meetings: ["read", "comment"],
      comments: ["*"],
      ai: ["read", "create"],
      attendance: ["clock", "read"],
      corrections: ["create", "read"],
    },
  },
  {
    roleKey: "finance",
    roleName: "Finance",
    description: "Invoices, payments, financial reporting.",
    permissions: {
      organization: ["read"],
      users: ["read"],
      clients: ["read"],
      projects: ["read"],
      reports: ["read", "create", "export"],
      analytics: ["read"],
      attendance: ["clock", "read"],
      corrections: ["create", "read"],
    },
  },
];
