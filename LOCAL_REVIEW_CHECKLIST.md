# AI NEX OS - Local Review Checklist

## 1. Local Environment

- [ ] Node version verified
- [ ] npm dependencies installed correctly
- [ ] No missing packages
- [ ] `package.json` scripts function locally

## 2. Development Server

- [ ] `npm run dev` starts without errors
- [ ] Hot reloading is functional
- [ ] Application loads at `http://localhost:3000`

## 3. DemoStore & Architecture

- [ ] Demo mode active (`DEMO_MODE=true`)
- [ ] DemoStore seed data loaded correctly
- [ ] State persistence working across reloads
- [ ] External API connections bypassed (Supabase disabled locally)

## 4. Navigation & Layout

- [ ] Sidebar navigation links correct
- [ ] Breadcrumbs render and link accurately
- [ ] Role switching and permissions apply
- [ ] Deep links function as expected
- [ ] Responsive layouts adjust gracefully
- [ ] Icons and active states display properly

## 5. Modules & Workspaces

- [ ] **Dashboard**: Charts, KPI cards, and recent activity load
- [ ] **Workforce**: Member directory, profiles, roles
- [ ] **Task Management**: Kanban boards, task detail views, assignments
- [ ] **Digital Asset Management**: Asset gallery, previews, metadata
- [ ] **Deliverables**: Pipelines, statuses, items
- [ ] **Approval Center**: Pending approvals, reviews, sign-offs
- [ ] **Revision Center**: Version history, comparisons, comments
- [ ] **Meeting Center**: Calendars, meeting notes, action items
- [ ] **Timeline**: Gantt charts, roadmaps, dependencies
- [ ] **Automation**: Workflows, triggers, actions
- [ ] **Reporting**: Custom reports, exports, saved views
- [ ] **Analytics**: System usage, performance metrics
- [ ] **Admin / Settings**: Configuration panels, preferences
- [ ] **Search**: Global search overlay, accurate results
- [ ] **Audit**: Audit logs, history tracking
- [ ] **Notifications**: Real-time alerts, unread states, drawers

## 6. UI Components

- [ ] Dialogs / Modals render and close properly
- [ ] Drawers / Slide-overs animate and function
- [ ] Forms validate inputs and submit locally
- [ ] Data tables sort, filter, and paginate
- [ ] Buttons have proper states (hover, active, disabled)
- [ ] Empty states displayed when no data exists
- [ ] Skeletons / Loading states appear correctly

## 7. Quality & Runtime

- [ ] UI Review: Visual consistency across all views
- [ ] Performance Review: Fast transitions, no jank
- [ ] Permission Review: UI correctly hides/shows based on local role
- [ ] Console Review: No React warnings, hydration errors, or JS exceptions
- [ ] No 404s on registered routes
- [ ] Quality gates passed (Lint, Typecheck, Build, Test)
