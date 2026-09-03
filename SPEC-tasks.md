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

### TASK-02: Port v2.4.x changes into the v3-modular version — when v3 is promoted
**Status:** Not started (noted Session 6, Sep 3 2026)
**Priority:** Low (only relevant if/when v3-modular becomes the served app)
**Type:** Sync / parity

**Context**
All Session 6 work (PWA layer, accessibility pass, Manage Users dedupe, tooltips/ARIA,
Manage Data reorder, icon unification, version bump) was applied to the **root
monolith only** (`ideaboard.html` + `app.js`). The `v3-modular/` copy is now behind
and does NOT have any of it. v3 migration is on hold (see SESSION-LOG Session 4), so
this is deliberately deferred — but it must be done before v3 could ship, or the two
versions will diverge.

**To port into v3-modular (map monolith changes onto the module/CSS structure):**
- PWA: add `manifest.json`, `sw.js`, icons + screenshots, and the `<head>` wiring
  (manifest link, theme-color, apple/mobile-web-app metas, SW registration) to
  `v3-modular/ideaboard.html`. Fix relative paths for the `v3-modular/` root.
- Accessibility: ARIA labels, `<main>` landmark, `role=button` + keyboard activation
  for stat cards, `aria-sort` on headers, label associations — these live across
  `rendering.js`, `modals.js`, `auth.js`, `bulk.js` and the HTML shell.
- Contrast tokens: mirror `--primary` / badge / `--text-light` changes in
  `styles/variables.css` and the badge rules in `styles/list.css` / `components.css`.
- Manage Users dedupe (`getDedupedUsers`, `idsForSameName`) → `auth.js` / `modals.js`.
- Manage Data category reorder + chips → `modals.js`.
- Icon unification (header `<img src="icon-192.png">`) → HTML shell + `layout.css`.
- Keep `APP_VERSION`, cache-buster, and SW `CACHE_VERSION` in sync across both.

**Recommendation**
When v3 is promoted, treat this as its own Quick Spec pass rather than a hurried copy,
verify Lighthouse 100 and offline behaviour on the v3 build the same way the monolith
was verified in Session 6.
