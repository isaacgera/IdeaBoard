# Idea Board — Tasks & Follow-ups

Tracked units of work. Completed feature history lives in `SESSION-LOG.md`; this file
is for planned/outstanding work.

## Planned

### TASK-01: User identity — key by normalised name (Option A) — Quick Spec
**Status:** Not started (deferred from Session 6, Sep 3 2026)
**Priority:** Medium
**Type:** Bug fix / data-model change — needs its own Quick Spec + data backup first

**Problem**
Users are keyed by a random per-session id (`generateId()` in `promptUser`). The same
person therefore accumulates multiple `/users/{id}` records across devices, cleared
storage, or name-case variations. Session 6 shipped a non-destructive display-layer
dedupe (Option B): Manage Users groups records by case-insensitive name and role
actions act on all matching ids. The underlying duplicate records still exist.

**Goal (Option A — the root fix)**
- Derive the user id deterministically from the normalised (lowercased, trimmed) name
  so the same person always maps to one record; genuine spelling differences stay
  separate.
- Migrate existing `/users` records: merge duplicates (keep highest role + latest
  lastSeen), and reconcile any id-based references.
- Preserve idea/comment/history attribution (already name-based) — verify no data loss.

**Constraints / cautions**
- Touches shared, live Firebase data (multi-user). Take a full export/backup before
  running any migration.
- Do it as its own Quick Spec, not folded into an unrelated change.
- Consider a one-time migration path that runs safely if re-run (idempotent).

**Acceptance**
- A given person appears exactly once in Manage Users regardless of device/case.
- No orphaned or lost ideas/comments after migration.
- New sign-ins with an existing name reuse the existing record (no new duplicate).

### TASK-02: Migrate to the v3-modular version (parity port + promotion) — future session
**Status:** Not started (plan captured Session 10, Sep 15 2026; superseding the earlier
Session 6 note). Isaac flagged this as a near-future session.
**Priority:** Medium (was Low) — Isaac intends to migrate; do it as a Spec, phased.
**Type:** Architecture migration (feature-parity sync + served-app promotion)

**Why (Phase 0 — confirm before investing)**
v3-modular is a clean 12-module + 8-stylesheet architecture (built Session 2), but its
benefit is MAINTAINABILITY, not user-facing features. Worth doing if the app keeps
evolving; less urgent if it's stable. Gut-check the "why" in Plan mode before the port.

**Current gap (as of v2.4.8, Sep 15 2026)**
v3-modular is FROZEN at ~v2.3-era code. Everything since landed on the ROOT MONOLITH
only and must be ported in:
- PWA layer (manifest, sw.js, icons/screenshots) — v3 has NONE (Session 6, v2.4.6)
- Accessibility pass to Lighthouse 100 (ARIA, `<main>`, contrast tokens) (Session 6)
- Version badge in header (Session 7/8)
- Manage Users dedupe `getDedupedUsers`/`idsForSameName` (Session 6)
- Manage Data category reorder + chips, icon unification (Session 6)
- **RBAC fixes (Session 10, v2.4.7):** DB-as-source-of-truth roles, `isBootstrapAdmin`,
  `registerUser` reads-then-preserves role, deterministic `local_<slug>` ids
  (`slugifyName`/`localIdForName`), last-admin demote guard (`adminNameCount`/
  `groupRoleForId`).
- **Add User + self-delete guard (Session 10, v2.4.8):** `addUser`, `isSelfUser`,
  self-delete block + own-row Delete hidden, Add User section in Manage Users modal.

**Phase 1 — Feature-parity port (bulk of the work)**
Map every change since v2.3 onto the module/CSS structure, verifying FUNCTION-BY-FUNCTION
against the live monolith so nothing is missed (feature drift is the top risk):
- RBAC fixes + Add User + self-delete guard → `src/modules/auth.js`, `ideas.js`, `modals.js`
- PWA: add `manifest.json`, `sw.js`, icons at v3 root + `<head>` wiring + SW registration
  in `v3-modular/ideaboard.html`; fix relative paths for the v3 root.
- Accessibility + version badge → `rendering.js`, `modals.js`, HTML shell,
  `styles/variables.css` / `components.css` / `list.css`.
- Keep `APP_VERSION`, script cache-buster, and SW `CACHE_VERSION` in sync.
- NOTE: v3 already has an `auth.js` module (pre-dates the Entra gate; it's the RBAC/user
  module, not the Entra gate). Don't confuse it with the prototype's Entra `auth.js`.

**Phase 2 — Verify over HTTP (the historic blocker)**
v3 uses native ES modules -> MUST be served over HTTP, not `file://` (was blocked in
Session 4: no Python/Node). Live Server now available. Serve v3 and confirm: Lighthouse
100, offline/PWA works, Firebase sync works, every feature matches live v2.4.8. This is
the gate before promotion.

**Phase 3 — Promotion (swap which files are served)**
- Promote v3 files to root (or point CI/Pages at the v3 structure).
- **CI CHANGE REQUIRED:** `.gitlab-ci.yml` `pages` job currently only copies root
  `*.html *.js *.json *.png`. v3 has `src/` and `styles/` SUBFOLDERS — the copy must
  recurse those folder trees, else v3 deploys locally but 404s on GitLab Pages (same class
  of bug as the missing-PNG issue in Session 6). Test on all three Pages sites.
- Keep the monolith as a tagged fallback until v3 is proven in production.
- Release chores: version bump (v3.0.0), changelog, PWA cache bump, docs, userguide.

**Phase 4 — Data safety check**
Both versions share the SAME Firebase DB + `ib_*` localStorage keys (confirmed Session 4),
so NO data migration is needed — it's purely which files serve. Re-verify this holds after
the parity port. Take a Firebase export/backup before promotion regardless.

**Risks**
- Feature drift (must port EVERYTHING since v2.3 or v3 ships as a regression).
- CI folder-copy for `src/` + `styles/` (deploys locally but 404s on GitLab if missed).
- HTTP-only serving for ES modules; PWA/SW behaviour differs from `file://`.

**Recommendation**
Spec-level effort (multi-file, multi-phase, meant to ship) — not a Default tweak. Run
Phase 0 in Plan mode, then Phases 1-4 as a Spec. Consider whether TASK-01 (name-keyed
identity) should ride along, since the deterministic-id work already shipped to the
monolith overlaps with it.
