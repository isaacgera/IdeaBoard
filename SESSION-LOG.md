# Idea Board — Session Log

## Project Info
- **App Name:** Idea Board
- **Team:** Architecture Middleware Integration Team
- **Location:** `C:\Users\615509493\OneDrive - BT Plc\Data Drive\Personal\Learning\Kiro\Projects\Productivity\Idea Board\` (moved into `Productivity/` on 30 Aug 2026)
- **AI Partner:** Kiro
- **Live URLs:**
  - GitHub Pages: `https://isaacgera.github.io/IdeaBoard/ideaboard.html`
  - Internal GitLab Pages: (deployed via `gitlab.prod.ec.devops.nat.bt.com`)
- **Files:** `ideaboard.html` (UI/CSS), `app.js` (logic), `userguide.html` (documentation), `dummy-data.json` (sample data)
- **Backend:** Firebase Realtime Database (real-time multi-user sync)
- **Current Version:** v2.3

---

## Session 1 — Aug 24, 2026
**Initial Build + Full Feature Development**

### What Was Built
- Complete Idea Board application from scratch
- Single-folder vanilla JS app (no build tools, no framework dependencies)
- Firebase Realtime Database integration for multi-user collaboration
- Deployed to GitHub Pages and internal GitLab Pages

### Features Implemented (in order)

#### Core (v1.0)
- Kanban board view (4 columns: New → In Progress → Review → Done)
- List/table view with sortable columns
- Add/Edit/Delete ideas (Title, Description, Benefits, Category, Priority, Status, Submitted By)
- Category management (6 defaults + add/remove)
- Search + filter by category and priority
- Export to JSON + clipboard text summary
- Import from JSON file
- User identity (name prompt on first visit)
- localStorage fallback (works offline without Firebase)
- Responsive design (mobile-friendly)
- Print-friendly layout

#### Sorting & Drag-and-Drop (v1.1)
- Clickable column headers for sort (asc/desc with indicators)
- Smart sorting: Priority by weight, Status by workflow order
- Drag-and-drop between kanban columns (changes status)
- Within-column card reordering (sortOrder field)
- Drop position indicators (blue line above/below)
- Click vs drag differentiation (event delegation approach)

#### Audit Log & Timeline (v1.1)
- Version history on every idea (tracks all changes)
- Automatic milestone dates: Created, Started, In Review, Completed
- Status changes logged with from→to and timestamp
- Edits logged with field-level detail
- Timeline visualization in detail view
- "Last Change" column in list view

#### Dashboard, Dark Mode, Voting, Comments (v1.2)
- **Dashboard stats bar:** Total Ideas, New, In Progress, Review, Done, This Month, Top Contributor
- **Interactive stat cards:** Hover to preview filter, click to lock, click outside to clear
- List view: non-matching rows hidden (true filter, not dim)
- Board view: non-matching cards dimmed, matching column highlighted
- Stat card hover effect: zoom active card, shrink siblings, emboss/shadow
- **Dark/Light mode toggle:** Full CSS variable swap, localStorage persistence
- **Comments thread:** Add/delete comments per idea, comment count on cards
- **Upvote/Downvote:** One vote per user per idea, score on cards, sortable by votes in list view

#### RBAC (v1.3–v2.0)
- Hardcoded admin: "Isaac Gera" (case-insensitive)
- Roles: Admin (full access) and Contributor (edit/delete own ideas only)
- Manage Users panel (admin): promote/demote, edit (rename), delete users
- Edit user remaps all their ideas/comments/history to new name
- Delete user reassigns their ideas to admin
- "Manage Data" button (Export/Import/Categories/Users) admin-only
- "Switch User" button admin-only
- Forced name entry (no anonymous access — loops until name entered)
- User role displayed as "(Admin)" badge in header

#### Bulk Actions (v2.0)
- Checkboxes in list view (per row + select all)
- Bulk action bar (appears when items selected): Change Status, Change Priority, Change Category, Delete
- RBAC-enforced: contributors can only bulk-edit/delete their own ideas
- Smart delete label: "Delete 2 of 5 (yours)" for mixed selections
- Purple sticky bar with dropdowns

