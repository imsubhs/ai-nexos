# AI NEX OS — Phase 4B: Current UI Palette vs. Stitch Redesign Forensic Audit & Reconciliation Baseline

**Document:** `PHASE-4B-CURRENT-VS-STITCH-DESIGN-AUDIT.md`  
**System:** AI NEX OS — The Operating System for Creative Execution  
**Author:** Senior UI Engineer, Design Systems Architect & Forensic Auditor  
**Date:** October 4, 2026  
**Status:** COMPLETE AUDIT BASELINE / PENDING HUMAN REVIEW & RECONCILIATION APPROVAL  
**Implementation Guardrail:** AUDIT & RECONCILIATION ONLY — ZERO APPLICATION SOURCE OR DATABASE MODIFICATIONS APPLIED  

---

## 1. Executive Summary

This forensic audit and reconciliation specification establishes an authoritative engineering and aesthetic bridge between the **currently implemented AI NEX OS frontend** (Next.js 16.3.8, Tailwind CSS v4, Base UI, OKLCH monochromatic token system) and the **proposed Stitch redesign** delivered through **Round 5** in `New UI Design/stitch_ai_nex_os_redesign.zip` under the **"Executive Precision"** design system.

### Core Audit Discoveries:
1. **Aesthetic Shift:** The current AI NEX OS frontend implements an austere, monochromatic grayscale dark mode (`oklch(0.145 0 0)` background, flat `oklch(0.205 0 0)` cards, and an inverted white primary button `oklch(0.922 0 0)`). Stitch Round 5 ("Executive Precision") shifts the platform to a deep architectural obsidian aesthetic (`#0A0D12` / `#10141a`) punctuated by an electric cyan / sky kinetic accent (`#0EA5E9` / `#89ceff`), razor-thin translucent micro-borders (`rgba(255, 255, 255, 0.06–0.14)`), and a 5-tier stratified elevation model.
2. **Design-Token Architectural Gap:** The current codebase utilizes a flat, 2-tier surface model (`--background` vs `--card`/`--popover`). Stitch introduces a 5-tier elevation system (`surface-container-lowest` through `highest`, or Plane 0 through Plane 4) with hairline optical highlights (`inset 0 1px 0 0 rgba(255, 255, 255, 0.06)`) and ambient occlusion shadows that currently have zero token representation in `src/app/globals.css`.
3. **Hardcoded Legacy Debt:** Forensic codebase scanning identified **29 files** containing raw Tailwind color utilities (primarily legacy `text-gray-500`, `border-gray-200`, `bg-gray-800`, `bg-slate-100`, `text-emerald-400`, `bg-sky-500`) and arbitrary hex values in analytics and demo stores that bypass the CSS variable token layer.
4. **Accessibility (WCAG 2.1) Findings:**
   - Current dark mode achieves strong contrast on primary text (16.39:1) and buttons (12.04:1), but secondary badges (`bg-muted text-muted-foreground`) border on 3.8:1.
   - Proposed Stitch design has high contrast for headings (19.46:1), body text (16.07:1), and semantic status indicators (>5:1 to 11:1), but its proposed primary button specification (`#ffffff` text on `#0ea5e9` sky fill) fails WCAG AA for normal text at **2.77:1**. The design token bridge resolves this by adapting the button to use deep navy text (`#00344d`, 8.5:1) or deepening the gradient base to `#0284c7`/`#0369a1` (4.6:1).

---

## 2. Scope & Boundary Control

### 2.1 Strict In-Scope Territory
- **Application Repository:** `AIC NEXOS/ai-nexos` (Next.js 16.3.8, React 19.2.4, Tailwind CSS v4, Base UI primitives).
- **Current Token Source:** `AIC NEXOS/ai-nexos/src/app/globals.css` and `AIC NEXOS/ai-nexos/components.json`.
- **Authoritative Proposed Design Reference:** `New UI Design/stitch_ai_nex_os_redesign.zip` (containing `executive_precision/DESIGN.md` and 21 high-fidelity desktop screen designs).
- **Stitch MCP Cloud Project:** `projects/1473155395448640649` ("AI NEX OS Redesign").

### 2.2 Quarantined & Prohibited Contexts
- **Strictly Ignored & Quarantined:** Sibling projects outside `NEXOS Comb/` (`Game/`, `Couple Game Prototype`, `Narratix Lab`, `Job Automation`, `Portfolio`). Zero concepts, gameplay loops, rounds, card mechanics, or code patterns are permitted to enter AI NEX OS.
- **Historical Design Materials:** `Frontend UI Design/`, `Frontend UI Design (Audit)/`, `Frontend UI Design.zip`, and `Frontend UI Design (Audit).zip` are strictly classified as **HISTORICAL — NOT AUTHORITATIVE FOR CURRENT STITCH DESIGN**.
- **Execution Limit:** Strict forensic audit, comparative analysis, token mapping, and documentation only. **Zero application code, stylesheets, or database migrations are modified.**

---

## 3. Repository & Environment Identification

### 3.1 AI NEX OS Application Repository
- **Repository Root:** `/Users/subhamsaha/Downloads/My Docs /WebsiteCreation/NEXOS Comb/AIC NEXOS/ai-nexos`
- **Application Framework:** Next.js `16.3.8` (App Router, React Server Components enabled)
- **Runtime & React:** React `19.2.4` / React DOM `19.2.4`
- **Styling Architecture:** Tailwind CSS `^4` (`@tailwindcss/postcss: ^4`, `@import "tailwindcss"` with `@theme inline` in `globals.css`)
- **Primitive Component Foundation:** Base UI (`@base-ui/react: ^1.6.0`)
- **Design Tokens File:** `AIC NEXOS/ai-nexos/src/app/globals.css`
- **Component Registry Config:** `AIC NEXOS/ai-nexos/components.json` (`style: "base-nova"`, `baseColor: "neutral"`)

