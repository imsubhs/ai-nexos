# AI NEX OS — Recovery Checklist

**Version:** 1.0
**Date:** 2026-07-28
**Applies to:** `v1.0.0-beta`
**Verified:** §3 executed end-to-end in Phase C.1. §2, §4 and §5 are procedures, not verified events.

---

## 0. Current Recovery Posture — read this first

| Capability | State |
|---|---|
| Rebuild the app from the repository | ✅ **Verified.** §3 |
| Recover the repository if this disk fails | ❌ **IMPOSSIBLE.** No remote. No tag. No bundle. |
| Roll back a failed migration | ❌ Nothing to roll back to |
| Restore production data | ❌ No production, no backup |
| Restore from backup | ❌ Never configured, never rehearsed |

**552 files. Two commits. One disk.**

Three months of work — every sprint since the M0 baseline — is uncommitted, untagged and unmirrored. A disk failure, an accidental `rm -rf`, or a single `git checkout .` is **total, unrecoverable loss.**

The parent `WebsiteCreation` directory is a *separate* git repository that does **not** track `ai-nexos`. Backing up the parent backs up nothing here. Anyone assuming otherwise has no backup at all.

> **§1 is the only section that changes this.** Everything else in this document is a procedure for recovering a repository that can currently only be recovered if it has not been lost.

---

## 1. Immediate Actions — Gate G1

Ordered. Each blocks the next. Full detail in `VERSION_CONTROL_PLAN.md` §8 and `REPOSITORY_STABILIZATION_REPORT.md` §8.

- [ ] **1. Commit the migrations first, atomically, with explicit paths.**

      ```bash
      git add database/migrations/0008_same_johnny_storm.sql \
              database/migrations/0009_mute_wallow.sql \
              database/migrations/meta/0008_snapshot.json \
              database/migrations/meta/0009_snapshot.json \
              database/migrations/meta/_journal.json
      git status --short database/          # all five staged? nothing missing?
      git commit -m "fix(db): journal migrations 0008 and 0009"
      ```

      ⛔ **Never `git add -u` or `git commit -a` here.** Both stage the modified `_journal.json` while ignoring the untracked `.sql` files, producing a repository whose journal references migrations that do not exist. This is the one ordering detail that must survive any shortcut.

- [ ] **2. Commit the sprint history** — Commits 2–8 (`REPOSITORY_STABILIZATION_REPORT.md` §8).
- [ ] **3. Commit documentation** — Commit 9; set `package.json` version to `1.0.0-beta`.
- [ ] **4. Tag, annotated:** `v1.0.0-beta` on Commit 9; `v1.0.0-baseline` on `1b17234`.
- [ ] **5. Fast-forward `main`:** `git checkout main && git merge --ff-only phase-03-core-product`
- [ ] **6. ⛔ Add a private remote and push branches *and* tags.**

      ```bash
      git remote add origin git@github.com:<org>/ai-nexos.git
      git push -u origin main
      git push origin phase-03-core-product
      git push origin --tags
      ```

- [ ] **7. Verify the push actually protected the work** — §2. A remote that has never been cloned from is an assumption, not a backup.
- [ ] **8. Create an offline bundle** as a second copy — §5.
- [ ] **9. Fix CI** — Commits 10–11. Two of five steps currently fail (`REPOSITORY_STABILIZATION_REPORT.md` §7.4).

**Steps 1–7 are checklist items 1.1–1.5 (Gate G1). Sprint 13 does not begin until step 7 passes** — not as Sprint 13's first task, as its precondition.

**If time is short:** one commit plus one tag plus one remote eliminates the entire class of catastrophic risk. Do that today; do the nine-commit split later. There is no version of "later" that justifies leaving step 6 undone.

---

## 2. Verify a Remote Is Actually a Backup

Run **after** step 6, on a different directory — ideally a different machine.

- [ ] Refs exist remotely

      ```bash
      git ls-remote --heads origin      # main present?
      git ls-remote --tags  origin      # v1.0.0-beta AND v1.0.0-baseline present?
      git rev-parse HEAD                # equals origin/main?
      git rev-parse origin/main
      ```