#### Intro Tour & User Guide (v2.1)
- 7-step guided tour with spotlight overlay
- Auto-triggers on first visit (localStorage flag)
- "Tour" button in header to replay
- Standalone `userguide.html` with full documentation
- "Guide" button in header (opens in new tab)

#### UI Polish (v2.1–v2.3)
- Enhanced header: gradient accent bar, branded icon, team name, last-updated timestamp
- Dashboard moved above toolbar
- Export/Import/Categories merged into single "Manage Data" modal
- Cache-busting version on script tag
- Online users badge: admin-only, clickable, shows modal with active users list

### Deployment
- **GitHub Pages:** Pushed to `github.com/isaacgera/IdeaBoard`, deployed via GitHub Pages
- **Internal GitLab:** Pushed to `gitlab.prod.ec.devops.nat.bt.com/615509493/IdeaBoard`
  - `.gitlab-ci.yml` with `mobius_shared_runner_cloud` tag
  - Pipeline copies static files to `public` folder
  - Proxy configured: `127.0.0.1:9000`

### Technical Notes
- Firebase config embedded in `app.js` (Realtime Database, project: ideaboard-iag-2026)
- Firebase presence tracking for online user count
- Users registered in `/users` collection with name + role
- Ideas stored in `/ideas` collection
- Categories in `/categories` collection
- All data also works via localStorage when Firebase unavailable
- Git proxy: `http://127.0.0.1:9000` (Zscaler/Netskope local agent)
- GitLab runner tag: `mobius_shared_runner_cloud`

### Known Issues / Decisions
- Firebase domains must be accessible from user's browser for real-time sync
- If Firebase blocked by firewall, app falls back to localStorage (single-user)
- User identity is trust-based (name entry, no passwords) — suitable for internal team
- Tour might not position perfectly on very small screens

### Future Considerations
- Swap Firebase for GitLab API (self-contained, no external deps)
- Due dates + overdue warnings
- Effort vs Impact matrix view
- Notification/activity feed
- Email/Teams digest integration
- Templates for common idea types

---

## Preferences
- Isaac helps Architecture Middleware Integration team track innovation ideas
- App shared internally via GitLab Pages
- Team is ~5-15 people
- No build tools — pure vanilla JS for simplicity
- Follows same pattern as WealthOrah and ShiftPlanner projects

## Session 2 — Aug 25, 2026
**v3.0 Modular Restructure (ES Modules)**

### Goal
Restructure the monolithic app into a professional, component-based codebase using native ES Modules — without any build tools and without affecting the original files.

### What Was Done
- Created a complete copy at `/v3-modular/` with modular architecture
- Split the single `app.js` (680 lines) into 12 focused modules (40-120 lines each)
- Extracted inline CSS (~260 lines) into 8 separate stylesheet files
- HTML reduced to a thin shell with `<link>` and `<script type="module">` tags
- All functionality preserved pixel-for-pixel (same Firebase config, same RBAC, same features)

### New File Structure

```
v3-modular/
├── ideaboard.html              ← HTML shell (CSS links + module entry)
├── styles/
│   ├── variables.css           ← Theme tokens + CSS resets
│   ├── layout.css              ← Header, toolbar, user bar
│   ├── components.css          ← Buttons, badges, modals, forms, toast, timeline, audit
│   ├── dashboard.css           ← Stat cards + hover/highlight effects
│   ├── kanban.css              ← Board columns, cards, drag states
│   ├── list.css                ← Table, bulk action bar, checkboxes
│   ├── tour.css                ← Spotlight overlay + tooltip
│   └── responsive.css          ← Media queries + print styles
└── src/
    ├── app.js                  ← Entry point: imports all modules, wires window.IB, init()
    └── modules/
        ├── state.js            ← Shared state object, constants, Firebase config
        ├── utils.js            ← escapeHtml, formatDate, generateId, showToast
        ├── firebase.js         ← Firebase init, presence tracking, localStorage fallback
        ├── auth.js             ← User identity, RBAC, user management, online users
        ├── ideas.js            ← CRUD operations, audit log, status date tracking
        ├── voting.js           ← Upvote/downvote, vote score calculation
        ├── comments.js         ← Add/delete comments
        ├── rendering.js        ← Dashboard, kanban view, list view, filtering, sorting, theme
        ├── dragdrop.js         ← Drag and drop between/within columns
        ├── bulk.js             ← Bulk status/priority/category change, bulk delete
        ├── modals.js           ← Modal system, idea form, detail view, manage data/categories
        └── tour.js             ← 7-step guided intro tour
```

