# AI NEX OS — AI Collective Coupling Register
## Phase 1A: Comprehensive Dependency Inventory

**Document Path:** `docs/product/AI-COLLECTIVE-COUPLING-REGISTER.md`  
**Date:** September 25, 2026  
**Auditor:** Antigravity AI Engineering Assistant  
**Status:** Canonical Reference Document  
**Scope:** Exhaustive catalog of all occurrences, assumptions, and dependencies tied to "AI Collective" and "AIC" across the codebase, documentation, schemas, and runtime configurations.

---

## 1. Classification Taxonomy

To ensure surgical and safe decoupling, every occurrence is classified into one of ten specific types:
1. **Product Branding**: Direct naming of the product or organization in user-facing UI.
2. **Seed/Demo Data**: Fixture values, mock store entries, or initial database seed inputs.
3. **Historical Documentation**: Sprint logs, retrospective reports, handover documents, and legacy specs.
4. **Test Fixture**: Unit, integration, or e2e test assertions and mock inputs.
5. **Identifier**: Hardcoded database codes, column prefixes, machine keys, or string prefixes.
6. **Business Logic**: Hardcoded conditional paths, branching, or algorithm assumptions.
7. **Environment Configuration**: `.env` files, environment manifests, or configuration descriptors.
8. **User Data**: Database content, tenant record fields, or active profiles.
9. **Example**: Inline documentation examples illustrating configuration or code usage.
10. **Comment**: Code comments, docstrings, or developer annotations.

> **CRITICAL RULE**: "AI" referring to **Artificial Intelligence** (e.g., `aiContexts`, `aiConversations`, `AICostGovernance`, `aiCapabilityEnum`) is **NOT** a coupling to AI Collective. It represents generic platform capability and must remain intact.

---

## 2. Coupling Register