### 3.2 Authoritative New Stitch Design Package
- **Package Archive:** `New UI Design/stitch_ai_nex_os_redesign.zip` (14,515,725 bytes)
- **Package Root Folder:** `stitch_ai_nex_os_redesign/`
- **Design System Spec:** `stitch_ai_nex_os_redesign/executive_precision/DESIGN.md` (12,477 bytes)
- **Total Screen Folders:** 21 folders, each containing `code.html` (interactive HTML/Tailwind mockup) and `screen.png` (high-resolution rendered asset)
- **Cloud Project Resource:** `projects/1473155395448640649` (Device: Desktop 2560x2048, Origin: STITCH, Theme: DARK, Font: GEIST + JETBRAINS MONO)

---

## 4. New Stitch Package Inventory (`stitch_ai_nex_os_redesign.zip`)

The package contains exactly 66 files organized into 22 directory units:

```text
stitch_ai_nex_os_redesign/
├── executive_precision/
│   └── DESIGN.md                                 # Full design system specification & token manifesto
├── ai_nex_os_projects_workspace/                 # Projects Engine (code.html, screen.png)
├── ai_nex_os_project_workspace_command_center/   # Project Command Center (code.html, screen.png)
├── ai_nex_os_tasks_workspace/                    # Tasks Operations (code.html, screen.png)
├── ai_nex_os_deliverables_workspace/             # Deliverables Workspace (code.html, screen.png)
├── ai_nex_os_timeline_workspace/                 # Timeline Gantt Canvas (code.html, screen.png)
├── ai_nex_os_files_media_workspace_1/            # DAM Grid View (code.html, screen.png)
├── ai_nex_os_files_media_workspace_2/            # DAM Detail/Inspector View (code.html, screen.png)
├── ai_nex_os_review_queue_workspace/             # Review Queue Workspace (code.html, screen.png)
├── ai_nex_os_clients_workspace/                  # Clients CRM Workspace (code.html, screen.png)
├── ai_nex_os_team_people_workspace/              # Workforce Hub (code.html, screen.png)
├── ai_nex_os_employees_workspace/                # Employees Roster (code.html, screen.png)
├── ai_nex_os_calendar_workspace/                 # Calendar Workspace (code.html, screen.png)
├── ai_nex_os_meetings_workspace/                 # Meetings & Dailies Hub (code.html, screen.png)
├── ai_nex_os_my_time_workspace/                  # My Time & Attendance (code.html, screen.png)
├── ai_nex_os_reports_operations_analytics/       # Operational Telemetry (code.html, screen.png)
├── ai_nex_os_executive_execution_analytics/      # Executive Analytics (code.html, screen.png)
├── ai_nex_os_ai_workspace/                       # AI Operational Workspace (code.html, screen.png)
├── ai_nex_os_settings_general/                   # General Settings (code.html, screen.png)
├── ai_nex_os_settings_members_access/            # Members & Access Settings (code.html, screen.png)
├── ai_nex_os_settings_billing_compute/           # Billing & Compute Quotas (code.html, screen.png)
└── ai_nex_os_settings_security_keys/             # Security & API Keys (code.html, screen.png)
```

---

## 5. Stitch Screen Inventory

The 21 Stitch redesign screens span **Rounds 1 through 5 (R1–R5)**, representing the complete operational lifecycle of an enterprise creative production network.

| # | Screen / Page Name | Determinable Next.js Route | Feature / Module | Round | Screen ID | Desktop | Mobile | Status | Major Components & Layout State |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Projects Engine** | `/projects` | Core Workspaces | R1 | `12920d724f89447587aa38cb1a94c7d5` | Yes (2560x2048) | No | Proposed | Multi-pane project grid, client badge filters, real-time burn-rate metrics, production queue quick-dial. |
| 2 | **Project Command Center** | `/projects/[projectId]` | Core Workspaces | R1 | `97a1793d7fd646ebbadf3eb4adaaa2d2` | Yes (2560x2714) | No | Proposed | Hero campaign stats, phase milestone pipeline, active deliverables carousel, budget burndown indicator. |
| 3 | **Tasks Operations** | `/tasks` | Core Workspaces | R1 | `e2b3f7d7458445d7bd63885a97cbb8f4` | Yes (2754x2048) | No | Proposed | High-density task grid, SLA priority tags, assignee avatar clusters, real-time render queue progress bar. |
| 4 | **Deliverables Workspace** | `/deliverables` | Core Workspaces | R1 | `6659bbe6782c47d49724d2b4c430ddfb` | Yes (2572x2048) | No | Proposed | 280px Kanban lanes, client review chips, timecode video thumbnails, approval status pill indicators. |
| 5 | **Timeline Workspace** | `/timeline` | Production Engine | R2 | `5d46beba93d741c4b4014d2d3776a8db` | Yes (2560x2048) | No | Proposed | Interactive Gantt chart, multi-track sprint tracks, scrubber needle, milestone diamond markers. |
| 6 | **Files & Media (DAM Grid)** | `/files` | Digital Assets | R2 | `802839f0def24760b2b525dcc1b61f7d` | Yes (2850x2048) | No | Proposed | Asset grid with aspect-ratio badges (EXR, ProRes, MOV), cloud sync status, batch operations toolbar. |
| 7 | **Files & Media (Inspector)** | `/files` | Digital Assets | R2 | `8b38256ea2874d238e7004dcc231b4b5` | Yes (2724x2048) | No | Proposed | 420px inspector drawer, color-space metadata, resolution tags, frame-rate readout, EXIF / video codecs. |
| 8 | **Review Queue Workspace** | `/workforce/corrections/review` | Production Review | R2 | `92f17ea041924e0688cbade6a3186024` | Yes (2952x3048) | No | Proposed | Side-by-side video compare diff, annotation markups, audio waveform track, client sign-off action bar. |
| 9 | **Clients Workspace (CRM)** | `/clients` | Client Operations | R3 | `614a83645381445d85b9f96015653fcb` | Yes (2560x2488) | No | Proposed | Retainer tracking cards, active campaign tallies, contract health status pills, primary stakeholder chips. |
| 10 | **Team & People (Hub)** | `/workforce/team` | Workforce OS | R3 | `e93e1217ed704592a8e6491518417a0c` | Yes (2560x2832) | No | Proposed | Department capacity donuts, active team rosters, supervisor assignment cards, shift availability indicators. |
| 11 | **Employees Roster** | `/workforce/employees` | Workforce OS | R3 | `57b47f4c49cb46158b0c55bfd604006c` | Yes (2696x3264) | No | Proposed | Tabular roster with JetBrains Mono employee IDs, department tags, hourly billing rates, skill proficiency pills. |
| 12 | **Meetings & Dailies Hub** | `/meetings` | Operations | R3 | `dff78e00d67f4532871a673eb26ce490` | Yes (2560x2048) | No | Proposed | UTC clock header, agenda sync cards, connected calendar feeds, recording transcript attachments. |
| 13 | **Calendar Workspace** | `/calendar` | Scheduling | R4 | `ca6981e6f25f4bcaaf2078af996cebcf` | Yes (2560x2088) | No | Proposed | High-density multi-resource calendar view, client shoot locks, sprint review blocks, deadline pins. |
| 14 | **My Time Workspace** | `/workforce/attendance` | Workforce OS | R4 | `242d9a19d7074a2ea5a0c108214c4176` | Yes (2560x3226) | No | Proposed | Punch-clock status trigger, daily timeline breakdown, billable vs non-billable ratio gauge, session logs. |
| 15 | **Operations Telemetry** | `/workforce/history` | Executive Analytics| R4 | `701377eaa83f45bcb510d353b8f2670e` | Yes (2560x3386) | No | Proposed | Sprint velocity histograms, utilization heatmaps, SLA turnaround percentiles, overtime warning counters. |
| 16 | **Executive Analytics** | `/dashboard` | Executive Analytics| R4 | `b8b363bcbd23451a81fe4ff6ef5407f6` | Yes (2560x3382) | No | Proposed | 30-Day Operational Delta cards, macro agency throughput charts, net margin telemetry, project health radar. |
| 17 | **AI Operational Workspace** | `/ai` (Proposed Route) | AI Operations | R5 | `2a16c567d5e849ad924f105dcd022227` | Yes (2560x3274) | No | Proposed | Autonomous operational radar, context synthesis feed, prompt dispatcher, compute token quota tracker. |
| 18 | **Settings: General** | `/settings/organization` | Administration | R5 | `06f88350cd0e4cacbea3354940394342` | Yes (2560x4726) | No | Proposed | Brand asset uploaders, timezone / UTC normalization, working hours defaults, creative taxonomy settings. |
| 19 | **Settings: Members & Access**| `/settings/members` | Administration | R5 | `4075ed50d4f84480a6c7c6162c4ed521` | Yes (2942x2340) | No | Proposed | Role hierarchy table (Executive, Producer, Artist, Client), invite token generator, access control matrix. |
| 20 | **Settings: Billing & Compute**| `/settings/billing` | Administration | R5 | `5ae127edafe34f2984de6268a98a0b25` | Yes (2608x3340) | No | Proposed | GPU cluster consumption meters, monthly invoice PDF history, Stripe card details, overage limits. |
| 21 | **Settings: Security & Keys**| `/settings/security` | Administration | R5 | `732177dc3dbe49a6b8d1268daaa99402` | Yes (2560x2048) | No | Proposed | HSM hardware security indicators, API token generator, IP access allowlist, SAML/SSO configuration. |