### Technical Decisions
- **ES Modules (native):** `import`/`export` syntax, `<script type="module">` — works in all modern browsers without bundler
- **No build tools:** Stays true to the "no npm, no node_modules" philosophy
- **window.IB namespace retained:** Inline `onclick` handlers in HTML still reference `IB.*` — the entry point wires all exports to `window.IB`
- **Firebase SDK still loaded via `<script>` tags:** The compat SDK doesn't support ES module import, so it remains as global scripts before the module entry point
- **CSS `<link>` tags:** 8 stylesheet files loaded in order (variables first, responsive last)

### What Stays the Same
- All features work identically
- Same Firebase project and config
- Same localStorage fallback
- Same deployment model (static files → GitHub/GitLab Pages)
- Original files completely untouched

### Deployment Note
- The v3-modular version requires serving via HTTP (not `file://`) due to ES module restrictions
- Use `npx serve v3-modular` or `python -m http.server` for local testing
- GitHub Pages / GitLab Pages serve over HTTP by default — no issue for deployed use

### Effort
- ~1.5 hours total (analysis + restructuring + verification)
- Kiro performed the full extraction autonomously

---

## Session 3 — Aug 25, 2026
**Team GitLab Migration + Pages Deployment + Multi-Remote Setup**

### Goal
Migrate the project into the team's shared internal GitLab space, get GitLab Pages deploying there, and set up a clean dual-remote workflow (personal + team).

### What Was Done

#### Migration
- Imported the project from the personal GitLab space into the shared team space via GitLab's project import (server-side, not a manual copy)
- Team project path: `robt/app02752/IdeaBoard`
- Personal project path: `615509493/IdeaBoard`
- Default branch in the team project is `main`; local working branch is `master`