| ID | File Path | Line / Location | Type | Current Behavior | Target Behavior | Database Impact | Auth Impact | UI Impact | Migration Risk | Phase |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CPL-01** | `src/features/projects/real-actions.ts` | Lines 39, 64 | **Identifier / Business Logic** | Generates sequential project code with hardcoded prefix: `AIC-${currentYear}-${nextSequence}` | Resolve `codePrefix` from caller's organization: `${org.codePrefix}-${currentYear}-${nextSequence}` (default: `NEX`) | Additive `code_prefix` column to `organizations` | None | Shows custom agency prefix on project cards, tables, headers | Low (additive column + code fallback) | **Phase 3** |
| **CPL-02** | `src/features/tasks/real-actions.ts` | Lines 64, 89 | **Identifier / Business Logic** | Generates sequential task code with hardcoded prefix: `AIC-T-${currentYear}-${nextSequence}` | Resolve `codePrefix` from caller's organization: `${org.codePrefix}-T-${currentYear}-${nextSequence}` (default: `NEX-T`) | Relies on `organizations.code_prefix` | None | Shows custom agency prefix on task boards, modals, detail drawers | Low (additive) | **Phase 3** |
| **CPL-03** | `src/features/meetings/real-actions.ts` | Line 586 | **Identifier / Business Logic** | Promotes action item to task using hardcoded random code: `AIC-T-${year}-${random}` | Call centralized `generateTaskCode(user.organizationId, tx)` using org prefix | Uses existing `organization_sequences` sequence | None | Uniform task code across manual creation and meeting action item promotion | Low | **Phase 3** |
| **CPL-04** | `src/features/projects/mock-actions.ts` | Line 47 | **Seed/Demo Data** | Mocks project creation code with prefix: `AIC-${now.getFullYear()}` | Use `DEMO-${now.getFullYear()}` or mock organization's slug prefix | None (in-memory demo store only) | None | Consistent demo workspace display | None | **Phase 1B** |
| **CPL-05** | `src/features/tasks/mock-actions.ts` | Line 79 | **Seed/Demo Data** | Mocks task creation code with prefix: `AIC-T-${now.getFullYear()}` | Use `DEMO-T-${now.getFullYear()}` | None (in-memory demo store only) | None | Consistent demo workspace display | None | **Phase 1B** |
| **CPL-06** | `src/features/meetings/mock-actions.ts` | Line 495 | **Seed/Demo Data** | Mocks action item promotion with prefix: `AIC-T-${year}` | Use `DEMO-T-${year}` | None (in-memory demo store only) | None | Consistent demo workspace display | None | **Phase 1B** |
| **CPL-07** | `src/features/users/admin/mock-repository.ts` | Line 153 | **Seed/Demo Data** | Generates mock employee code with prefix: `AIC` | Use `EMP` or `DEMO-EMP` | None | None | Employee table mock rows show generic code | None | **Phase 1B** |
| **CPL-08** | `src/lib/demo/store.ts` | Lines 271–405 | **Seed/Demo Data** | Seeds 8 demo employees with IDs `AIC-0001` through `AIC-0008` | Update demo employees to `DEMO-0001` through `DEMO-0008` | None | None | Demo workforce directory displays neutral agency codes | None | **Phase 1B** |
| **CPL-09** | `src/lib/demo/store.ts` | Lines 541, 566 | **Seed/Demo Data** | Seeds demo projects with codes `AIC-2026-0001`, `AIC-2026-0002` | Update demo projects to `DEMO-2026-0001`, `DEMO-2026-0002` | None | None | Demo projects page shows neutral codes | None | **Phase 1B** |
| **CPL-10** | `src/lib/demo/store.ts` | Lines 707–725 | **Seed/Demo Data** | Seeds demo tasks with codes `AIC-T-2026-0001` through `0003` | Update demo tasks to `DEMO-T-2026-0001` through `0003` | None | None | Demo task boards show neutral codes | None | **Phase 1B** |
| **CPL-11** | `src/lib/demo/store.ts` | Lines 1466, 1650 | **Comment** | Comments reference `(AIC-0001)` and `for AIC-YYYY-XXXX style codes` | Update comments to reference neutral examples (e.g., `DEMO-0001`, `{PREFIX}-YYYY-XXXX`) | None | None | None (developer comments only) | None | **Phase 1B** |
| **CPL-12** | `src/features/workforce/employees/types.ts` | Line 10 | **Comment / Example** | Doc comment: `Per-org employee code, e.g. "AIC-0001"` | Update doc comment: `Per-org employee code, e.g. "EMP-0001" or "{PREFIX}-0001"` | None | None | None | None | **Phase 1B** |
| **CPL-13** | `src/features/workforce/corrections/correction-code.ts` | Line 10 | **Comment / Example** | Doc comment: `the same per-organization counter generateProjectCode uses for AIC-YYYY-####` | Update doc comment: `uses for {PREFIX}-YYYY-####` | None | None | None | None | **Phase 1B** |
| **CPL-14** | `src/db/schema/tasks.ts` | Line 80 | **Comment** | Schema comment: `taskCode: text("task_code").notNull().unique(), // AIC-T-YYYY-XXXX` | Update comment to: `// {PREFIX}-T-YYYY-XXXX` | None | None | None | None | **Phase 1B** |
| **CPL-15** | `src/config/app.ts` | Line 3 | **Comment / Historical Documentation** | Comment: `The product is AI NEX OS; the tenant (AI Collective) is data, not code —` | Update comment: `The product is AI NEX OS; tenant identity is data, not code — organization identity always comes from the database.` | None | None | None | None | **Phase 1B** |
| **CPL-16** | `src/config/app.ts` | Lines 11, 14 | **Example / Comment** | Comments reference `app.aicollective.agency` and `portal.aicollective.agency` | Update comments to generic examples: `app.example.com` and `portal.example.com` | None | None | None | None | **Phase 1B** |
| **CPL-17** | `src/lib/env.server.ts` | Lines 120, 127 | **Example / Comment** | Env manifest comments: `purpose: "Internal dashboard host, e.g. app.aicollective.agency."` | Update comments to: `purpose: "Internal dashboard host, e.g. app.youragency.com."` | None | None | None | None | **Phase 1B** |
| **CPL-18** | `.env.example` | Line 151 | **Seed/Demo Data / Environment Configuration** | `SEED_ORG_NAME="AI Collective"` | Change default template to: `SEED_ORG_NAME="Acme Creative Studio"` | None (template file) | None | Bootstrap seed creates an agency-agnostic organization | None | **Phase 1B** |
| **CPL-19** | `docs/PRODUCTION_MIGRATION_PLAN.md` | Line 33 | **Historical Documentation** | Architecture diagram references `app.aicollective.agency · portal.*` | Preserve as historical artifact; add notice pointing to canonical SaaS context | None | None | None | None | **None** (Preserve) |
| **CPL-20** | `docs/SPRINT-2.4.md` | Lines 334, 335, 929, 941 | **Historical Documentation** | Notes withdrawal of `app.aicollective.agency` domains in favor of Vercel/Antideploy hostnames | Preserve as historical sprint documentation | None | None | None | None | **None** (Preserve) |
| **CPL-21** | `docs/STABILIZATION_REPORT.md` | Lines 122, 124 | **Historical Documentation** | Historical review mentions `AIC-2026-0001` and title fix from `AIC Nex OS` to `AI NEX OS` | Preserve as historical record | None | None | None | None | **None** (Preserve) |
| **CPL-22** | `docs/PHASE-02-STABILIZATION-REPORT.md` | Line 124 | **Historical Documentation** | Mentions `Sequential project code generated (AIC-2026-XXXX)` | Preserve as historical record | None | None | None | None | **None** (Preserve) |
| **CPL-23** | `docs/PHASE-A-REVIEW.md` | Line 341 | **Historical Documentation** | QA review record: `"Website Redesign / AIC-2026-0001"` | Preserve as historical record | None | None | None | None | **None** (Preserve) |
| **CPL-24** | `docs/REPOSITORY_STABILIZATION_REPORT.md` | Line 43 | **Historical Documentation** | Lists directory root `NEXOS Comb /AIC NEXOS/ai-nexos` | Preserve as filesystem documentation | None | None | None | None | **None** (Preserve) |
| **CPL-25** | `DOCS/AIC NexOS (PRD).md` | Lines 9, 28, 32 | **Historical Documentation** | Founding PRD stating exclusive build for AI Collective | Preserved in `DOCS/`; superseded by `AI-NEX-OS-PRODUCT-CONTEXT-V2.md` | None | None | None | None | **None** (Superseded) |
| **CPL-26** | `DOCS/AIC Nex OS (SDS).md` | Lines 10, 57, 558, 2539 | **Historical Documentation** | Founding SDS defining "One Organization" single-tenant architecture | Preserved in `DOCS/`; superseded by `AI-NEX-OS-PRODUCT-CONTEXT-V2.md` | None | None | None | None | **None** (Superseded) |
| **CPL-27** | `DOCS/AIC Nex OS (DBD).md` | Lines 10, 22, 370 | **Historical Documentation** | Founding DBD stating organizations table "Represents AI Collective" | Preserved in `DOCS/`; superseded by `AI-NEX-OS-PRODUCT-CONTEXT-V2.md` | None | None | None | None | **None** (Superseded) |
| **CPL-28** | `DOCS/AIC Nex OS (TRD) .md` | Lines 10, 555 | **Historical Documentation** | Founding TRD stating "Authentication is only required for internal AI Collective users" | Preserved in `DOCS/`; superseded by `AI-NEX-OS-PRODUCT-CONTEXT-V2.md` | None | None | None | None | **None** (Superseded) |