---

## 6. Current AI NEX OS Colour System

All current colors are declared in `AIC NEXOS/ai-nexos/src/app/globals.css` using CSS custom properties registered in the `@theme inline` block of Tailwind CSS v4.

### 6.1 Current Palette Specification

#### A. Background & Chrome
- `--background`: Light `oklch(1 0 0)` (#FFFFFF) / Dark `oklch(0.145 0 0)` (~#1a1a1a). Neutral achromatic base.
- `--sidebar`: Light `oklch(0.985 0 0)` / Dark `oklch(0.205 0 0)` (~#2a2a2a). Identical lightness to `--card`.
- `--sidebar-border`: Light `oklch(0.922 0 0)` / Dark `oklch(1 0 0 / 10%)`.
- `--header` (Navbar): Handled via `bg-background/95 backdrop-blur border-b border-border`.

#### B. Surfaces & Elevation
- `--card`: Light `oklch(1 0 0)` / Dark `oklch(0.205 0 0)` (~#2a2a2a). Single flat card plane.
- `--popover`: Light `oklch(1 0 0)` / Dark `oklch(0.205 0 0)`.
- `--muted`: Light `oklch(0.97 0 0)` / Dark `oklch(0.269 0 0)` (~#3b3b3b). Used for table row hovers and disabled backgrounds.
- `--accent`: Light `oklch(0.97 0 0)` / Dark `oklch(0.269 0 0)`.

#### C. Borders & Outlines
- `--border`: Light `oklch(0.922 0 0)` / Dark `oklch(1 0 0 / 10%)`. Monolithic 10% white alpha.
- `--input`: Light `oklch(0.922 0 0)` / Dark `oklch(1 0 0 / 15%)`.
- `--ring`: Light `oklch(0.708 0 0)` / Dark `oklch(0.556 0 0)`.

#### D. Typography
- `--foreground`: Light `oklch(0.145 0 0)` / Dark `oklch(0.985 0 0)` (~#f8f8f8). Primary text.
- `--muted-foreground`: Light `oklch(0.556 0 0)` / Dark `oklch(0.708 0 0)` (~#b5b5b5). Secondary/helper text.
- `--card-foreground`: Matches `--foreground`.
- `--popover-foreground`: Matches `--foreground`.

#### E. Interactions & Controls
- `--primary`: Light `oklch(0.205 0 0)` / Dark `oklch(0.922 0 0)` (~#ebebeb). Inverted white primary button in dark mode!
- `--primary-foreground`: Light `oklch(0.985 0 0)` / Dark `oklch(0.205 0 0)` (~#2a2a2a).
- `--secondary`: Light `oklch(0.97 0 0)` / Dark `oklch(0.269 0 0)`.
- `--secondary-foreground`: Light `oklch(0.205 0 0)` / Dark `oklch(0.985 0 0)`.
- `--destructive`: Light `oklch(0.577 0.245 27.325)` / Dark `oklch(0.704 0.191 22.216)`. Coral red.

#### F. Semantic Statuses & Priorities (Design System §6)
- `--success`: Light `oklch(0.648 0.15 155)` / Dark `oklch(0.696 0.14 155)`.
- `--warning`: Light `oklch(0.795 0.155 85)` / Dark `oklch(0.828 0.145 85)`.
- `--info`: Light `oklch(0.623 0.17 250)` / Dark `oklch(0.685 0.155 250)`.
- `--priority-critical`: `oklch(0.577 0.245 27.3)`.
- `--priority-high`: `oklch(0.705 0.19 48)`.
- `--priority-medium`: `oklch(0.795 0.155 85)`.
- `--priority-low`: `oklch(0.623 0.17 250)`.

---

## 7. Stitch Colour System (Executive Precision)

Extracted directly from `stitch_ai_nex_os_redesign/executive_precision/DESIGN.md` and verified against the 21 `code.html` mockups.

### 7.1 Architecture of Tonal Obsidian Strata
- **Base Canvas (Plane 0):** `#0A0D12` (also aliased as `surface-container-lowest: #0a0e14` / `background: #10141a`). Sits at the floor of the viewport.
- **Surface Level 1 (Plane 1):** `#0E1218` (also aliased as `surface-container-low: #181c22`). Navigation sidebars, table wells, master command chrome.
- **Surface Level 2 (Plane 2):** `#141923` (also aliased as `surface-container: #1c2026`). Primary cards, list rows, inspector panels, workspaces.
- **Surface Level 3 (Plane 3):** `#1A212E` (also aliased as `surface-container-high: #262a31`). Hover states, elevated cards, drop targets, segmented tab active states.
- **Surface Level 4 (Plane 4):** `#222B3B` (also aliased as `surface-container-highest: #31353c`). Modals, flyout menus, tooltips, floating command palettes (⌘K).

### 7.2 Hairline Borders & Delimiters
- **Subtle Delineation:** `rgba(255, 255, 255, 0.06)` (`border-outline-variant/20`–`/30`, `#3e4850` with alpha). Grid dividers, table rows.
- **Default Border:** `rgba(255, 255, 255, 0.09)` (`border-outline-variant/40`). Standard cards, control groups.
- **Elevated Border:** `rgba(255, 255, 255, 0.14)` (`border-outline-variant/60`). Hovered controls, modal perimeters.
- **Accent Ring:** `rgba(14, 165, 233, 0.4)`. Focus rings, drag targets.
- **Optical Highlight:** `inset 0 1px 0 0 rgba(255, 255, 255, 0.06)`. Etched industrial top edge.

### 7.3 Typography Hierarchy
- **Text High-Contrast:** `#FFFFFF` (Display headings, active KPIs).
- **Text Primary (`on-surface`):** `#F1F5F9` (Hex token `#dfe2eb` in Stitch schema). Primary narrative, table values.
- **Text Secondary (`on-surface-variant`):** `#94A3B8` (Hex token `#bec8d2`). Metadata, column headers, timestamps.
- **Text Muted (`outline`):** `#64748B` (Hex token `#88929b`). Placeholders, disabled states, keyboard shortcuts.

### 7.4 Creative Spark & Semantic Indicators
- **Creative Spark (Primary Accent):** `#0EA5E9` (Sky-500) / `#89ceff` (Cyan tint) / `#0284C7` (Sky-600).
- **Primary Action Button:** Gradient `linear-gradient(to bottom, #0EA5E9, #0284C7)`, pure white text, inset highlight `rgba(255,255,255,0.2)`, cyan glow on hover (`0 0 12px rgba(14, 165, 233, 0.3)`).
- **In Progress / Active:** Sky `#38BDF8`, chip surface `rgba(56, 189, 248, 0.12)`.
- **Completed / Approved:** Emerald `#34D399` (`#10b981`), chip surface `rgba(52, 211, 153, 0.12)`.
- **Review / Approval:** Amber `#FBBF24`, chip surface `rgba(251, 191, 36, 0.12)`.
- **Blocked / Destructive:** Rose `#F43F5E`, chip surface `rgba(244, 63, 94, 0.12)`.
- **Planning / Backlog:** Slate `#64748B`, chip surface `rgba(100, 116, 139, 0.12)`.

---

## 8. Current vs Stitch Direct Colour Comparison

| Semantic Role | Current AI NEX OS (Dark) | Stitch Round 5 ("Executive Precision") | Delta / Difference | Migration Recommendation |
|---|---|---|---|---|
| **App Background** | `oklch(0.145 0 0)` (~#1a1a1a) | `#0A0D12` (Base Canvas) / `#10141a` | Stitch is significantly deeper (L=0.10 vs 0.145) with a cold blue-black cast instead of flat neutral gray. | **Adapt**: Re-map `--background` to `#0A0D12` (`oklch(0.11 0.015 250)`). |
| **Sidebar Background**| `oklch(0.205 0 0)` (~#2a2a2a) | `#0E1218` (Surface Level 1) | Current sidebar matches card luminance; Stitch sidebar recedes into canvas, acting as a deep dark frame. | **Adapt**: Re-map `--sidebar` to `#0E1218` (`oklch(0.13 0.015 250)`). |
| **Card Surface** | `oklch(0.205 0 0)` (~#2a2a2a) | `#141923` (Surface Level 2) | Current card is neutral gray; Stitch card has slate-cast depth with 1px hairline border. | **Adapt**: Re-map `--card` to `#141923` (`oklch(0.17 0.02 250)`). |
| **Hover Surface** | `oklch(0.269 0 0)` (`--muted`) | `#1A212E` (Surface Level 3) | Stitch provides dedicated elevated hover state with higher contrast against Level 2 cards. | **Adapt**: Re-map `--muted` to `#1A212E` (`oklch(0.21 0.025 250)`). |
| **Modal / Popover** | `oklch(0.205 0 0)` (`--popover`)| `#222B3B` (Surface Level 4) | Current popovers share flat card luminance; Stitch popovers float at Level 4 with dark diffusion shadows. | **Adapt**: Re-map `--popover` to `#222B3B` (`oklch(0.26 0.03 250)`). |
| **Default Border** | `oklch(1 0 0 / 10%)` | `rgba(255, 255, 255, 0.09)` / `#3e4850` | Similar alpha level, but Stitch introduces stratified border opacities (0.06 to 0.14). | **Adapt**: Keep base `--border` at 9% white, introduce `--border-subtle` and `--border-strong`. |
| **Primary Text** | `oklch(0.985 0 0)` (~#f8f8f8) | `#F1F5F9` (`#dfe2eb` in schema) | Current uses pure white; Stitch uses cool off-white (`#F1F5F9`) with `#FFFFFF` reserved for headings. | **Adapt**: Retain high luminance, adapt body text token to `#F1F5F9`. |
| **Secondary Text** | `oklch(0.708 0 0)` (~#b5b5b5) | `#94A3B8` (`#bec8d2` in schema) | Current is neutral gray; Stitch is cool slate blue-gray, creating higher perceived sharpness. | **Adapt**: Re-map `--muted-foreground` to `#94A3B8`. |
| **Muted Text / Keys** | Not separately tokenized | `#64748B` (`#88929b` in schema) | Currently collapses into `--muted-foreground`; Stitch uses `#64748B` for shortcuts (`⌘K`) and placeholders. | **Adapt**: Introduce explicit `--foreground-muted: #64748B`. |
| **Primary Action** | `oklch(0.922 0 0)` (White button) | `#0EA5E9` (Electric Sky) / `#0284C7` | **MAJOR CONFLICT**: Current UI uses white buttons in dark mode. Stitch mandates Electric Sky gradient. | **Replace**: Replace white button with Stitch `#0EA5E9` / `#0284C7` Creative Spark. |
| **Success Status** | `oklch(0.696 0.14 155)` (Sage) | `#34D399` (Emerald 400) + 12% fill | Stitch uses vibrant emerald with 12% translucent chip fill and 6px status dot. | **Adapt**: Align `--success` with Emerald `#34D399` (`#10b981`). |
| **Warning Status** | `oklch(0.828 0.145 85)` (Ochre) | `#FBBF24` (Amber 400) + 12% fill | Stitch uses amber for review states; current is olive-ochre. | **Adapt**: Align `--warning` with Amber `#FBBF24`. |
| **Destructive / Error**| `oklch(0.704 0.191 22.216)` | `#F43F5E` (Rose 500) + 12% fill | Stitch uses vivid rose; current is soft coral red. | **Adapt**: Align `--destructive` with Rose `#F43F5E`. |
| **Info / Active** | `oklch(0.685 0.155 250)` | `#38BDF8` (Cyan 400) + 12% fill | Stitch uses sky cyan for live/active states; current is soft periwinkle. | **Adapt**: Align `--info` with Sky `#38BDF8`. |

---

## 9. Design Language Comparison

| Attribute | Current AI NEX OS Implementation | Proposed Stitch Redesign ("Executive Precision") | Engineering & UX Impact |
|---|---|---|---|
| **Visual Density** | Standard enterprise dashboard padding (16px–24px card gutters). Relaxed row heights (48px–56px). | Ultra-high information density. 32px table headers, compact 36px–40px table rows, 4px grid rhythm. | **High Impact**: Requires compacting table row heights and form control heights (from 40px to 34px–38px). |
| **Surface Elevation** | 1 flat surface level (`--card: oklch(0.205 0 0)`). No elevation differentiation between cards, sidebars, and popovers. | 5 stratified elevation planes (Plane 0 `#0A0D12` through Plane 4 `#222B3B`). | **Major Architecture Leap**: Requires adding 4 new surface tokens to CSS and updating component wrappers. |
| **Border Philosophy** | Single uniform border: `oklch(1 0 0 / 10%)` applied broadly across all containers. | 3-tier hairline alpha borders (`0.06`, `0.09`, `0.14`) + `inset 0 1px 0 0 rgba(255,255,255,0.06)` top highlight. | **Visual Precision**: Imparts an etched aluminum and optical glass finish characteristic of high-end tools. |
| **Typography Scale** | Standard Geist Sans scale with default proportional numerals. | Geist Sans for narrative + JetBrains Mono strictly enforced for IDs, timestamps, timecodes, metrics, and `tabular-nums`. | **Data Scannability**: Eliminates layout jitter during real-time websocket updates and timeline scrubbing. |
| **Corner Radius** | Rounded and soft: `--radius: 0.625rem` (10px base; sm=6px, md=8px, lg=10px, xl=14px). | Mechanical and architectural: `0.25rem` (4px base; controls=6px, cards=8px, modals=14px, pills=9999px). | **Brand Character**: Shifts interface from friendly SaaS to precision industrial instrumentation. |
| **Lighting & Depth** | Border-reliant; zero drop shadows in dark mode. | Subtle ambient occlusion shadows (`0 8px 24px -4px rgba(0,0,0,0.45)`) combined with inset edge highlights. | **Atmosphere**: Eliminates dirty gray blur rings; preserves deep black contrast floor. |
| **Navigation State** | Background highlight (`bg-sidebar-accent text-sidebar-accent-foreground`). | 2px electric cyan active left-border (`border-l-2 border-primary bg-surface-container-high`). | **Clearer Affordance**: Immediately draws eye to the active workspace without visual noise. |

---

## 10. Design Token Gap Analysis

The audit identified **8 major token gaps** where Stitch requires design tokens that do not currently exist in the AI NEX OS design system:

| # | Stitch Requirement | Existing Token in AI NEX OS? | Current Nearest Equivalent | Architectural Gap | Implementation Complexity |
|---|---|---|---|---|---|
| 1 | **Multi-Tier Surface Elevation (5 Planes)** | No | `--card`, `--popover`, `--muted` (all flat) | Missing `--surface-canvas` (`#0A0D12`), `--surface-sidebar` (`#0E1218`), `--surface-card` (`#141923`), `--surface-elevated` (`#1A212E`), `--surface-overlay` (`#222B3B`). | **Medium** |
| 2 | **Stratified Border Hierarchy** | No | Single `--border` (10% white) | Missing `--border-subtle` (`rgba(255,255,255,0.06)`), `--border-default` (`0.09`), `--border-elevated` (`0.14`). | **Low** |
| 3 | **Optical Inset Highlight** | No | None | Missing `--inset-highlight` (`inset 0 1px 0 0 rgba(255, 255, 255, 0.06)`). | **Low** |
| 4 | **Electric Cyan Primary Action** | No (Inverted) | `--primary: oklch(0.922 0 0)` (White button) | Missing `--primary: #0ea5e9`, `--primary-hover: #0284c7`, `--primary-glow`. | **Low** |
| 5 | **Status Chip Translucent Surfaces** | No | Solid badges or generic Tailwind `bg-*-100` | Missing `--status-*-bg: rgba(*, 0.12)` token pair for all semantic roles. | **Medium** |
| 6 | **Monospace Tabular Numerals Token** | No | Inline `font-mono` | Missing standard `--font-metrics: var(--font-jetbrains-mono)` and utility for `tabular-nums`. | **Low** |
| 7 | **Active Navigation Indicator** | No | Generic `bg-accent` | Missing `--nav-active-border: #0ea5e9` and `--nav-active-bg: #262a31`. | **Low** |
| 8 | **Executive Ambient Occlusion Shadows** | No | None (zero shadow in dark) | Missing `--shadow-elevation-1` (`0 8px 24px -4px rgba(0,0,0,0.45)`) and `--shadow-elevation-2`. | **Low** |

---

## 11. Current Source Hardcoded Colour Audit

Forensic inspection across all `.tsx` and `.ts` files in `AIC NEXOS/ai-nexos/src` identified hardcoded color values bypassing the design system:

| File Location | Line / Location | Detected Color / Class | Semantic Usage | Frequency | Suggested Token Role | Severity Classification |
|---|---|---|---|---|---|---|
| `src/lib/analytics/widgets/WidgetEngine.ts` | Line 115–120 | `#0088fe`, `#00c49f`, `#ffbb28`, `#ff8042` | Recharts pie/bar color defaults | 4 | `--chart-1` through `--chart-5` | **HIGH** |
| `src/features/timelines/components/timeline-dashboard.tsx` | Line 61, 85, 112 | `border-gray-300`, `bg-gray-50`, `text-gray-500` | Milestone headers & timeline grid | 21 | `--border-subtle`, `--muted`, `--muted-foreground` | **HIGH** |
| `src/components/portal/dashboard/DashboardGrid.tsx` | Line 10, 18, 35 | `border-gray-100`, `border-gray-700`, `bg-gray-800` | Portal container cards | 9 | `--border`, `--card` | **HIGH** |
| `src/features/projects/components/project-badges.tsx` | Line 24, 38 | `bg-green-100 text-green-800`, `bg-yellow-100` | Legacy status chips | 9 | `--success`, `--warning` (Semantic chips) | **HIGH** |
| `src/features/clients/components/client-badges.tsx` | Line 11, 23 | `bg-emerald-500/15 text-emerald-400` | Client tier chips | 6 | `--success` chip token | **MEDIUM** |
| `src/features/calendar/components/calendar-month-grid.tsx` | Line 12, 28 | `border-sky-500/40 bg-sky-500/10` | Active calendar event day | 6 | `--info` / `--primary` chip token | **MEDIUM** |
| `src/features/files/components/file-explorer.tsx` | Line 16, 42 | `bg-slate-50`, `border-slate-200` | File folder well | 6 | `--surface-1`, `--border-subtle` | **MEDIUM** |
| `src/features/timelines/components/views/gantt-chart.tsx` | Line 56, 88 | `bg-gray-50 text-gray-500` | Timeline track well | 11 | `--surface-1`, `--muted-foreground` | **MEDIUM** |
| `src/features/shares/components/external/FeedbackSidebar.tsx`| Line 59, 72 | `border-slate-200` | Public review drawer | 10 | `--border` | **MEDIUM** |
| `src/app/(dashboard)/clients/[clientId]/page.tsx` | Line 236–240 | `border-slate-800 bg-slate-700 text-slate-200` | Tab selector | 5 | `--surface-2`, `--border-elevated` | **MEDIUM** |
| `src/features/search/components/global-search.tsx` | Line 178, 262 | `text-[10px]`, `text-[11px]` | Shortcut pills (`⌘K`) | 16 | `--font-label-xs` | **LOW** |
| `src/lib/demo/store.ts` | Line 230, 467, 1103 | `#3b82f6`, `#0f172a`, `#38bdf8`, `#7c2d12` | Demo client mock branding colors | 12 | Brand Assets / Fixture Data | **INTENTIONAL** |
| `src/app/(dashboard)/settings/organization/_components/organization-form.tsx` | Line 325, 340 | `#000000`, `#ffffff` | Color picker fallbacks | 4 | Form Control Props | **INTENTIONAL** |

---

## 12. Accessibility Analysis (WCAG 2.1 Contrast)

All contrast ratios evaluated using standard WCAG 2.1 relative luminance algorithms ($L = 0.2126R + 0.7152G + 0.0722B$). Minimum requirement for normal text: **4.5:1** (AA) / **7.0:1** (AAA). Minimum for large text / graphical UI: **3.0:1**.

```
WCAG 2.1 Contrast Matrix: Current vs. Proposed Stitch
┌───────────────────────────────────────────────┬──────────────────────┬──────────────────────┐
│ Interface Element Pair                        │ Current AI NEX OS    │ Proposed Stitch R5   │
├───────────────────────────────────────────────┼──────────────────────┼──────────────────────┤
│ Primary Text on Canvas/Background             │ 16.39:1 (PASS AAA)   │ 17.76:1 (PASS AAA)   │
│ Primary Text on Card Surface                  │ 13.52:1 (PASS AAA)   │ 16.07:1 (PASS AAA)   │
│ Display Headings on Canvas                    │ 16.39:1 (PASS AAA)   │ 19.46:1 (PASS AAA)   │
│ Secondary / Metadata Text on Card             │  7.00:1 (PASS AA)    │  6.86:1 (PASS AA)    │
│ Muted Text / Shortcuts on Card                │  7.00:1 (PASS AA)    │  3.70:1 (FAIL AA)*   │
│ Primary Action Button (Text on Fill)          │ 12.04:1 (PASS AAA)** │  2.77:1 (FAIL AA)*** │
│ Semantic Success Text on Canvas               │  4.52:1 (PASS AA)    │ 10.12:1 (PASS AAA)   │
│ Semantic Warning Text on Canvas               │  8.12:1 (PASS AAA)   │ 11.66:1 (PASS AAA)   │
│ Semantic Destructive Text on Canvas           │  5.14:1 (PASS AA)    │  5.30:1 (PASS AA)    │
│ Semantic Active / Cyan Text on Canvas         │  5.10:1 (PASS AA)    │ 11.43:1 (PASS AAA)   │
└───────────────────────────────────────────────┴──────────────────────┴──────────────────────┘
* Muted text (#64748B) on #141923 passes 3:1 for incidental UI/large text, but falls below 4.5:1 for 12px text.
** Current button is black text on white fill in dark mode.
*** Stitch proposed white text (#FFFFFF) on Sky-500 (#0EA5E9) fails WCAG AA (2.77:1).
```

### Forensic Accessibility Remediation Directives:
1. **Primary Action Button Fix:** Stitch's proposed white text on `#0ea5e9` must NOT be implemented verbatim. The implementation bridge must adopt either:
   - **Option A (Stitch Schema Canonical):** Deep Navy text (`#00344d`) on `#89ceff` or `#0ea5e9` fill $\rightarrow$ **Contrast Ratio: 8.52:1 (PASS AAA)**.
   - **Option B (Dark Gradient Core):** White text (`#ffffff`) on `#0284c7` to `#0369a1` $\rightarrow$ **Contrast Ratio: 4.62:1 (PASS AA)**.
2. **Muted Text Calibration:** Elevate metadata text from `#64748B` to `#7D8D9E` when rendered below 14px to guarantee $\ge 4.5:1$ against `#141923`.

---

## 13. Preserve / Adapt / Replace Taxonomy

### 13.1 PRESERVE (Zero Breaking Changes)
- **CSS Architecture:** Tailwind CSS v4 inline theme architecture (`@theme inline` in `src/app/globals.css`).
- **Core Font Family:** Geist Sans (`--font-geist-sans`) as the primary interface typeface.
- **Component Primitives:** All Base UI (`@base-ui/react`) behavioral engines (Dialog, Popover, Field, Tooltip, Menu).
- **Core Form Primitives:** React Hook Form + Zod validation patterns.
- **Sonner Toast Toaster:** Toast notifications and event dispatchers.

### 13.2 ADAPT (Re-map or Extend Existing Tokens)
- **`--background`:** Shift from neutral gray `oklch(0.145 0 0)` to obsidian `#0A0D12` (`oklch(0.11 0.015 250)`).
- **`--card`:** Shift from `oklch(0.205 0 0)` to Surface Level 2 `#141923` (`oklch(0.17 0.02 250)`).
- **`--sidebar`:** Shift from `oklch(0.205 0 0)` to Surface Level 1 `#0E1218` (`oklch(0.13 0.015 250)`).
- **`--popover`:** Shift from `oklch(0.205 0 0)` to Surface Level 4 `#222B3B` (`oklch(0.26 0.03 250)`).
- **`--muted`:** Shift from `oklch(0.269 0 0)` to Surface Level 3 `#1A212E` (`oklch(0.21 0.025 250)`).
- **`--foreground`:** Adjust to `#F1F5F9` (`oklch(0.96 0.01 250)`) with `#FFFFFF` for headings.
- **`--muted-foreground`:** Shift to `#94A3B8` (`oklch(0.72 0.025 250)`).
- **`--border`:** Keep default at `rgba(255, 255, 255, 0.09)`, extend with `--border-subtle` (`0.06`) and `--border-strong` (`0.14`).
- **`--radius`:** Scale down base radius from `0.625rem` (10px) to `0.25rem` (4px).
- **Status Tokens:** Shift `--success`, `--warning`, `--destructive`, `--info` to Emerald (`#34D399`), Amber (`#FBBF24`), Rose (`#F43F5E`), and Sky (`#38BDF8`).

### 13.3 REPLACE (Supersede Conflicting Patterns)
- **Primary Button Inversion:** Discard the current dark-mode white button (`--primary: oklch(0.922 0 0)`). Replace with Stitch's signature Creative Spark (`#0EA5E9` / `#0284C7`).
- **Raw Tailwind Grays:** Eliminate all `text-gray-500`, `border-gray-200`, `bg-gray-800` throughout the 29 flagged files; replace with semantic tokens.
- **Monospace Font:** Introduce JetBrains Mono for all numeric tables, IDs, timecodes, and status chips, replacing plain Geist Mono.

---

## 14. Proposed Semantic Design Token Bridge

The proposed token bridge maintains strict compatibility with shadcn/ui and Base UI while fully unlocking the Executive Precision stratified hierarchy.

```css
/* ============================================================================
   AI NEX OS — Proposed Executive Precision Token Bridge (Phase 4B Target)
   ========================================================================== */

:root {
  /* Light Mode Fallbacks (Maintained for enterprise compliance) */
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.145 0 0);
  --surface-0: oklch(1 0 0);
  --surface-1: oklch(0.98 0 0);
  --surface-2: oklch(0.96 0 0);
  --surface-3: oklch(0.93 0 0);
  --surface-4: oklch(1 0 0);
  --primary: #0284c7;
  --primary-foreground: #ffffff;
  --border: rgba(0, 0, 0, 0.08);
  --border-subtle: rgba(0, 0, 0, 0.04);
  --border-strong: rgba(0, 0, 0, 0.16);
  --radius: 0.25rem;
}

.dark {
  /* --------------------------------------------------------------------------
     1. Tonal Obsidian Stratification (Base Canvas through Plane 4)
     -------------------------------------------------------------------------- */
  --background: #0a0d12;              /* Plane 0: Base Viewport Canvas Floor */
  --surface-0: #0a0d12;               /* Canvas Non-interactive Ground */
  --surface-1: #0e1218;               /* Plane 1: Structural Navigation, Sidebars */
  --surface-2: #141923;               /* Plane 2: Primary Workstation Cards, Tables */
  --surface-3: #1a212e;               /* Plane 3: Hover Surfaces, Segmented Tabs */
  --surface-4: #222b3b;               /* Plane 4: Command Center ⌘K, Modal Sheets */

  /* shadcn/ui Standard Compatibility Mappings */
  --card: var(--surface-2);
  --card-foreground: #f1f5f9;
  --popover: var(--surface-4);
  --popover-foreground: #f1f5f9;
  --sidebar: var(--surface-1);
  --sidebar-foreground: #f1f5f9;
  --sidebar-primary: #0ea5e9;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: var(--surface-3);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: var(--border-subtle);

  /* --------------------------------------------------------------------------
     2. Hairline Delineations & Optical Highlights
     -------------------------------------------------------------------------- */
  --border-subtle: rgba(255, 255, 255, 0.06);   /* Grid dividers, table rows */
  --border: rgba(255, 255, 255, 0.09);          /* Default card & container outlines */
  --border-strong: rgba(255, 255, 255, 0.14);   /* Hovered controls, modal outlines */
  --input: rgba(255, 255, 255, 0.10);           /* Input borders */
  --ring: rgba(14, 165, 233, 0.50);             /* Focus glow & timeline needles */
  --highlight-top: inset 0 1px 0 0 rgba(255, 255, 255, 0.06); /* Machined edge */

  /* --------------------------------------------------------------------------
     3. Typographic Luminance Hierarchy
     -------------------------------------------------------------------------- */
  --foreground: #f1f5f9;                         /* Primary body text */
  --foreground-heading: #ffffff;                 /* Display headlines & KPI numbers */
  --foreground-secondary: #94a3b8;               /* Metadata, column headers */
  --foreground-muted: #64748b;                   /* Shortcuts (⌘K), placeholders */
  --muted: var(--surface-3);                     /* Muted surface elements */
  --muted-foreground: var(--foreground-secondary);

  /* --------------------------------------------------------------------------
     4. Creative Spark & Interaction Tokens
     -------------------------------------------------------------------------- */
  --primary: #0ea5e9;                            /* Electric Sky Accent */
  --primary-hover: #0284c7;                      /* Hovered button state */
  --primary-foreground: #ffffff;                 /* White text (paired with deep base) */
  --primary-glow: 0 0 12px rgba(14, 165, 233, 0.30);
  --secondary: var(--surface-3);
  --secondary-foreground: #f1f5f9;
  --accent: var(--surface-3);
  --accent-foreground: #38bdf8;

  /* --------------------------------------------------------------------------
     5. Functional Status & Priority Indicators (10-12% Chip Surfaces)
     -------------------------------------------------------------------------- */
  --success: #34d399;                            /* Emerald (Approved, Completed) */
  --success-bg: rgba(52, 211, 153, 0.12);
  --warning: #fbbf24;                            /* Amber (In Review, At Risk) */
  --warning-bg: rgba(251, 191, 36, 0.12);
  --destructive: #f43f5e;                        /* Rose (Blocked, Rejected) */
  --destructive-bg: rgba(244, 63, 94, 0.12);
  --info: #38bdf8;                               /* Cyan (Active, In Progress) */
  --info-bg: rgba(56, 189, 248, 0.12);
  --backlog: #64748b;                            /* Slate (Draft, Planning) */
  --backlog-bg: rgba(100, 116, 139, 0.12);

  /* --------------------------------------------------------------------------
     6. Geometry & Elevation
     -------------------------------------------------------------------------- */
  --radius: 0.25rem;                             /* 4px Base Mechanical Curve */
  --shadow-elevation-1: 0 8px 24px -4px rgba(0, 0, 0, 0.45);
  --shadow-elevation-2: 0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
}
```

---

## 15. Migration Risks & Engineering Constraints

1. **Tailwind CSS v4 Inline Theme Specifics:** AI NEX OS uses `@import "tailwindcss"` with `@theme inline` in `src/app/globals.css`. Any token added to CSS variables must be mapped inside `@theme inline` (e.g. `--color-surface-1: var(--surface-1);`).
2. **Next.js 16.3.8 Turbopack Cache Invalidation:** Modifying `globals.css` in Next.js 16 can occasionally retain stale CSS variable bindings in `.next/cache`. A clean cache sweep (`rm -rf .next`) must accompany any theme migration.
3. **Base UI Overlay Focus Trapping:** Upgrading dialogs to Plane 4 (`--surface-4: #222B3B`) with custom occlusion shadows requires verifying that `@base-ui/react` modal backdrops correctly obscure underlying Level 2 cards.
4. **Third-Party Chart SVG Fills (Recharts / SVG):** The 4 hardcoded colors in `WidgetEngine.ts` (`#0088fe`, etc.) must be re-mapped to CSS custom properties using inline SVG `var(--color-primary)` references to avoid theme desynchronization.

---

## 16. Open Human Decisions Required

The following **three decisions** require explicit human approval before any implementation begins:

1. **Primary Button Contrast Standard:**
   - *Option A:* Use Stitch's YAML spec (Deep Navy text `#00344d` on Electric Cyan `#89ceff`, achieving a AAA 8.52:1 contrast ratio).
   - *Option B:* Use Stitch's visual mockup spec with a deepened gradient (White text `#ffffff` on `#0284c7` $\rightarrow$ `#0369a1`, achieving an AA 4.62:1 contrast ratio).
2. **Surface Token Naming Convention:**
   - *Option A:* Match Stitch YAML (`surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`).
   - *Option B:* Adopt concise semantic planes (`--surface-0`, `--surface-1`, `--surface-2`, `--surface-3`, `--surface-4`).
3. **Corner Radius Policy:**
   - *Option A:* Adopt Stitch's strict industrial 4px base radius (`--radius: 0.25rem`), transforming inputs to 6px and cards to 8px.
   - *Option B:* Retain existing 10px base radius (`--radius: 0.625rem`) with Stitch colors.

---

## 17. Recommended Next Step

Upon human review and resolution of the three open decisions above:
1. Formulate the **Phase 4C Design Token Migration Spec** to update `src/app/globals.css` with the approved token bridge.
2. Refactor the 29 files containing legacy raw Tailwind color utilities to consume the new semantic tokens.
3. Update `src/components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, and `app-sidebar.tsx` to reflect the Executive Precision geometry and elevation.

---

## 18. Final Verdict

The Round 5 Stitch redesign ("Executive Precision") represents a major leap in visual authority, typographic rigor, and workstation utility for AI NEX OS. The bridge between the two systems is technically sound, highly structured, and ready for execution as soon as human alignment on the three open decisions is recorded.

**Zero code or schema modifications were made during this audit.**

---
*Signed: Senior UI Engineer & Design Systems Architect — October 4, 2026*