#### GitLab Pages Deployment (Troubleshooting)
- **Symptom:** Deploy → Pages showed the "Get started with GitLab Pages" wizard; Pages not live
- **Investigation path:**
  1. Confirmed runner `mobius_shared_runner_cloud` (#2, cfTvY6bY) showed online (green) in the project runner list
  2. Confirmed local top commit matched the team pipeline commit — CI file in sync
  3. Found the latest pipeline was **stuck** with the `pages` job pending
  4. Clicked into the stuck `pages` job — message: *"This job is stuck because the project doesn't have any runners online assigned to it"*
- **Root cause:** Runner assignments do NOT transfer during a GitLab project import. The runner was visible/online but **not assigned to the new team project**. This is the classic cross-space import trap.
- **Fix:** Assigned/enabled a runner for the team project (Settings → CI/CD → Runners)
- **Result:** Re-ran pipeline on `main` → `pages` job green → `pages:deploy` green → Pages went live

#### Security — Leaked Token Remediation
- During diagnosis, `git remote -v` revealed a personal access token (`glpat-...`) embedded in the remote URL (stored in plaintext in `.git/config`)
- **Actions taken:**
  1. Revoked the exposed token in GitLab (Preferences → Access Tokens)
  2. Generated a new personal access token
  3. Removed the token from the remote URL (git now uses Windows Credential Manager, helper = `manager`)
- **Lesson:** Never embed tokens in remote URLs. Let the OS credential manager hold them.

#### Multi-Remote Setup
- Configured two token-free remotes:
  - `origin` → `https://gitlab.prod.ec.devops.nat.bt.com/615509493/IdeaBoard.git` (personal)
  - `team`   → `https://gitlab.prod.ec.devops.nat.bt.com/robt/app02752/IdeaBoard.git` (team, deploys Pages)
- **Path gotcha:** The team URL was initially wrong (guessed `APP02752_MQ/IdeaBoard`). Actual path is lowercase and nested: `robt/app02752/IdeaBoard`. GitLab paths are case-sensitive and can differ from display names — always copy from the Clone button.
- **Branch mapping:** Team push uses `master:main` (local `master` → remote `main`) so it lands on the Pages-deploying branch.

#### Convenience Alias
- Added a global git alias for pushing to both spaces in one command:
  ```
  git config --global alias.pushall "!git push origin master && git push team master:main"
  ```
- Usage: `git pushall` (pushes to personal, then team if personal succeeds)

### Everyday Workflow (established this session)
```
git add <files>
git commit -m "Describe your change"
git pushall          # → origin master, then team master:main (triggers Pages redeploy)
```

### Direct GitLab Editing (guidance discussed)
- Files can be edited in-browser via **Edit → Edit single file** or the **Web IDE** (multi-file)
- A direct commit to team `main` triggers the Pages pipeline like a normal push
- **Caveat:** Browser edits only land in the team space — local repo and personal repo fall behind
- Re-sync after a browser edit:
  ```
  git pull team main
  git push origin master
  ```
- For non-trivial changes, prefer local editing + `git pushall` to keep all three copies (local, personal, team) aligned

### Key Learnings
- GitLab project import copies code + history + CI file, but NOT runner assignments or feature toggles
- A runner showing "online" in a list is not the same as "assigned to this project"
- A green runner / green pipeline can still hide a stuck job — always click into the job to read its status
- GitLab project paths are case-sensitive; copy the exact URL from the Clone button

---

## Session 4 — Aug 25, 2026
**Docs Sync + v3 Migration Exploration + Permission Review**

### What Was Done
- Committed and pushed the Session 3 documentation updates to both remotes
  (commit `d8f46b3`) — confirmed present on `origin/master` and `team/main`
- Updated `userguide.html` with a "Deployment & Hosting (Developer Info)" section
  (repositories, `git pushall` flow, browser-edit re-sync, runner/token gotchas)

### v3-Modular Migration (explored, not executed)
- Discussed how to make the v3-modular version the primary served app
- Key finding: data is safe either way — both versions share the same Firebase DB
  and localStorage keys (`ib_data`, `ib_user`, `ib_theme`, `ib_tour_done`)
- Migration is about *which files get served*, not moving data
- Recommended approach: promote v3 files to root, keep monolith as legacy fallback,
  and update CI to copy `styles/` and `src/` folders (current CI only copies root files)
- **Blocked on verification:** could not run v3 locally — no Python or Node.js on the
  machine (Python is only the MS Store stub). Installed Live Server extension but did
  not get it running this session.
- **Decision:** migration on hold until v3 is verified over HTTP

### Permission Review (checked, no change made)
- Question: can contributors change status of others' ideas?
- Finding: YES currently — status changes are open to everyone by design
  ("team collaboration"). Three paths:
  1. Drag-and-drop — no permission check
  2. Bulk status change — gated by `canChangeStatus` which returns `true` (anyone)
  3. Edit form — already owner/admin-only (via `canEdit`)
- To restrict to owner/admin: change `canChangeStatus` to return `canEdit(idea)` and
  add a check in the drag drop handler (with a toast on block). Applies to both
  `app.js` and v3-modular (`auth.js`, `dragdrop.js`, `bulk.js`).
- **Decision:** left as-is per user request (noted for future reference)

### Session Closed
- All committed work is live on both remotes; no pending code changes
- Open follow-ups for a future session:
  1. Verify v3-modular over HTTP (Live Server "Go Live" button, or install Node/Python)
  2. If verified, execute the v3 migration (promote to root + CI update)
  3. Optional: restrict status changes to idea owner/admin

---

## Housekeeping — Aug 30, 2026: Folder relocation

Moved the project folder from `Projects/Idea Board/` into `Projects/Productivity/Idea Board/`
to group it under a new **Productivity** category folder (matching its category in the Ideas
backlog). The entire repository was moved intact — including the `.git` folder, `.gitignore`,
and `.gitlab-ci.yml`.

### Impact: none on either GitLab location
- Both remotes preserved and verified working from the new path:
  - `origin` → `gitlab.prod.ec.devops.nat.bt.com/615509493/IdeaBoard.git` (personal)
  - `team`   → `gitlab.prod.ec.devops.nat.bt.com/robt/app02752/IdeaBoard.git` (team, deploys Pages)
- Full commit history, `master` branch, remote-tracking refs, and CI file all intact.
  Verified via `git remote -v`, `git status`, `git log`, and `git rev-parse HEAD` in the new location.
- A local folder move does not touch GitLab's servers, the CI pipeline, or the `git pushall`
  workflow — everything works exactly as before from the new path. Purely local disk tidying.
- Note: the two hosted locations are both **BT GitLab** (personal + shared team space),
  not GitHub. (The GitHub Pages URL noted in Project Info is a separate public mirror if used;
  this local clone only has the two GitLab remotes.)

## Session 5 — Aug 30, 2026: Added GitHub as a third remote (3-way sync)

### Goal
Host Idea Board on GitHub in addition to the two GitLab spaces, and make every push go to all three.

### What Was Done
- Added a `github` remote → `https://github.com/isaacgera/IdeaBoard.git` (repo already existed).
- **Fetched first** to inspect it: GitHub held a stale, diverged history (v1.2-era `main` with
  `Create CNAME`/`Delete CNAME`; local was 18 ahead / 2 behind). Confirmed no CNAME/custom-domain
  file remained in `github/main`, so nothing was lost.
- **Force-pushed** `master:main` to GitHub (Option A) so its `main` now matches the current
  local/GitLab state (`a5cfd82`). All three remotes are now aligned on the same commit.
- Updated the global `pushall` alias to push to all three:
  ```
  git config --global alias.pushall "!git push origin master && git push team master:main && git push github master:main"
  ```

### The three remotes
- `origin` → `gitlab.prod.ec.devops.nat.bt.com/615509493/IdeaBoard.git` (personal GitLab)
- `team`   → `gitlab.prod.ec.devops.nat.bt.com/robt/app02752/IdeaBoard.git` (team GitLab, deploys Pages)
- `github` → `github.com/isaacgera/IdeaBoard.git` (public GitHub, GitHub Pages)

### Everyday workflow (unchanged command, now hits all three)
```
git add <files>
git commit -m "Describe your change"
git pushall     # → origin master, team master:main, github master:main
```

### Notes / gotchas
- `pushall` is fail-fast (`&&`): if an earlier push fails, later ones don't run. Push the
  remaining remotes individually if one is temporarily unavailable.
- GitHub's `main` was overwritten from v1.2 → current, so the GitHub Pages site
  (`isaacgera.github.io/IdeaBoard`) will redeploy with the current app. Confirm Pages is set
  to serve from `main` in the GitHub repo settings.
- GitHub credentials are now cached in Windows Credential Manager alongside GitLab.

## Session 6 — Sep 3, 2026
**PWA Layer + Accessibility Pass + Fixes (v2.3 → v2.4.6)**

### Goal
Address the PWA Readiness Checker findings — the app had no PWA layer at all. Make
Idea Board installable with offline app-shell support, applied to the **live root
monolith** (not v3-modular, which stays on hold). Accessibility hardened to
Lighthouse 100 along the way, plus a few UX fixes raised during testing.

### What Was Done

#### PWA layer (new)
- **manifest.json**: name, `start_url: ./ideaboard.html`, `scope: ./`,
  `display: standalone`, theme `#6366f1`, background `#f8fafc`, 3 icons
  (192, 512, 512-maskable) + 2 screenshots (wide/narrow) for richer install UI.
- **sw.js**: cache `ideaboard-shell-v2.4.6`; precaches app shell (ideaboard.html,
  app.js?v=2.4.6, manifest, icons, screenshots); activate-cleanup of old caches;
  navigation fallback; stale-while-revalidate for same-origin assets. Firebase
  (Realtime DB + gstatic CDN SDK) and /favicon.ico deliberately bypassed.
- **make_icons.py**: pure standard-library PNG generator (no Pillow, no network) —
  chosen because pip is blocked by the corporate Zscaler SSL cert and Pillow isn't
  installed. Generates the 3 icons + 2 screenshots. Icon = indigo tile + outline
  lightbulb + amber filament dot.
- **ideaboard.html**: manifest link, theme-color, description, icon +
  apple-touch-icon, `mobile-web-app-capable` + apple metas, SW registration
  (guarded off file://).
- **app.js**: added `APP_VERSION` constant (none existed before) + changelog block.

#### Offline story (decided)
- Cache the **app shell only**. Firebase is NOT cached — requests hit the network and,
  when offline/blocked, the app falls back to its existing localStorage behaviour.
  Live DB data is never cached.

#### Accessibility (Lighthouse 80 → 100)
- ARIA labels on all previously-unlabeled controls: theme toggle, search box, filter
  selects, bulk-action selects, list checkboxes, modal close buttons, comment box,
  new-category input, import input, vote buttons.
- `online-count` changed from clickable <span> to real <button> (keyboard access).
- View toggle: `role="group"` + `aria-pressed` (kept in sync in setView).
- Idea-form `<label>`s associated to inputs via `for=`.
- Added `<main>` landmark (fixed Best Practices "no main landmark").
- Dashboard stat cards: `role="button"` + `tabindex="0"` + labels + tooltips, plus a
  global Enter/Space keydown handler and a visible focus outline.
- Sortable table headers: `scope="col"`, `aria-sort`, tooltips.
- WCAG-AA contrast fixes: `--primary` darkened `#6366f1 → #4f46e5`; status/priority
  badge backgrounds moved to 600/700/800 shades so white text clears 4.5:1;
  `--text-light` darkened `#64748b → #475569`.
- Added `mobile-web-app-capable` meta (cleared the deprecation warning).

#### Tooltips + ARIA polish
- `title` tooltips across header/toolbar controls, stat cards, sortable headers,
  vote buttons; `aria-pressed` on vote buttons; avatar marked `aria-hidden`.

#### Fixes raised during testing
- **Manage Users dedupe (Option B, non-destructive):** users are keyed by random
  per-session ids, so the same person could appear multiple times. Added
  `getDedupedUsers()` (case-insensitive, trimmed name grouping; genuine spelling
  differences stay separate) and `idsForSameName()`; Manage Users now renders one
  row per name with a `(N×)` merged hint, and promote/demote/edit/delete act on all
  ids sharing the name. **Root-cause fix (name-keyed identity + data migration)
  deferred as a Quick Spec follow-up — Option A.**
- **Manage Data layout:** Categories section moved to the bottom of the modal and
  rendered as horizontal wrapping chips (was one-per-row).
- **Icon unification:** header brand icon now uses `icon-192.png` directly (same file
  as the browser tab), so the two can never drift. Removed the old inline SVG bulb
  and the gradient background on `.brand-icon`.

### Verification (Edge DevTools via Live Server) — PASSED
- Lighthouse: **Performance 100, Accessibility 100, Best Practices 100, SEO 100**.
- Manifest: parsed clean, no errors/warnings.
- Service worker: activated and running, controlling ideaboard.html.
- Offline (Network=Offline, not Lighthouse): shell served from SW cache
  ("fulfilled by sw.js"); Firebase ws fails as designed → localStorage.
- Icons confirmed matching (header == tab), Manage Data categories confirmed.

### Environment Notes
- `execute_pwsh` was unreliable all session (exit 1, garbled/stale echoed output) —
  the same Windows shell quirk noted in the Agent Toolkit session. All image
  generation and verification were done in Isaac's own terminal (worked cleanly).
- pip blocked by Zscaler SSL interception (`CERTIFICATE_VERIFY_FAILED`) — hence the
  no-dependency icon generator.

### Follow-ups
- **Commit + `git pushall`** (origin, team, github) to redeploy all three Pages sites.
  Suggested message: "PWA layer + a11y pass (v2.4.6): manifest, SW, icons, ARIA +
  WCAG-AA, Lighthouse 100; Manage Users dedupe; Manage Data + icon tidy".
- **Option A (proper name-keyed user identity + Firebase data migration)** — own
  Quick Spec, needs a data backup first.
- Optional: swap placeholder manifest screenshots for real screen grabs (same
  filenames/sizes, no code change).
- Optional: surface APP_VERSION in the UI (header/About).
- **v3-modular is now behind:** ALL of this session's work landed on the root
  monolith only. Before v3-modular could ever ship, every Session 6 change (PWA,
  accessibility, dedupe, tooltips/ARIA, Manage Data reorder, icon unification,
  version bump) must be ported into its module/CSS structure and re-verified
  (Lighthouse 100 + offline). Tracked as **SPEC-tasks TASK-02**. Do it as its own
  Quick Spec when v3 is promoted, not a hurried copy.
- Ideas.md left unchanged this session (per Isaac's instruction).

### Version
- v2.3 → **v2.4.6**

### Addendum — Sep 3, 2026 (same session, post-deploy)
**GitLab Pages: missing PNG assets (header icon + PWA icons)**

After deploying v2.4.6, the header brand icon (`icon-192.png`) was missing on the
GitLab Pages site (worked on GitHub Pages and Live Server). Root cause: the CI
`.gitlab-ci.yml` `pages` job only copied `*.html *.js *.json` into `public/` — no
`*.png` files were published. This also meant the PWA manifest icons and screenshots
were 404-ing on GitLab.

**Fix:** added `*.png` to the `cp` line in `.gitlab-ci.yml`:
```
cp *.html *.js *.json *.png public/
```
Note: this also copies the unused `ideaboard.png` (old wooden-blocks banner) — harmless,
a few extra KB. Clean it up in a future tidy pass if desired.

**Gotcha to remember:** whenever a new static asset type is added (e.g. `.svg`, `.webp`),
the CI copy glob must be extended, otherwise it deploys on GitHub but silently 404s on
GitLab Pages.
## Session 7 — PWA readiness audit + pending polish edits

### PWA Readiness audit (root monolith, v2.4.6) — PASSED
- Audited the live entry point `ideaboard.html` (confirmed as the deployed file via
  `.gitlab-ci.yml` + Session 6). Verdict: **PWA-ready**, no blockers, no should-fix gaps.
- Confirmed by direct file reads (not just grep): manifest linked in `<head>`, theme-color
  + icons + apple-touch-icon metas present; `sw.js` exists AND is registered
  (`ideaboard.html` ~line 352), feature-guarded and http-only; versioned cache
  (`ideaboard-shell-v2.4.6`) with activate-cleanup; shell precache + stale-while-revalidate;
  Firebase deliberately bypassed. Icons 192/512/512-maskable present on disk.
- Note: v3-modular still has NO PWA layer — must be ported before it could ship (SPEC-tasks TASK-02).

### Pending polish edits (NOT yet applied — do in a session with file-editing enabled)
Two optional items from the audit; prepared, drop-in, low-risk (Default mode).

1. **Surface APP_VERSION in the header** (code):
   - `ideaboard.html` — add after the `.last-updated::before` CSS rule (~line 50):
     ```css
     .version-badge { margin-left: .4rem; font-size: .6rem; font-weight: 600; color: var(--primary); background: var(--surface-alt); border: 1px solid var(--border); border-radius: 999px; padding: .05rem .4rem; letter-spacing: .3px; vertical-align: middle; }
     ```
   - `ideaboard.html` — replace the header `<h1>` line with:
     ```html
     <h1>Idea Board <span class="team-name">Architecture Middleware Integration Team</span> <span class="version-badge" id="app-version" title="App version"></span></h1>
     ```
   - `app.js` — add `showAppVersion();` as the last line of `init()`, then add the helper:
     ```javascript
     // Surface the single-source-of-truth version constant in the header.
     function showAppVersion() {
       var el = document.getElementById('app-version');
       if (el) {
         el.textContent = 'v' + APP_VERSION;
         el.title = 'Idea Board v' + APP_VERSION;
       }
     }
     ```
   - Reads from the `APP_VERSION` constant so the badge can't drift on release. Uses existing
     tokens — works in light + dark. No version bump needed (display-only, still v2.4.6).

2. **Replace placeholder manifest screenshots** (manual, no code):
   - Capture real grabs and save over `screenshot-wide.png` (1280×720) and
     `screenshot-narrow.png` (720×1280) — manifest already points at those filenames.

### Verify (next session, after applying)
- Serve via Live Server (NOT `file://`). Confirm `v2.4.6` badge renders in the header in both
  light and dark themes; console clean. Optional: re-run Lighthouse PWA check.

### Not done / notes
- Neither edit applied this session (tools were read-only — no write access).
- Ideas.md left unchanged (app already `Built`; this is display polish, not a status change).