- [ ] **Clone it somewhere else and run §3 against the clone.** This is the actual test. Everything above only proves bytes moved.
- [ ] Confirm the clone's migration set is consistent:

      ```bash
      ls database/migrations/*.sql | wc -l                        # 10
      grep -c '"tag"' database/migrations/meta/_journal.json      # 10
      ```

      **If these disagree, the journal hazard fired.** Fix on the source and re-push before doing anything else.

- [ ] Confirm no secret travelled: `git log --all --name-only | grep -E '^\.env' | grep -v '\.env\.example'` returns nothing.

---

## 3. Rebuild From Source — ✅ VERIFIED

This section was executed in Phase C.1 against a clean copy of the full committable tree (552 files) with **no `.env.local`, no `node_modules`, no `.next`, no `scratch/`**. Every result below is measured, not expected.

- [ ] **Clone and install**

      ```bash
      git clone <remote> ai-nexos && cd ai-nexos
      node -v                    # 24.x — CI uses 24; repo has no engines/.nvmrc pin
      npm ci                     # ✅ exit 0, clean from package-lock.json (v3)
      ```

- [ ] **Environment — the 4-variable minimum**

      ```bash
      cat > .env.local <<'EOF'
      DEMO_MODE="true"
      DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/postgres"
      NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
      NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key"
      EOF
      ```

      ⚠️ `DEMO_MODE` is **not** in `.env.example` (F-3). ⚠️ `DATABASE_URL` is required even in demo mode (F-2) — module-eval guard in `src/db/index.ts`; nothing connects.

- [ ] **Gates — expected results**

      | Command | Verified result |
      |---|---|
      | `npm run lint` | ✅ exit 0 — **0 errors, 109 warnings** (warnings are the baseline) |
      | `npm run typecheck` | ✅ exit 0, strict |
      | `npm test` | ✅ **240 passed (240)**, 22 files, 2.72 s |
      | `npm run build` | ✅ green, **35 routes**, 3.4 s compile |
      | `npm run format:check` | ❌ **exit 1 — 341 files. Known (F-1). Not a recovery failure.** |

- [ ] **Runtime**

      ```bash
      npm run dev                                    # ✅ Ready in 176 ms
      curl -s http://localhost:3000/api/health       # ✅ {"status":"healthy","demoMode":true,...}
      curl -o /dev/null -w '%{http_code}\n' http://localhost:3000/login   # ✅ 200
      ```

      **`"demoMode":true` is the check that matters.** If it reads `false`, `DEMO_MODE` is not being read and nothing downstream will behave.

- [ ] **Confirm no dependency on local-only state.** Verified in Phase C.1: nothing outside the four environment variables. No file outside the repository is required.

### Recovery time objective — measured

| Step | Time |
|---|---|
| `npm ci` | ~1–2 min |
| Write `.env.local` | seconds |
| Gates (lint + typecheck + test) | < 1 min |
| `npm run build` | ~10 s |
| Dev server ready | < 1 s |
| **Total: repository → running application** | **≈ 3 minutes** |

**RTO for the codebase is minutes, provided a copy exists.** That proviso is the entire problem, and step 6 of §1 is the entire fix.

---

## 4. Data Recovery — ❌ NOT AVAILABLE

- [ ] Supabase project provisioned — ❌ Sprint 13
- [ ] PITR enabled (7 days) — ❌ Sprint 17
- [ ] Nightly logical dump to cold storage (30 days) — ❌ Sprint 17
- [ ] Storage bucket versioning — ❌ Sprint 14/17
- [ ] **Restore rehearsed and timed; RTO documented** — ❌ Sprint 17 · **checklist 10.6 · Gate G5**
- [ ] Quarterly restore rehearsal scheduled — ❌ Sprint 17

**There is no production data, so there is nothing to lose — and no procedure that has been shown to work.**

Demo data needs no recovery: the DemoStore is an in-memory fixture on `globalThis` that reseeds on every restart. Losing it is the design.

> **An unrehearsed backup is not a backup.** Sprint 17's acceptance criterion is a *rehearsed and timed* restore with a documented RTO — not a configured one. Configuring PITR and declaring the gate closed is the failure mode this line exists to prevent.

---

## 5. Offline Backup — recommended second copy

