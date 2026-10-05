# AI NEX OS — Phase 4A: Design System Inventory

**Product:** AI NEX OS — The Operating System for Creative Execution  
**Phase:** 4A — Product Foundation & UX Audit  
**Status:** COMPLETE / CANONICAL AUDIT BASELINE  
**Architecture:** Next.js 16.3.8 · React 19.2.4 · Tailwind CSS v4 · OKLCH Semantic Color Spaces · `@base-ui-components/react` Primitives

---

## 1. Executive Summary & Design System Foundations

The AI NEX OS design system is constructed on a modern stack leveraging **Tailwind CSS v4 inline themes**, standard **Base UI (`@base-ui-components/react`) accessible primitives**, and high-gamut **OKLCH perceptual color tokens**.

The UI reflects a sleek, restrained, dark-mode-first aesthetic tailored for professional creative agencies, production studios, and brand consultancies. However, the audit reveals inconsistent adoption across routes, duplicated table implementations, missing form validation primitives, and missing interactive states (loading skeletons, dirty-state confirmation, and mobile card fallbacks).

---

## 2. Design Tokens & Foundations Inventory

### 2.1 Typography & Font Scale

- **Primary Typeface:** `Geist Sans` (`--font-geist-sans`) — Modern neo-grotesque sans-serif optimized for legibility in dense data tables and interfaces.
- **Monospace Typeface:** `Geist Mono` (`--font-geist-mono`) — Used for IDs, timestamps, commit hashes, milestone numbers, and punch-clock counters.
- **Heading Font:** Standardized to `Geist Sans` (`--font-heading: var(--font-geist-sans)`).
- **Type Hierarchy:**
  | Token / Class | Size            | Line Height    | Weight                        | Typical Usage                                      |
  | ------------- | --------------- | -------------- | ----------------------------- | -------------------------------------------------- |
  | `text-xs`     | 0.75rem (12px)  | 1rem (16px)    | Regular (400) / Medium (500)  | Badges, table metadata, micro-labels               |
  | `text-sm`     | 0.875rem (14px) | 1.25rem (20px) | Regular (400) / Medium (500)  | Primary body text, input labels, table cells       |
  | `text-base`   | 1rem (16px)     | 1.5rem (24px)  | Regular (400) / Medium (500)  | Card body, dialog descriptions, empty states       |
  | `text-lg`     | 1.125rem (18px) | 1.75rem (28px) | Medium (500) / Semibold (600) | Card titles, section headers                       |
  | `text-xl`     | 1.25rem (20px)  | 1.75rem (28px) | Semibold (600)                | Modal dialog headings, drawer headers              |
  | `text-2xl`    | 1.5rem (24px)   | 2rem (32px)    | Bold (700)                    | Page titles (`Dashboard`, `Projects`, `Workforce`) |
  | `text-3xl`    | 1.875rem (30px) | 2.25rem (36px) | Bold (700)                    | KPI metric numerals                                |

### 2.2 Color Spaces & Semantic Palette (OKLCH)

Defined centrally in `src/app/globals.css`. Components reference semantic tokens; raw hex or rgb literals are prohibited.

#### Surface & Neutral Scales