---

## 3. Disambiguation: Artificial Intelligence vs. AI Collective

The following code symbols contain `AI` or `AIC` but represent **platform Artificial Intelligence capabilities**, not organizational coupling. They **MUST NOT** be modified or decoupled:

| Symbol / Identifier | File Location | Meaning | Reason to Retain |
| :--- | :--- | :--- | :--- |
| `aiCapabilityEnum` | `src/db/schema/enums.ts` | Enum of supported AI model operations (chat, summary, extraction) | Generic AI feature layer |
| `aiConversations` | `src/db/schema/ai-workspace.ts` | Table storing AI assistant conversation threads | Generic AI feature layer |
| `aiContexts` | `src/db/schema/ai-workspace.ts` | Table storing context windows and prompt attachments | Generic AI feature layer |
| `aiContextSources` | `src/db/schema/ai-workspace.ts` | Table mapping files and records injected into prompt contexts | Generic AI feature layer |
| `aiCostTracking` | `src/db/schema/ai-workspace.ts` | Table tracking LLM token consumption and per-org AI billing | Multi-tenant AI billing engine |
| `AICostGovernance` | `src/lib/ai/governance.ts` | Class managing token budgets and throttling | AI capability governance |
| `AICapability` | `src/lib/ai/types.ts` | Type definition for AI capabilities | Generic AI capability type |
| `aiContextBuilder` | `src/lib/ai/context-builder.ts` | Service assembling contextual tokens for LLM generation | Generic AI capability layer |

---

## 4. Remediation Plan by Implementation Phase

1. **Phase 1B (Non-Functional Decoupling)**:
   - Update demo store identifiers (`CPL-08`, `CPL-09`, `CPL-10`).
   - Update mock action generators (`CPL-04`, `CPL-05`, `CPL-06`, `CPL-07`).
   - Clean up code comments and environment examples (`CPL-11`, `CPL-12`, `CPL-13`, `CPL-14`, `CPL-15`, `CPL-16`, `CPL-17`, `CPL-18`).
2. **Phase 3 (Operational Decoupling)**:
   - Apply database migration adding `code_prefix` column to `organizations` table.
   - Update real action generators (`CPL-01`, `CPL-02`, `CPL-03`) to derive prefixes dynamically from the active organization.
3. **Preserved Documents**:
   - Historical documents (`CPL-19` through `CPL-28`) remain untouched to maintain an accurate audit trail of repository evolution.
