# AI NEX OS — Phase 4B: Navigation Architecture & Wayfinding Specification
**Product:** AI NEX OS — The Operating System for Creative Execution  
**Phase:** 4B — Core Workspace + Global Navigation  
**Status:** COMPLETE / CANONICAL SPECIFICATION  
**Scope:** Canonical Navigation Tree, Active Route Rules, Workforce Consolidation, and Breadcrumb Landmarks  

---

## 1. Executive Summary

Phase 4B transforms the navigational architecture of AI NEX OS from a flat, vertically cluttered list of 16 top-level items into a balanced, hierarchical information structure organized around five core operational areas:
1. **Workspace:** Primary day-to-day creative execution surfaces.
2. **Production:** Creative asset management, deliverables, and meetings.
3. **Workforce:** Consolidated personal time-tracking and managerial people operations.
4. **Intelligence:** Assistive analytics and AI capabilities.
5. **Organization:** Administrative settings and workspace governance.

The most prominent architectural change is the consolidation of the **Workforce** section from 7 bloated sidebar slots (>40% of the menu) down to **2 primary surfaces** (`My Time` and `Team & People`), while preserving 100% of existing routes and permissions through Base UI sub-navigation.

---

## 2. Navigation Architecture Evolution

### 2.1 Previous Navigation Tree (Phase 4A Baseline)
```text
AI NEX OS (16 Top-Level Items — Unbalanced Workforce Dominance)
├── Workspace
│   ├── Dashboard (/dashboard)
│   ├── Projects (/projects)
│   ├── Clients (/clients)
│   ├── Tasks (/tasks)
│   ├── Timeline (/timeline)
│   └── Calendar (/calendar)
├── Production
│   ├── Deliverables (/deliverables)
│   ├── Files (/files)
│   └── Meetings (/meetings)
├── Workforce [7 Slots — Distorting Product Identity]
│   ├── My Attendance (/workforce/attendance)
│   ├── History (/workforce/history)
│   ├── Corrections (/workforce/corrections)
│   ├── Review Queue (/workforce/corrections/review)
│   ├── Team Attendance (/workforce/team)
│   ├── Employees (/workforce/employees)
│   └── Reports (/workforce/reports) [Coming Soon]
├── Intelligence
│   ├── AI Workspace (/ai) [Coming Soon]
│   └── Analytics (/analytics) [Coming Soon]
└── Organization
    └── Settings (/settings)
```

### 2.2 New Navigation Tree (Phase 4B Canonical Implementation)
```text
AI NEX OS (11 Top-Level Items — Balanced & Hierarchical)
├── Workspace
│   ├── Dashboard (/dashboard)
│   ├── Projects (/projects)
│   ├── Clients (/clients)
│   ├── Tasks (/tasks)
│   ├── Timeline (/timeline)
│   └── Calendar (/calendar)
├── Production
│   ├── Deliverables (/deliverables)
│   ├── Files (/files)
│   └── Meetings (/meetings)
├── Workforce [2 Primary Slots — Consolidated & Role-Aware]
│   ├── My Time (/workforce/attendance) [Personal Hub]
│   │   ├── Punch Clock (/workforce/attendance)
│   │   ├── History (/workforce/history)
│   │   └── Corrections (/workforce/corrections)
│   └── Team & People (/workforce/team) [Managerial Hub]
│       ├── Team Attendance (/workforce/team)
│       ├── Employees (/workforce/employees)
│       ├── Review Queue (/workforce/corrections/review)
│       └── Reports (/workforce/reports) [Coming Soon]
├── Intelligence
│   ├── AI Workspace (/ai) [Coming Soon]
│   └── Analytics (/analytics) [Coming Soon]
└── Organization
    └── Settings (/settings)
```

---

## 3. Workforce Consolidation Mechanics

### 3.1 Personal Hub: "My Time"
- **Primary Route:** `/workforce/attendance`
- **Icon:** `Clock`
- **Role Target:** Individual Contributors, Creatives, Staff Members
- **Permission Floor:** `["attendance", "clock"]`
- **Contextual Sub-Navigation:**
  - `Punch Clock` (`/workforce/attendance` · `["attendance", "clock"]`): Daily clock-in/out, live shift timer, break logging.
  - `History` (`/workforce/history` · `["attendance", "read"]`): Personal timesheet ledger and attendance record.
  - `Corrections` (`/workforce/corrections` · `["corrections", "create"]`): Request missed punch adjustments.