| Token                | Light Theme Value  | Dark Theme Value     | Usage                                |
| -------------------- | ------------------ | -------------------- | ------------------------------------ |
| `--background`       | `oklch(1 0 0)`     | `oklch(0.145 0 0)`   | Root application background          |
| `--foreground`       | `oklch(0.145 0 0)` | `oklch(0.985 0 0)`   | Primary text                         |
| `--card`             | `oklch(1 0 0)`     | `oklch(0.205 0 0)`   | Card containers, list items          |
| `--popover`          | `oklch(1 0 0)`     | `oklch(0.205 0 0)`   | Dropdown menus, tooltips, dialogs    |
| `--muted`            | `oklch(0.97 0 0)`  | `oklch(0.269 0 0)`   | Secondary surfaces, hover states     |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)`   | Subtitles, helper text, placeholders |
| `--border`           | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Component borders, separators        |
| `--input`            | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | Form input borders                   |
| `--ring`             | `oklch(0.708 0 0)` | `oklch(0.556 0 0)`   | Focus indicators, active outlines    |

#### Functional & Semantic Status Tokens

| Semantic Role   | CSS Token       | OKLCH Coordinates                                               | Purpose / Entity Mapping                               |
| --------------- | --------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| **Success**     | `--success`     | `oklch(0.648 0.15 155)` / Dark: `oklch(0.696 0.14 155)`         | `Active`, `Approved`, `Completed`, `On Track`          |
| **Warning**     | `--warning`     | `oklch(0.795 0.155 85)` / Dark: `oklch(0.828 0.145 85)`         | `In Review`, `At Risk`, `Pending`, `Changes Requested` |
| **Info**        | `--info`        | `oklch(0.623 0.17 250)` / Dark: `oklch(0.685 0.155 250)`        | `Draft`, `Planning`, Informational badges              |
| **Destructive** | `--destructive` | `oklch(0.577 0.245 27.325)` / Dark: `oklch(0.704 0.191 22.216)` | `Rejected`, `Blocked`, `Deactivated`, Delete actions   |

#### Priority Scale (PRD Module 06)

- `--priority-critical`: `oklch(0.577 0.245 27.3)` (Ruby Red)
- `--priority-high`: `oklch(0.705 0.19 48)` (Vibrant Amber)
- `--priority-medium`: `oklch(0.795 0.155 85)` (Warm Ochre)
- `--priority-low`: `oklch(0.623 0.17 250)` (Slate Blue)

#### Project Health Indicators

- `--health-on-track`: `oklch(0.648 0.15 155)` (Emerald)
- `--health-at-risk`: `oklch(0.795 0.155 85)` (Amber)
- `--health-delayed`: `oklch(0.705 0.19 48)` (Orange-Red)
- `--health-blocked`: `oklch(0.577 0.245 27.3)` (Crimson)

### 2.3 Radii & Elevation Scales

- **Base Radius:** `--radius: 0.625rem` (10px)
- **Derived Radii:**
  - `--radius-sm`: `calc(var(--radius) * 0.6)` (~6px) — Badges, small pills, tags
  - `--radius-md`: `calc(var(--radius) * 0.8)` (~8px) — Buttons, form inputs, tooltips
  - `--radius-lg`: `var(--radius)` (10px) — Cards, dropdown menus, table headers
  - `--radius-xl`: `calc(var(--radius) * 1.4)` (14px) — Modal dialogs, floating action sheets
  - `--radius-2xl`: `calc(var(--radius) * 1.8)` (18px) — Command palette, hero containers
- **Elevation & Shadows:**
  - Standard dark-mode elevation relies on border luminance (`border-border` = `oklch(1 0 0 / 10%)`) and layered surface lightness rather than blurry skeuomorphic drop-shadows.

---

## 3. UI Primitives Inventory (`src/components/ui/`)

| Primitive        | Source File         | Underlying Foundation        | Variants / Sizes                                                                                        | Missing States                                    | Standardization Target       |
| ---------------- | ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------- |
| **Avatar**       | `avatar.tsx`        | Base UI / Image fallback     | Sizes: `sm` (24px), `default` (32px), `lg` (40px)                                                       | Loading shimmer placeholder, broken image retry   | Standardized                 |
| **Badge**        | `badge.tsx`         | Native span + cva            | `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `info`                          | Interactive hover/click variant                   | Standardized                 |
| **Breadcrumb**   | `breadcrumb.tsx`    | Native nav + list            | Hierarchical link list with chevron separator                                                           | Dynamic route hydration, auto-truncation          | Underutilized in deep routes |
| **Button**       | `button.tsx`        | Native button + cva          | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; Sizes: `default`, `sm`, `lg`, `icon` | Built-in loading spinner (`isLoading` prop)       | Partially standardized       |
| **Card**         | `card.tsx`          | Compound div structure       | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                       | Clickable interactive hover state (`isPressable`) | Standardized                 |
| **Dialog**       | `dialog.tsx`        | Base UI Dialog               | Modal overlay, close button, title, description                                                         | Unsaved changes dirty guard, nested dialog focus  | Standardized primitive       |
| **DropdownMenu** | `dropdown-menu.tsx` | Base UI Menu                 | Trigger, Content, Item, CheckboxItem, RadioItem, Submenu                                                | Keyboard shortcut badges (`⌘K`, `⇧D`)             | Standardized                 |
| **Field**        | `field.tsx`         | Base UI Field                | Field, Control, Label, Description, Error                                                               | Dynamic Zod schema error binding                  | Underutilized                |
| **Input**        | `input.tsx`         | Native input                 | Standard text input, search input                                                                       | Leading/trailing icon slot wrapper                | Needs compound icon wrapper  |
| **Label**        | `label.tsx`         | Base UI Label                | Form field label                                                                                        | Required asterisk indicator (`isRequired`)        | Standardized                 |
| **Popover**      | `popover.tsx`       | Base UI Popover              | Anchor, Content, Arrow                                                                                  | Keyboard focus lock on mobile                     | Standardized                 |
| **Separator**    | `separator.tsx`     | Base UI Separator            | Horizontal, Vertical                                                                                    | None                                              | Standardized                 |
| **Sheet**        | `sheet.tsx`         | Base UI Dialog (Drawer)      | Sides: `top`, `bottom`, `left`, `right`                                                                 | Gestural swipe-to-close on mobile                 | Standardized                 |
| **Sidebar**      | `sidebar.tsx`       | shadcn/ui compound           | Collapsible, mobile drawer, sub-grouping                                                                | Dynamic collapsed tooltip preview                 | Standardized                 |
| **Skeleton**     | `skeleton.tsx`      | Pulse animation div          | Generic skeleton block                                                                                  | Entity-specific skeletons (Table, Card, Detail)   | Needs preset recipes         |
| **Sonner**       | `sonner.tsx`        | Sonner toast toaster         | `success`, `error`, `info`, `warning`, `loading`                                                        | Persistent offline queue                          | Standardized                 |
| **Table**        | `table.tsx`         | Native HTML table primitives | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`                                            | Mobile card-view fallback                         | Lacks responsive wrapper     |
| **Tooltip**      | `tooltip.tsx`       | Base UI Tooltip              | Trigger, Content, Arrow                                                                                 | Touch-device long-press fallback                  | Standardized                 |

---

## 4. Shared Composite Components (`src/components/shared/`)

### 4.1 ConfirmDialog (`src/components/shared/confirm-dialog.tsx`)

- **Usage:** Destructive action confirmation (Deleting projects, removing members, deactivating clients).
- **Consistency:** High consistency. Uses red destructive button for `variant="destructive"`.
- **Missing States:** In-flight processing state with disabled cancel button during async deletion.
- **Standardization Target:** Expose imperative promise-based hook (`useConfirm()`).

### 4.2 DataTable (`src/components/shared/data-table.tsx`)

- **Usage:** Universal data grid with pagination and sorting.
- **Consistency:** Moderate. Some pages (e.g. `/attendance/history`) use custom tables instead of `DataTable`.
- **Missing States:** Column visibility toggle, responsive card stacking for mobile, bulk row selection.
- **Standardization Target:** Make `DataTable` the mandatory container for all tabular data across AI NEX OS.

### 4.3 EmptyState (`src/components/shared/empty-state.tsx`)

- **Usage:** Rendered when lists, tables, or queries return zero items.
- **Consistency:** Low. Rendered inconsistently; some pages render plain text strings (`"No files found"`).
- **Missing States:** Action button slot (`primaryAction`), secondary help link, illustration icon.
- **Standardization Target:** Refactor `EmptyState` into a required composite with `icon`, `title`, `description`, and `action` props.

### 4.4 StatusBadge (`src/components/shared/status-badge.tsx`)

- **Usage:** Standardized status visualizer across Projects, Tasks, Deliverables, and Attendance.
- **Consistency:** High. Accurately maps statuses (`active`, `completed`, `draft`, `in_review`) to OKLCH semantic tokens.
- **Missing States:** Hover tooltip with status definition or transition timestamp.
- **Standardization Target:** Add optional icon dot pulse indicator for live/in-progress states.

---

## 5. Architectural Gap Analysis & Standardization Directives

### 5.1 Pattern Duplication

1. **Status Filtering Selectors:** Multiple pages implement their own custom `<Select>` or dropdown filter for status. This should be standardized into a unified `<FilterBar>` composite component.
2. **Search Input Headers:** Entity search inputs on `/projects`, `/clients`, and `/files` reimplement debounced search with separate state logic.

### 5.2 Missing Component Primitives

1. **Command Palette (`CommandPalette`):** Required for the global `⌘K` search experience.
2. **Segmented Control / Tabs (`Tabs`):** Essential for tabbed views inside Project Workspaces (`/projects/[id]`), Client CRM (`/clients/[id]`), and Attendance (`/attendance`).
3. **Timeline / Gantt Canvas (`TimelineGantt`):** Required for interactive scheduling in Phase 4E.
4. **File Uploader Dropzone (`FileDropzone`):** Drag-and-drop file upload target with multi-file progress indicators.
5. **Asset Preview Modal (`AssetViewer`):** Full-screen lightbox for images, video streaming, and PDF review with zoom/pan controls.

### 5.3 Form Ergonomics & Feedback Standard

- **Field-level validation:** Mandatory use of `src/components/ui/field.tsx` with React Hook Form + Zod.
- **Toast Notifications:** Transient success notifications (`"Client saved"`, `"Task reassigned"`) must exclusively use `sonner`.
- **Error Banners:** Form submission failures must display an inline `Alert` within the modal context rather than relying on toasts that may be obscured.

---

## 6. Implementation Guardrail

No design system components or tokens were modified during Phase 4A.
This inventory serves as the authoritative blueprint for component standardization starting in **Phase 4B** (Core Workspace & Navigation) and continuing through **Phase 4I** (Accessibility & Polish).
