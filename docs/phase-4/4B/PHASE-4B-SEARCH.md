# AI NEX OS — Phase 4B: Global Search & Command Palette Specification

**Product:** AI NEX OS — The Operating System for Creative Execution  
**Phase:** 4B — Core Workspace + Global Navigation  
**Status:** COMPLETE / CANONICAL SPECIFICATION  
**Component:** `src/features/search/components/global-search.tsx`  
**Server Action:** `src/features/search/actions.ts::globalSearch`

---

## 1. Executive Summary

Phase 4B replaces the previous decorative, desktop-only header input with an accessible, high-performance **Command Palette** (`⌘K` / `Ctrl+K`).

The search engine operates with strict multi-tenant scoping (`session.organizationId`), permission-tolerant fan-out queries, bounded result quotas, and integrated memory-first rate limiting, ensuring that search queries can never leak cross-tenant records or degrade server performance.

---

## 2. Command Palette UX & Interaction Lifecycle

### 2.1 Triggers

1. **Global Keyboard Listener:** Pressing `⌘K` (on macOS) or `Ctrl+K` (on Windows/Linux) triggers the Command Palette modal from anywhere in the authenticated application.
2. **Desktop Header Trigger:** A button styled as an active search input rendered in `AppHeader` featuring a search icon, placeholder text, and a `⌘K` keyboard badge.
3. **Mobile Header Trigger:** A dedicated `Search` icon button (`size="icon"`) displayed on viewports < 768px (`md:hidden`).

### 2.2 Dialog Overlay Architecture

- Built on Base UI `@base-ui/react/dialog` with `DialogContent` styled as a floating command sheet (`max-w-xl top-[20%] border shadow-2xl rounded-xl`).
- Features a semi-transparent backdrop blur overlay (`bg-black/10 backdrop-blur-xs`).
- Input receives automatic focus within 50ms of modal mount.
- Dismissible via `Escape` key, backdrop click, or result selection.

### 2.3 Keyboard Navigation Matrix

| Key Combination | Action / State Transition                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| `⌘K` / `Ctrl+K` | Toggle open / closed state of Command Palette                                |
| `Escape`        | Close Command Palette and restore focus to trigger                           |
| `ArrowDown`     | Move active selection down through the flattened results list (wraps around) |
| `ArrowUp`       | Move active selection up through the flattened results list (wraps around)   |
| `Enter`         | Navigate to highlighted result (`router.push(hit.href)`) and close palette   |
| Typing (`char`) | Update search term; triggers debounced query                                 |

---

## 3. Supported Entity Types & Grouping

The Command Palette queries and categorizes hits across six core entity types:

| Entity Group   | Label            | Underlying Server Read                                   | Entity Icon    | Destination Route               |
| -------------- | ---------------- | -------------------------------------------------------- | -------------- | ------------------------------- |
| `projects`     | **Projects**     | `getProjects(query, 5, 0)`                               | `FolderKanban` | `/projects/[projectId]`         |
| `clients`      | **Clients**      | `getClients(query)`                                      | `Building2`    | `/clients/[clientId]`           |
| `deliverables` | **Deliverables** | `searchDeliverables(query, 0, 5)`                        | `FileText`     | `/deliverables?search=[title]`  |
| `people`       | **People**       | `listEmployeesAction({ search, page: 1, pageSize: 10 })` | `Users`        | `/workforce/employees/[userId]` |
| `tasks`        | **Tasks**        | `searchTasks(query, 0, 5)`                               | `CheckSquare`  | `/tasks`                        |
| `files`        | **Files**        | `searchFiles(query, 0, 5)`                               | `Files`        | `/files`                        |

Each hit displays:

- **Title:** Primary entity name (e.g. "Brand Refresh", "Nike Inc.", "Hero Video V1")
- **Subtitle:** Distinctive metadata (e.g. project code `PRJ-2026-0042`, industry, designation, status)
- **Visual Icon:** Color-coded categorical icon

---

## 4. Query Flow & Performance Engineering

```
[User Input]
     │ (Debounced 250ms, Min length: 2 chars)
     ▼
[globalSearch(term)] (Server Action)
     │
     ├── 1. resolveGuardContext() -> Extracts session.userId & session.organizationId
     ├── 2. consumeRateLimit(RATE_LIMITS.searchExpensive, identifier)
     │      └── Enforces rate limit quota (MemoryStore-first)
     │
     └── 3. Parallel Fan-Out with tolerate() Wrapper:
            ├── getProjects(query)           [tenant_id = session.orgId]
            ├── getClients(query)            [tenant_id = session.orgId]
            ├── listEmployeesAction(query)   [tenant_id = session.orgId]
            ├── searchDeliverables(query)    [tenant_id = session.orgId]
            ├── searchFiles(query)           [tenant_id = session.orgId]
            └── searchTasks(query)           [tenant_id = session.orgId]
     │
     ▼
[Normalized SearchGroups JSON Response] (Max 5 hits per group)
```

### 4.1 Resource Bounds & Guardrails

- **Min Query Length:** 2 characters (queries < 2 chars return quick navigation links immediately without issuing server actions).
- **Max Query Length:** 64 characters (enforced in `actions.ts`).
- **Debounce Interval:** 250ms client-side delay to prevent keystroke flooding.
- **Result Quota:** Maximum 5 hits per entity group (`PER_GROUP = 5`), capping the maximum response payload to 30 items.
- **Rate Limiting:** Guarded by `RATE_LIMITS.searchExpensive` consuming user-and-org keyed tokens. Returns HTTP 429 (`ApiError`) with `retryAfterSeconds` if exceeded.

---

## 5. Security & Tenant Isolation Verification

1. **No Caller-Supplied Tenant IDs:** The server action `globalSearch(term)` takes only a single string parameter (`term`). Tenant context is derived server-side from the authenticated session in `resolveGuardContext()` and is not accepted as an untrusted caller-supplied organization identifier.
2. **Permission-Tolerant Fan-Out:** Individual reads are executed inside `tolerate(promise, fallback)` blocks. If a user has `deliverables.read` but lacks `clients.read`, the `getClients` query throws `PermissionDeniedError`, which `tolerate` catches, returning an empty client group `[]`. The user receives valid deliverable results without an error, and without privilege escalation.
3. **Cross-Tenant Guarantee:** Every underlying query enforces `eq(table.organizationId, session.organizationId)` in PostgreSQL. Organization A users can never receive records from Organization B.

---

## 6. Interaction States

1. **Idle State (`term.length < 2`):**
   - Displays a "Quick Navigation" section with immediate keyboard access to the primary hubs: Projects, Clients, Deliverables, Tasks, and Files.
2. **Searching State:**
   - Displays an animated `Loader2` spinner alongside the search input.
3. **Results State:**
   - Grouped list of hits with keyboard active indicators. Hovering with mouse or using arrow keys updates selection.
4. **Empty State:**
   - Renders a clean message: `No matching results found for "{term}".`
5. **Error State:**
   - Displays an inline `AlertCircle` banner with the error message (e.g. rate-limit countdown) without dismissing the palette or breaking page context.