### 3.2 Managerial Hub: "Team & People"
- **Primary Route:** `/workforce/team`
- **Icon:** `Users`
- **Role Target:** Team Leads, Creative Directors, HR Administrators, Owners
- **Permission Floor:** `["attendance", "view_team"]` or `["users", "read"]`
- **Contextual Sub-Navigation:**
  - `Team Attendance` (`/workforce/team` · `["attendance", "view_team"]`): Live organization attendance board, active shifts, who is working.
  - `Employees` (`/workforce/employees` · `["users", "read"]`): Agency staff directory, roles, and profiles.
  - `Review Queue` (`/workforce/corrections/review` · `["corrections", "review"]`): Managerial approvals for attendance correction requests.
  - `Reports` (`/workforce/reports` · `["reports", "read"]`): Payroll export and workforce analytics (Coming Soon).

---

## 4. Active Route & Hierarchy Rules

To prevent false-positive active states while ensuring proper parent highlighting, `src/components/layout/app-sidebar.tsx` enforces the following rules:

1. **Exact & Prefix Matching:**
   - A top-level item without children is active if:
     `pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))`
   - Special rule for `/dashboard`: Exact match only (`pathname === "/dashboard"`) to avoid false-positive activation on unrelated sub-routes.
2. **Child-Aware Parent Activation:**
   - A parent item containing `children` is active if:
     `pathname === item.href || item.children.some(child => pathname === child.href || pathname.startsWith(child.href + "/"))`
   - *Example:* When the user navigates to `/workforce/history`, the `My Time` parent item is active, and the `History` child sub-button receives `aria-current="page"`.
   - *Example:* When viewing an employee profile at `/workforce/employees/usr_123`, `Team & People` remains highlighted as the parent container.
3. **Sub-Menu Rendering:**
   - The `<SidebarMenuSub>` container renders under a parent item if `hasPermittedChildren && isItemActive`.
   - When the user leaves Workforce and visits `/projects`, the Workforce sub-menu collapses automatically, keeping the sidebar sleek and compact.

---

## 5. Contextual Breadcrumbs Architecture

Phase 4B introduces accessible, standardized breadcrumb landmarks across dynamic record routes.

### 5.1 Component Foundation
Uses `@base-ui/react` primitives styled with Tailwind CSS v4 in `src/components/ui/breadcrumb.tsx`:
- `<Breadcrumb aria-label="breadcrumb">`
- `<BreadcrumbList>`
- `<BreadcrumbItem>`
- `<BreadcrumbLink>`
- `<BreadcrumbSeparator role="presentation">`
- `<BreadcrumbPage aria-current="page">`

### 5.2 Dynamic Routes Implemented
| Route | Breadcrumb Hierarchy | Navigation Action | Truncation Behavior |
|---|---|---|---|
| `/projects/[projectId]` | `Projects / {project.projectName}` | Click `Projects` returns to `/projects` | Truncates at max-w-[200px] mobile, max-w-[400px] desktop |
| `/clients/[clientId]` | `Clients / {client.companyName}` | Click `Clients` returns to `/clients` | Truncates at max-w-[200px] mobile, max-w-[400px] desktop |
| `/workforce/employees/[userId]` | `Employees / {fullName}` | Click `Employees` returns to `/workforce/employees` | Truncates at max-w-[200px] mobile, max-w-[400px] desktop |

---

## 6. Responsive & Collapsible Behavior

1. **Desktop Viewports (≥ 1024px):**
   - Full-width sidebar (16rem / 256px) displaying all 5 sections.
   - Active sub-menus rendered with clean vertical guide-lines (`border-l`).
2. **Tablet Viewports (768px – 1023px):**
   - Sidebar supports `collapsible="icon"` mode: collapses down to 3rem / 48px showing icons only.
   - Tooltips display entity titles on hover. Sub-menus collapse cleanly via `group-data-[collapsible=icon]:hidden`.
3. **Mobile Viewports (< 768px):**
   - Sidebar renders as an off-canvas drawer triggered by `<SidebarTrigger />`.
   - Backdrop tap or route change automatically dismisses the drawer.
   - Breadcrumbs fit comfortably above page titles with single-line truncation.