A single remote is one provider outage or one account lockout away from unavailable. A git bundle is one file containing the entire history, restorable with no hosting provider at all.

- [ ] Create a bundle after tagging:

      ```bash
      git bundle create ai-nexos-$(date +%Y%m%d)-v1.0.0-beta.bundle --all
      git bundle verify ai-nexos-*.bundle
      ```

- [ ] **Verify it restores** — the same discipline as §4 demands of database backups:

      ```bash
      git clone ai-nexos-20260728-v1.0.0-beta.bundle /tmp/restore-test
      cd /tmp/restore-test && git log --oneline && git tag
      ```

- [ ] Store the bundle off the working disk — external drive or cloud storage, **not** the same machine.
- [ ] Refresh at each tag: `v1.0.0-beta`, `v1.0.0-rc.1`, `v1.0.0`.
- [ ] Also archive `.env.local` **separately, encrypted, never in git.** It is not in the repository by design, so a repository restore does not reproduce it. Right now it holds only demo placeholders; from Sprint 13 it will hold real credentials.

---

## 6. Disaster Scenarios

| Scenario | Recoverable today? | Recoverable after §1? | Procedure |
|---|---|---|---|
| Accidental `git checkout .` / `reset --hard` / `clean -fd` | ❌ **Total loss** | ✅ | `git reset --hard origin/main` |
| Disk failure | ❌ **Total loss** | ✅ | Clone from remote → §3 |
| `rm -rf` the project directory | ❌ **Total loss** | ✅ | Clone from remote → §3 |
| Corrupted `node_modules` | ✅ | ✅ | `rm -rf node_modules && npm ci` |
| Corrupted `.next` | ✅ | ✅ | `rm -rf .next && npm run build` |
| Lost `.env.local` | ✅ | ✅ | Recreate from §3 — 4 variables |
| Broken migration journal (`git add -u`) | ⚠️ Fixable while the working tree survives | ✅ | Restore the 4 files + journal; commit atomically (§1 step 1) |
| Remote provider outage | ❌ | ⚠️ Local clone + bundle (§5) | Work locally; re-push when restored |
| Remote account lockout | ❌ | ⚠️ Bundle only (§5) | Restore from bundle to a new remote |
| Failed Sprint 13 migration | ❌ Nothing to roll back to | ✅ | `DEMO_MODE=true` — the cheapest rollback in the plan |
| Production data loss | N/A — no production | ❌ Sprint 17 | PITR, once rehearsed |
| Leaked service-role key | N/A | ⚠️ | Rotate in Supabase; audit access logs. **No rotation policy exists** (checklist 7.15) |

**Every ❌ in column two becomes ✅ or ⚠️ by completing §1 steps 1–8.** That is the entire argument for doing them before Sprint 13.

---

## 7. Pre-Sprint-13 Sign-Off

Sprint 13 must not begin until every line is checked. `PRODUCTION_MIGRATION_PLAN.md` §3 states the reason plainly: *"Migrating on 136 uncommitted files means a failed migration has nothing to roll back to."*

- [ ] Working tree fully committed — `git status` clean
- [ ] Migration journal consistent — 10 `.sql` files, 10 journal entries, **verified in a fresh clone** (§2)
- [ ] `v1.0.0-beta` tagged, annotated, carrying the certification block
- [ ] `v1.0.0-baseline` tagged on `1b17234`
- [ ] `main` fast-forwarded and is the trunk
- [ ] **Remote configured; branches and tags pushed**
- [ ] **Clone-elsewhere test passed — §2 and §3 both green on the clone**
- [ ] Offline bundle created **and verified to restore** — §5
- [ ] CI green on the remote (Commits 10–11 applied)
- [ ] `package.json` reads `1.0.0-beta`
- [ ] Branch protection enabled on `main` (after CI is green — required checks against a broken pipeline block all merges)
- [ ] `sprint-13-persistence` cut from `main`

**Signed:** ______________________  **Date:** ____________

---

*§3 verified by execution in Phase C.1. §2, §4 and §5 are unexecuted procedures — §4 in particular describes infrastructure that does not exist. No code was modified, committed, tagged or pushed in Phase C.1.*
