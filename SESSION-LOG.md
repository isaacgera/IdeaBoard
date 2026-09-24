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
- **Current Version:** v2.5.0 (shipped — verified, icons regenerated, git pushall done to all three remotes)

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


## Session 8 — Sep 4, 2026
**Applied the version badge (Session 7 pending item 1) + deployed**

### Goal
Apply the first of the two Session 7 pending polish items — surface the `APP_VERSION`
constant in the header — now that file-editing tools were available. Default mode,
display-only, no version bump (stays v2.4.6).

### What Was Done (3 drop-in edits, exactly as prepped in Session 7)
- **`ideaboard.html`** — added the `.version-badge` CSS rule after `.last-updated::before`
  (uses existing tokens: `--primary`, `--surface-alt`, `--border` — so it themes cleanly
  in light + dark). Added `<span class="version-badge" id="app-version" title="App version">`
  to the header `<h1>`, just after the `.team-name` span.
- **`app.js`** — added `showAppVersion();` as the last line of `init()`, plus the helper
  that writes `'v' + APP_VERSION` into `#app-version` (and its title). Reads from the
  single-source-of-truth constant so the badge can't drift from the real version on release.

### Verification
- Isaac confirmed and then committed + pushed (`git pushall` → origin, team, github),
  redeploying all three Pages sites. Browser eyeball of the badge was done on Isaac's side
  (Live Server) — Kiro can't run a browser here (known Windows shell quirk).

### Version
- Unchanged: **v2.4.6** (display-only change).

### Still pending (carried forward)
- **Session 7 item 2:** replace placeholder manifest screenshots with real grabs
  (`screenshot-wide.png` 1280×720, `screenshot-narrow.png` 720×1280) — manual, no code.
- **Option A:** proper name-keyed user identity + Firebase data migration (own Quick Spec,
  needs a data backup first).
- **TASK-02:** port ALL Session 6 + this badge change into v3-modular before it could ship,
  then re-verify (Lighthouse 100 + offline).
- Ideas.md unchanged (app already `Built`; this was display polish, not a status change).


## Session 9 — Sep 11, 2026
**Entra ID (Azure AD) sign-in gate — PROTOTYPE build**

### Goal
Restrict access to the BT GitLab-hosted Idea Board so only verified + authorized BT
users can open it, via Azure AD / Microsoft Entra ID. Built as a **prototype first**
(per the prototype-first workflow) — nothing touched the live app. Quick Spec mode.

### Decisions locked (agreed up front)
1. **Authorized subset**, not just "any signed-in user". Real enforcement is intended
   to be Entra-side ("Assignment required" + assigned users/groups); the app also has a
   secondary app-side allow-list for a clean "Access denied" screen (UX gate, not a hard
   boundary on its own).
2. **Redirect URI:** `https://pages.gitlab.prod.ec.devops.nat.bt.com/ideaboard-c706fb/ideaboard.html`
   — registered as **Single-page application** platform (confirmed by Isaac).
3. **Firebase DB lockdown = out of scope for now.** This gate protects the APP (who can
   open the page), NOT the raw Firebase Realtime DB (rules still open — someone hitting the
   DB URL directly is unaffected). Noted as a future phase. Isaac confirmed data not
   sensitive for now.
4. **Prototype first**, then port to live once it proves out on the real BT URL.

### Architecture / approach
- **MSAL.js** (browser, `msal-browser 2.38.3` from Microsoft CDN), **public-client PKCE
  flow** — no client secret anywhere (correct + required for a static SPA; keeps secrets
  discipline). Client ID + Tenant ID are not secrets and live in the config file.
- **Host-conditional gate:** auth engages ONLY on gated hosts (the BT GitLab origin).
  On `file://`, `localhost`/Live Server, and the public GitHub copy the app stays open, so
  the same codebase runs everywhere. localhost deliberately LEFT OUT of the gated list, so
  local prototype testing stays friction-free (no login) — agreed with Isaac.
- **Boot flow:** app no longer self-boots. `app-proto.js` exposes `window.IB_startApp()`;
  the gate (`auth.js`) calls it only after a verified + authorized sign-in on gated hosts,
  or immediately on ungated hosts. Fails **closed** if MSAL can't load or config is unset.
- **Identity wiring:** on a gated host, `loadUser()` seeds the current user from the
  verified token (name + UPN, stable id from `oid`/`sub`) instead of the name prompt.
  Off-gate it keeps the original prompt so the sandbox still works offline.

### Files created — all under `Productivity/Idea Board/prototypes/`
- `ideaboard.html` — faithful copy of the live monolith + striped **PROTOTYPE** banner,
  the sign-in gate overlay (`#auth-gate` + `.auth-*` styles), MSAL CDN script, a
  host-conditional **Sign out** button, points at `app-proto.js`.
- `app-proto.js` — copy of `app.js` (v2.4.6) with THREE changes: (1) localStorage keys
  namespaced `ibproto_*` (isolated from live `ib_*` data); (2) gate-controlled boot via
  `IB_startApp()` (guarded run-once); (3) token-seeded identity in `loadUser()`.
  Version constant tagged **`2.5.0-proto`**.
- `auth.js` — the MSAL gate: init → `handleRedirectPromise` → sign-in / authorize / boot,
  with clean **Sign in**, **Access denied**, and **Sign-in problem** screens. Authorization
  logic: empty lists = any tenant user; else match Entra group-id (`groups` claim) OR
  user UPN/email (case-insensitive).
- `auth-config.js` — the single edit point. Now populated:
  - `clientId: 5dfd62e6-5070-401e-b91c-e433387c07ae`
  - `tenantId: a7f35688-9c00-4d5e-ba41-29f146377ab0`
  - `redirectUri` = the BT GitLab URL above
  - `allowedUsers: ['isaac.2.gera@bt.com']` (prototype verification — single user)
  - `gatedHosts: ['pages.gitlab.prod.ec.devops.nat.bt.com']` (localhost left out)
- `manifest.json` — proto-named PWA manifest.
- `sw.js` — proto SW; cache namespaced `ideaboard-proto-shell-v2.5.0-proto`; precaches
  `app-proto.js` + auth files; MSAL CDN + Entra login endpoints bypassed like Firebase.
- Icons `icon-192/512/512-maskable.png` copied in from the parent folder.

### Verification done here
- **Static diagnostics clean** on all four source files (no syntax/lint issues).
- Prototype folder confirmed to contain all 9 files.
- **Not** run in a browser here — a real Microsoft sign-in can't be completed on this
  machine (known Windows shell quirk + no interactive browser). Live sign-in test is
  Isaac's to run on the BT URL.

### How to test (handed to Isaac)
- **Level 1 — Live Server (local):** gate stays OFF (localhost ungated). Confirms the app
  works in the sandbox — expect PROTOTYPE banner, the name prompt (not sign-in), working
  board, and `ibproto_*` keys in DevTools (proves data isolation). No Sign out button.
- **Level 2 — BT GitLab URL (the real test):** deploy the `prototypes/` folder so it serves
  at the registered redirect URI, open in incognito. Expect: banner → "Sign in with
  Microsoft" → sign in as `isaac.2.gera@bt.com` → board loads with real name + Sign out.
  Any other BT account → "Access denied" screen. Watch for `AADSTS…` errors (redirect-URI /
  platform mismatch) and console messages if sign-in loops.
- Caveat flagged: the app-side allow-list matches the token UPN/username/email; if Isaac's
  real sign-in UPN differs from `isaac.2.gera@bt.com`, the deny path may trigger for him —
  report the exact UPN shown and the list gets adjusted.

### Status / follow-ups
- **Prototype only — live app untouched.** No version bump on the live app (stays v2.4.6);
  the proto carries `2.5.0-proto`.
- After Isaac verifies sign-in on the BT URL: port the finalized auth into the live
  `ideaboard.html` + `app.js` in one pass, then do release chores (version bump, changelog,
  PWA cache bump, docs, Ideas backlog sync). v3-modular port remains separate (TASK-02).
- **Future phase (flagged, not scoped):** server-enforced lockdown of the Firebase DB so the
  gate is a real boundary on the data, not just the UI.
- Ideas.md left unchanged (app already `Built`; this is prototype work in progress on a
  shipped app, not a status change — per Isaac).
- Carried-forward items from Session 8 still open (manifest screenshots, Option A name-keyed
  identity, TASK-02 v3 port).


### Session 9 — Addendum (same session, post-test)
**Level 2 Entra sign-in test: PASSED. MSAL CDN fix. Option B swap + restore.**

#### Level 2 test result — PASSED
- Deployed the prototype to the live BT GitLab Pages URL via **Option B**
  (temporary CI swap: `cp prototypes/*.html prototypes/*.js ...`).
- First attempt: gate engaged correctly but showed **"Sign-in problem: The
  sign-in library could not be loaded."** The fail-closed behaviour worked
  (board not exposed), but the MSAL library from `alcdn.msauth.net` was blocked
  by the corporate proxy (Zscaler SSL interception — the same issue that
  blocks pip).
- **Fix:** bundled MSAL locally. Isaac downloaded `msal-browser.min.js`
  (v2.35.0, ~370 KB) via his browser (which handles the proxy), saved into
  `prototypes/`. HTML changed from CDN `<script>` to local file. SW precache
  updated. The `*.js` CI glob publishes it automatically.
- Second attempt after re-deploy: **full pass.** PROTOTYPE banner → "Sign in
  with Microsoft" → BT/Microsoft login → redirect back → board loaded with
  verified identity **"Isaac Gera (QVB C)"** from the token, Sign out button
  present. App-side allow-list (`isaac.2.gera@bt.com`) matched, authorization
  passed.

#### Colleague added to allow-list
- Added `srinivas.ballem@bt.com` to `allowedUsers` in `auth-config.js` so
  Srinivas Ballem can test the sign-in gate too.

#### Live app restored
- Reverted `.gitlab-ci.yml` back to `cp *.html *.js *.json *.png public/`
  (live app at root). Pipeline re-deployed. Confirmed live Idea Board back at
  the BT URL: v2.4.6 badge, no gate, no PROTOTYPE banner, full board working,
  Firebase presence showing 2 online.

#### Key learnings (carry forward)
- **MSAL CDN (`alcdn.msauth.net`) is blocked by Zscaler** on the BT network.
  Any production deployment of the auth gate must bundle MSAL locally, not load
  from CDN. The `msal-browser.min.js` file in `prototypes/` is the proven copy.
- **`login.microsoftonline.com` IS reachable** — the sign-in redirect works fine.
  Only the library CDN is blocked, not the auth endpoint itself.
- **Option B (temporary swap) works** but is disruptive — the live app goes
  offline for the team during the test. For future prototype testing, Option A
  (separate project + second redirect URI) or Option C (localhost redirect URI)
  is preferred if admin support is available.
- The app registration's redirect URI (`pages.gitlab.prod.ec.devops.nat.bt.com/
  ideaboard-c706fb/ideaboard.html`) maps to the `robt/app02752/IdeaBoard` team
  project's Pages — confirmed via Deploy → Pages.

#### Prototype files remain in `prototypes/` (12 files)
`ideaboard.html`, `app-proto.js`, `auth.js`, `auth-config.js`,
`msal-browser.min.js`, `manifest.json`, `sw.js`, `userguide.html`,
`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`,
`SWAP-INSTRUCTIONS.md`.

#### Next steps (carried forward from Session 9 main + this addendum)
- **Port auth gate to live app** — when ready, fold the Entra gate into the
  real `ideaboard.html` + `app.js`. Release chores: version bump (v2.5.0),
  changelog, PWA cache bump, docs. Remember to bundle MSAL locally (not CDN).
- **Decide the real authorized-subset mechanism** — Entra-side assignment
  (admin-managed group) vs app-side allow-list vs both. Recommendation: Entra
  "Assignment required" as the real boundary, app-side list as UX backup only.
- **Firebase DB lockdown** — future phase; the gate currently protects the UI
  only, not the raw database.
- Carried-forward: manifest screenshots, Option A name-keyed identity,
  TASK-02 v3 port.


## Session 10 — Sep 15, 2026
**RBAC fixes in the prototype: sticky promoted-admin roles + no duplicate users (Quick Spec, PROTOTYPE only)**

### Goal
Two RBAC bugs observed on the board, fixed in the prototype (`prototypes/app-proto.js`)
only — to be ported to live alongside the Entra auth gate in one deliberate pass later.
Live app (`app.js`, root `ideaboard.html`) untouched; no version bump on the live app.

### Decisions locked (agreed up front)
- **DB is the source of truth for roles**, not code. The hardcoded `ADMIN_NAMES` is
  reduced to a *first-admin bootstrap seed* (mints the first admin only when a user has
  no stored record yet); once a role is stored, the DB wins. This is the safe way to
  "remove the hardcoded part" without a no-admin lockout.
- **Stable, deterministic user ids** to stop duplicate records at the source
  (root cause of the Session 6 dedupe workaround).
- **Firebase stays** (explicitly, for now). Isaac raised the external-dependency concern
  but decided to keep Firebase — live multi-user sync is needed and Firebase isn't blocked
  on the BT network. See parked note below.

### What was changed (all in `prototypes/app-proto.js`)
**Fix 1 — promoted admin rights now persist; hardcoded dependency removed**
- `isAdmin()` reads the stored role from `state.users[currentUser.id]` as the source of
  truth; falls back to the bootstrap seed only when there's no record yet.
- `registerUser()` now **reads the existing record before writing** and preserves the
  stored role, instead of recomputing from the name list and `.set()`-clobbering it.
  *This was the actual bug:* the promoted user's own client silently downgraded itself
  back to `contributor` on every reconnect.
- `ADMIN_NAMES` demoted to a bootstrap seed; added `BOOTSTRAP_ADMIN_UPNS` so the first
  admin can be seeded by verified Entra UPN on the gated host (lets us drop the name seed
  later with no lockout risk). New helper `isBootstrapAdmin()`.
- **Last-admin guard:** `demoteUser()` (and the Manage Users UI) refuse to demote the
  final admin — button becomes a "(last admin)" note. New helpers `adminNameCount()`,
  `groupRoleForId()`.

**Fix 2 — no duplicate user records**
- Deterministic ids: `entra_<oid>` on the gated host, `local_<name-slug>` on the local
  prompt path. Re-entering the same name reuses the same record. New helpers
  `slugifyName()`, `localIdForName()`; `promptUser()` and `changeUser()` updated.
- `getDedupedUsers()` kept as a safety net for legacy duplicates; the `(N×)` merged hint
  removed from Manage Users since new activity is clean.
- Manage Users intro text + row rendering updated (self "(you)" marker, admin-count-aware
  demote button); no longer treats the seed name as an unmodifiable "hardcoded" row.

### Verification
- Static diagnostics clean on `app-proto.js`.
- **Not** browser-tested here (known Windows shell quirk — no browser / no real Microsoft
  sign-in on this machine). Test script handed to Isaac (local Live Server path + gated
  BT-URL path with a promoted colleague). Testing in progress.

### Observation during testing (follow-up, not a bug)
- With a **contributor** identity ("Test One"), the **Switch User** button is hidden —
  by design, it's admin-only (`render()` gates it on `isAdmin()`). Workarounds for local
  testing: sign in as the seed name "Isaac Gera", or clear the `ibproto_user` localStorage
  key between name changes.
- **Follow-up to consider at the live port:** the whole Switch-User / name-prompt mechanism
  is a pre-auth leftover. On the live gated app, identity comes from the Microsoft sign-in
  (no name switching), so the button is only a local-testing / admin convenience now.
  Decide at port time whether to keep, hide, or remove it under the auth gate.

### Parked (own task, not now)
- **Rethink the Firebase external dependency.** Live multi-user sync is required, so a pure
  localStorage or git-as-datastore approach won't fit; a Supabase-style backend would only
  swap one external dependency for another. Only a self-hosted realtime option truly
  removes the external factor — a bigger project. Revisit in Plan mode if it resurfaces.

### Status / carried-forward
- Prototype only — live app untouched. Port these RBAC fixes **with** the Entra auth gate
  to live in one pass (then release chores: version bump v2.5.0, changelog, PWA cache bump,
  docs, Ideas backlog sync). Remember to bundle MSAL locally (not CDN) on the live port.
- Still open from earlier sessions: manifest screenshots; TASK-02 v3-modular port.
- `Ideas.md` unchanged (app already `Built`; this is prototype work on a shipped app,
  not a status change).


### Session 10 — Addendum (same session): ported RBAC fixes to LIVE (v2.4.7) + Add User in prototype

#### RBAC fixes ported to the live app (v2.4.6 -> v2.4.7)
- After local verification of the prototype (sticky promoted-admin roles + no
  duplicate users, both confirmed on Live Server, incl. a promote chain
  seed -> Test One -> another user), the two fixes were ported into the **live**
  files. Entra auth gate deliberately NOT ported yet (waits for the gated BT-URL test).
- Files changed:
  - `app.js`: DB-as-source-of-truth roles (`isAdmin` reads stored role;
    `isBootstrapAdmin()` helper), `registerUser()` reads-then-preserves the stored
    role (the actual promotion bug), `ADMIN_NAMES` demoted to a bootstrap seed +
    empty `BOOTSTRAP_ADMIN_UPNS` placeholder for the later auth port, deterministic
    `local_<slug>` ids (`slugifyName`/`localIdForName`) in `promptUser`/`changeUser`,
    last-admin demote guard (`adminNameCount`/`groupRoleForId`), Manage Users cleanup
    (no `(N×)` hint, self "(you)" marker, seed name now manageable). `APP_VERSION` ->
    `2.4.7` + changelog entry.
  - `sw.js`: cache `v2.4.6` -> `v2.4.7`, precache `app.js?v=2.4.7`.
  - `ideaboard.html`: script tag `app.js?v=2.4.7`.
- Diagnostics clean. **Verified locally on Live Server** (badge shows v2.4.7, admin
  controls present, users list clean, no console errors). NOTE: local Live Server hits
  the REAL shared Firebase DB, so the definitive "promotion sticks across reconnect"
  test is still the multi-machine gated one.
- **NOT committed / NOT pushed** — all three deployed sites still on v2.4.6. `git pushall`
  is Isaac's to run when ready.
- Migration note: existing live users have random ids; after this change, re-entering a
  name creates a new `local_<slug>` record and the old random-id record lingers until an
  admin deletes it (dedupe collapses them in the display meanwhile). Not data loss — a
  one-off Manage Users cleanup tidies it.

#### Add User (Manage Users & Roles) — built in PROTOTYPE only
- Requested by Isaac as an extra way to grant access / pre-assign roles and for testing.
- Added `addUser()` (admin-only) to `prototypes/app-proto.js` + an "Add User" section in
  the Manage Users modal (name field + Contributor/Admin dropdown + Add). Creates the
  record under the deterministic `local_<slug>` id so the role links up when that person
  enters the exact name locally; if the name already exists it updates the role instead of
  duplicating; blank names rejected. Modal note explains it's mainly for local/testing +
  pre-assigning, since on the gated board real access is governed by sign-in + allow-list
  (a real user's id is `entra_<oid>`, unpredictable from a name).
- `IB.addUser` exposed. Diagnostics clean. **Verified on Live Server (prototype).**
- Add User is prototype-only for now — decision pending whether to port it to live on its
  own or bundle it with the Entra auth gate port (Isaac leaning: bundle with auth port).

#### Outstanding decisions / next steps
- Ship v2.4.7 live fixes (Isaac to `git pushall` to origin/team/github).
- Port Add User + Entra auth gate to live together after the gated BT-URL test passes
  (bundle MSAL locally, not CDN; release chores: version bump to v2.5.0, changelog, PWA
  cache bump, docs, Ideas backlog sync).
- Ideas.md unchanged (app already `Built`; still prototype/iteration work on a shipped app).


### Session 10 — Addendum 2 (same session): self-delete guard + Add User ported to LIVE (v2.4.8)

#### Self-delete guard (bug found during testing)
- Isaac observed: an admin could delete their OWN account, which stripped their role
  and then every further action complained "Admin required" (a promoted admin lost admin
  entirely; the bootstrap seed limped on via isBootstrapAdmin but had wiped its own record).
- Fix (built + verified in prototype first): `isSelfUser()` helper; `deleteUser()` blocks
  self-deletion with a toast; the Delete button is hidden on the admin's own row in Manage
  Users. Edit still allowed on self.
- Edge case confirmed by Isaac: delete all OTHER admins, then try to self-demote -> blocked
  by the existing last-admin guard ("Cannot demote the last admin"). The invariant holds:
  you cannot lock the board out of admin via self-delete, last-admin demote, or
  delete-others-then-self-demote.

#### Add User + self-delete guard ported to live (v2.4.7 -> v2.4.8)
- Scope agreed: port **Add User** + **self-delete guard** now; **HOLD the Entra auth gate**
  for a future v2.5.0 (after the gated BT-URL test). Version reserved: v2.5.0 = Entra release.
- Files changed:
  - `app.js`: added `addUser()` + `IB.addUser` + the Add User section in Manage Users
    (name + Contributor/Admin dropdown + note); `isSelfUser()` + self-delete block in
    `deleteUser()` + Delete hidden on own row. `APP_VERSION` -> `2.4.8` + changelog.
  - `sw.js`: cache `v2.4.7` -> `v2.4.8`, precache `app.js?v=2.4.8`.
  - `ideaboard.html`: script tag `app.js?v=2.4.8`.
- Diagnostics clean. **Verified on Live Server** (badge v2.4.8, Add User works incl.
  dedupe-on-existing-name + blank-name reject, own-row Delete hidden, no console errors).
- Reminder: local Live Server hits the REAL shared Firebase DB — test with throwaway names.

#### Status
- **NOT committed / NOT pushed yet.** Live sites still on v2.4.6 until Isaac runs `git pushall`
  (origin, team, github) to redeploy all three Pages sites. v2.4.7 and v2.4.8 will ship together
  in that one push.
- Prototype now also carries Add User + self-delete guard + the Entra auth gate; the gate is the
  only remaining prototype-only piece, to be ported as v2.5.0 after the multi-machine gated test.
- Ideas.md unchanged (app already `Built`).


### Session 10 — Addendum 3 (same session): personal GitLab Pages branch drift + pushall fix

#### Symptom
After deploying v2.4.8, the **personal** GitLab Pages site showed neither the new version
badge nor the header icon, while **team** and **github** both showed v2.4.8 correctly.
Deploy -> Pages on the personal project showed a deployment timestamp ~1 week old.

#### Root cause
The `.gitlab-ci.yml` `pages` job only runs on the default branch
(`rules: if $CI_COMMIT_REF_NAME == $CI_DEFAULT_BRANCH`). The personal project's Pages
builds from **`main`**, but the old `pushall` alias pushed personal as `git push origin master`
(local `master` -> remote `master`). So personal's `main` never moved and Pages never
redeployed — it had been drifting for about a week. Team and github were fine because their
legs already pushed `master:main`.

#### Fix
- Isaac merged `master` into `main` on the personal GitLab project; the latest changes
  (v2.4.8) then showed on the personal Pages site.
- Reconciled locally: `git fetch origin` + `git merge origin/main` (conflicts resolved,
  concluded with `git commit --no-edit`). Verified `git show HEAD:app.js` still reports
  `APP_VERSION = '2.4.8'` — merge kept the correct content.
- Updated the global alias so ALL three legs push `master:main` (personal now matches team
  + github):
  ```
  git config --global alias.pushall "!git push origin master:main && git push team master:main && git push github master:main"
  ```
- First `git pushall` after reconciling returned "Everything up-to-date" on all three (the
  merge commit was already on the remotes) — so this doc change is the test commit to prove
  the new `origin master:main` leg deploys personal Pages.

#### Follow-ups
- Confirm this push triggers a fresh personal Pages pipeline on `main` (green) with a
  current timestamp, and all three sites still show v2.4.8.
- Optional tidy: delete the now-unused personal remote `master` branch
  (`git push origin --delete master`) once the alias is proven — nothing relies on it.
  Local `master` stays as the working branch.

#### Lesson (carry forward)
When adding a remote, make sure the `pushall` leg targets the branch that remote's Pages
actually builds. A push that "succeeds" can still leave Pages stale if it lands on the
wrong branch (this is a cousin of the Session 3 runner-assignment trap).


#### Resolution confirmed
- Verified `git pushall` pushes `master -> main` on all three remotes in one command
  (personal, team, github) — commit `799929a`.
- Personal remote `master` branch deleted (redundant; `main` holds the full history,
  nothing relied on it). Local `master` remains the working branch.
- Final end-to-end push test done to confirm the flow works with `master` gone.


### Session 10 — Addendum 4 (same session): decision — do NOT port the Entra gate to live

#### Decision
The Entra ID (Azure AD) sign-in gate will **not** be ported to the live app. It stays in
`prototypes/` as the proven reference implementation. Live app remains at **v2.4.8**; the
reserved **v2.5.0** for the Entra release is shelved (not cancelled — available if ever needed).

#### Why
- **Purpose already met.** The goal of the Entra work was to learn how to configure and
  integrate Entra ID for a static SPA — that succeeded and was verified end-to-end
  (multi-machine sign-in on the real BT URL, local MSAL bundling to dodge the Zscaler CDN
  block, app-side allow-list, fail-closed behaviour).
- **Access is already solved better for this app.** The live board is served from the
  team GitLab space, which is behind **SAML**, and access is further restricted to an
  **authorized subset via a team-space group**. So the Entra gate would be a third
  overlapping access layer — a second sign-in + ongoing maintenance for no access-control
  gain.
- The one unique benefit the gate would add beyond access — a **verified identity inside
  the app** (real name/UPN + stable `entra_<oid>` id, which strengthens the RBAC work) —
  isn't worth forcing a second sign-in on top of SAML. Parked as a "someday, maybe": if it
  ever matters, first check whether GitLab passes any identity through to the static page
  before reaching for MSAL again.

#### State
- Prototype (`prototypes/`) keeps the full, working Entra gate (auth.js, auth-config.js,
  local msal-browser.min.js, gate overlay, host-conditional boot) as a reusable pattern for
  future apps that genuinely need app-level sign-in.
- Live app: no auth-gate code, boots normally; RBAC fixes + Add User + self-delete guard
  (v2.4.8) are live and deployed on all three sites.
- Ideas.md unchanged (app already `Built`).


### Session 10 — Addendum 5 (same session): v3-modular migration plan captured

Isaac flagged the v3-modular migration as a near-future session and asked for a plan.
Captured the full phased plan in **SPEC-tasks.md TASK-02** (rewritten + upgraded from the
old Session 6 note to Medium priority):
- **Phase 0:** confirm the "why" (v3's benefit is maintainability, not features) in Plan mode.
- **Phase 1:** feature-parity port — bring v3 up from its frozen ~v2.3 state to live v2.4.8
  (PWA layer, a11y/Lighthouse 100, version badge, Manage Users dedupe, RBAC fixes,
  Add User, self-delete guard), verifying function-by-function against the monolith.
- **Phase 2:** verify over HTTP (ES modules can't run on file://; was the Session 4 blocker,
  now unblocked via Live Server) — Lighthouse 100 + offline + Firebase + feature match.
- **Phase 3:** promotion — swap served files; **update `.gitlab-ci.yml` to recurse `src/` +
  `styles/`** (else 404 on GitLab Pages); keep monolith as fallback; release chores (v3.0.0).
- **Phase 4:** data safety — same Firebase DB + `ib_*` keys, no data migration needed; back up first.

Confirmed on disk this session: v3-modular structure intact (12 modules in `src/modules/`,
8 stylesheets in `styles/`, HTML shell) but stale. Treat the migration as a **Spec**, not a
Default tweak. Possible to fold TASK-01 (name-keyed identity) into it since the
deterministic-id work already shipped to the monolith overlaps.


### Session 10 — Addendum 6 (same session): v3 migration direction confirmed by Isaac

Isaac confirmed the approach for TASK-02:
- **v3-modular IS the way forward** — the app will keep evolving, so the maintainability
  payoff is worth it. Phase 0 ("is it worth it?") is effectively decided: YES.
- **Do the feature-parity port FIRST** — bring v3 into sync with live v2.4.8 (Phase 1),
  keeping both in step.
- **Test the synced v3 before promoting** — likely as a prototype / HTTP-served build
  (Phase 2), since ES modules need HTTP not file://.
- **Only then promote** v3 to become the main served version (Phase 3), with the CI
  folder-copy fix + release chores.

So the running order is locked: parity port -> test -> promote. Treat as a Spec when picked up.


## Session 11 — Sep 17, 2026
**Documentation version sync (userguide + session-log header)**

### Goal
Isaac spotted that the app was at v2.4.8 but the user guide (and possibly other docs)
still showed an older version. Carried out a careful sweep for stale version references
and brought the docs back in line. Default mode — docs only, no app code touched, no
version bump.

### What was checked (whole Idea Board folder)
| File | State found | Action |
|---|---|---|
| `app.js` (`APP_VERSION`) | `2.4.8` | source of truth — correct |
| `sw.js` (cache + `?v=` queries) | `v2.4.8` | correct |
| `ideaboard.html` (badge is dynamic via `APP_VERSION`; `app.js?v=2.4.8`) | `2.4.8` | correct |
| `SPEC-tasks.md` | references `v2.4.8` | correct |
| `SPEC-requirements.md` | `v2.4.x` / "verified Lighthouse 100 at v2.4.6" | historical facts — left as-is |
| `overview.html`, `README.md`, `manifest.json` | no version field | nothing to change |
| **`userguide.html`** | **badge + footer said `v2.4.6`** | **stale — fixed** |
| **`SESSION-LOG.md`** Project Info | **`Current Version: v2.3`** | **stale — fixed to v2.4.8** |

### Changes made
- **`userguide.html`**
  - Header version badge `v2.4.6` -> `v2.4.8`.
  - Footer `Idea Board v2.4.6 / v3.0-modular` -> `v2.4.8`.
  - Documented the v2.4.8 **Add User** admin feature (pre-add a user by name + role) in the
    User Management section, and added the sticky-admin / no-self-delete guard notes.
  - Roles & Permissions table: "Manage users (promote/demote/rename/delete)" ->
    "(add/promote/demote/rename/delete)".
  - Left the v3-modular comparison table's "Original (v2.3)" as-is — it's a correct
    historical statement (v3 was forked from v2.3-era code).
- **`SESSION-LOG.md`** — Project Info `Current Version` field `v2.3` -> `v2.4.8`.

### Verified
- Grep confirms no `2.4.6` references remain in `userguide.html`.
- Changes are docs-only; app code, manifest, and SW untouched — nothing to deploy beyond
  the doc files themselves whenever the next `git pushall` runs.

### Notes
- Ideas.md unchanged (app already `Built (v2.4.8)`; this is a doc-sync, not a status change).
- v3-modular userguide/docs not touched — v3 is still frozen at ~v2.3 pending the TASK-02
  parity port; its docs will be synced as part of that work, not here.


### Session 11 — Addendum (same session): "Powered by Forjé" branding + commit & push

#### Branding credit added / replaced (docs + app)
Isaac asked to replace "Built with Kiro AI IDE" with a two-line credit and apply it
consistently across the app family:
```
Powered by Forjé
© 2026 Isaac A Gera. All rights reserved.
```
- **`userguide.html`** — footer credit swapped to the new two-line credit (bold
  "Powered by Forjé" + copyright).
- **`overview.html`** — added a matching `<footer>` (it was a stub with no footer before);
  styled to its warm/muted palette, indigo accent on the "Powered by Forjé" line.
- **`ideaboard.html` (the live app)** — added a small, unobtrusive `<footer class="app-footer">`
  at the bottom of `.app` (below the board). New CSS uses existing theme tokens
  (`--text-light`, `--border`, `--primary`) so it renders correctly in **light + dark**, and
  the footer is added to the print-hide rule alongside header/toolbar/dashboard.
- **`prototypes/userguide.html`** — same credit swap (left proto version tag at v2.4.6, as it's
  a separate in-progress artifact).
- Left untouched deliberately: `msal-browser.min.js` (third-party Microsoft copyright) and git
  hook samples — not app-authored branding.
- Diagnostics clean on all four edited HTML files. Isaac eyeballed the rendered result and
  approved. Display/branding only — **no version bump** (app stays v2.4.8).

#### Committed + pushed
- Commit `da7b1e2` — "Docs: sync userguide to v2.4.8, add Powered by Forje credit across app + docs".
  Six files: `SESSION-LOG.md`, `SPEC-tasks.md` (the previously-uncommitted v3-migration plan from
  Session 10 Addendum 5), `ideaboard.html`, `overview.html`, `prototypes/userguide.html`,
  `userguide.html`.
- `git pushall` was run (pushes `master:main` to origin/team/github). The terminal returned
  garbled/empty output this session (the recurring Windows shell quirk), so **push success to all
  three remotes was handed to Isaac to confirm** via:
  `git ls-remote origin/team/github refs/heads/main` should all match local HEAD `da7b1e2`.
  Any leg that didn't land → re-run `git pushall` (or push that leg individually) and its Pages
  site redeploys.

#### Wrap-up state
- Idea Board session closed. Live app at **v2.4.8**; all docs + app now carry the "Powered by
  Forjé" credit. No open code work from this session.
- Carried-forward (unchanged, future sessions): TASK-02 v3-modular parity port (parity → test →
  promote, treat as a Spec); optional manifest screenshots; Option A name-keyed identity.
- Ideas.md unchanged (app already `Built (v2.4.8)`; branding/doc-sync, not a status change).


## Session 12 — Sep 24, 2026
**Incident: board went blank — expired Firebase test-mode rule (data safe)**

### Symptom
Isaac reported the Idea Board showed no entries — ideas added up to the previous day
had vanished from the UI. Question raised: is there an issue with the backend where
ideas are stored?

### Diagnosis (verified, not guessed)
- Backend is Firebase Realtime Database (`ideaboard-iag-2026`), with a localStorage
  fallback; the live monolith reads `/ideas` as an **anonymous** client
  (`db.ref('ideas').on('value', ...)` in `app.js`) — it has no Firebase auth.
- Queried the live REST endpoint directly (`.../ideas.json`, shallow read, and root):
  **all returned `401 Unauthorized`.** Endpoint alive (not a 404/deleted DB) → the DB
  exists but was refusing unauthenticated reads.
- Isaac opened the console **Rules** tab — rules were the Firebase **test-mode** default:
  ```json
  { "rules": { ".read": "now < 1790188200000", ".write": "now < 1790188200000" } }  // 2026-9-24
  ```
  `1790188200000` ms = **24 Sep 2026** (today). Test-mode rules grant access only until a
  fixed 30-day expiry; the instant it passed, `.read`/`.write` both became `false`, so every
  request (including the app's `/ideas` load) returned 401 → `state.ideas` stayed empty →
  blank board.
- **Root cause: the built-in test-mode rule expiry lapsed today.** Not data loss, not an
  app bug — a scheduled lock that always sits in test-mode databases.

### Data confirmed intact
- Isaac opened the console **Data** tab: `/ideas` still populated (`idea002`, `idea003`,
  `idea004`, `idea007`, `idea012`, …). Nothing was lost — the data was only unreadable.

### Fix applied (by Isaac, in the Firebase console)
- Replaced the expired test-mode rules with open, non-expiring rules and clicked Publish:
  ```json
  { "rules": { ".read": true, ".write": true } }
  ```
- Effect was immediate (no app redeploy needed): 401s cleared, the app's `/ideas` read
  succeeded, board repopulated. **Isaac confirmed the data is now showing up.**
- This restores the exact open posture the app already relied on (consciously accepted in
  Session 10 Addendum 4). Because the new rules contain no `now <` expiry, Firebase won't
  auto-lock them again.

### Housekeeping done here
- Created **`database.rules.json`** in the Idea Board folder — a version-controlled,
  commented copy of the live rules (they previously lived only in the console, invisible to
  the repo). Includes the incident history + the open-rules security caveat. Note: the
  console remains authoritative; this file is documentation unless deployed via Firebase CLI.

### Security caveat (unchanged, flagged again)
- `".read": true / ".write": true` = anyone with the DB URL can read/write it directly.
  Mitigated only by the board sitting behind the team's SAML/GitLab access, and the data
  not being sensitive (Isaac's standing call).
- **Proper lockdown remains a separate parked project:** it needs Firebase Authentication
  wired into the app (the live app has none — the Session 9 Entra gate was UI-only and never
  connected to Firebase). Scope as a Quick Spec/Plan if/when it's picked up; a rules-only
  change can't secure the DB without app-side auth.

### Status / notes
- App code untouched; no version bump (this was a backend-rules incident + a new docs file).
  Live app stays **v2.4.8**.
- `database.rules.json` is a new file to include in the next `git pushall` if Isaac wants the
  rules tracked in the repos (optional — it doesn't affect the deployed app or Pages).
- Ideas.md unchanged (app already `Built (v2.4.8)`; this was an incident fix, not a status change).


### Session 12 — Addendum (same date): a11y/UX prototype started — CHECKPOINT (work in progress)

**Mode:** Quick Spec / prototype-first. **Prototype only — live app untouched (stays v2.4.8).**
Paused mid-flight at Isaac's request to resume in a fresh session. This entry is a checkpoint,
not a completed piece of work.

#### Context
- New prototype folder created earlier: **`prototypes/a11y-ux/`** — a faithful copy of the live
  v2.4.8 monolith with accessibility/UX changes baked in, targeting a future **live v2.5.0**.
  (Separate from the existing `prototypes/` Entra-auth prototype so the two experiments don't tangle.)
- **Storage isolated:** all localStorage keys namespaced `ibax_*`
  (`ibax_data`, `ibax_user`, `ibax_theme`, `ibax_tour_done`).
- **Firebase shared with live** (project `ideaboard-iag-2026`), **not** isolated — this is an
  interaction/a11y change, not a data-model change, so a shared DB is fine. (Open rules, per the
  Session 12 incident fix.)
- Files in `prototypes/a11y-ux/`: `ideaboard.html`, `app-a11y.js` (version tag
  `2.5.0-a11y-proto`, ~760 lines), `LightHouse - Prototype.pdf`, `userguide.html`,
  `manifest.json`, `sw.js`, icons.

#### Done this session
- **Read the Lighthouse PDF** (`prototypes/a11y-ux/LightHouse - Prototype.pdf`). It's vector-glyph —
  only structure/links are extractable, not the rendered body text (reported honestly to Isaac, not
  claimed as a full text read). Cross-referenced the embedded axe rule links to read the scores:
  **Accessibility 93, Best Practices 100, SEO 100, Performance 98.** The two remaining Accessibility
  failures are **`color-contrast`** and **`target-size`** (axe 4.12 rule links).
- **Traced the code** for the two open tasks: read `state.dashHighlight`/`dashLocked`, `dashFilter`,
  `dashHover`/`dashHoverEnd`/`dashClearOnOutsideClick`, `ideaMatchesDashHighlight`,
  `applyDashHighlight()`, `render()`, `saveIdea()` in `app-a11y.js`.
- **Bug 1 key finding (root cause suspected, NOT yet fixed):** `render()` already re-applies the
  filter (`if (state.dashHighlight) applyDashHighlight();`) after rebuilding the board. The filter
  drop on modal-open is therefore suspected to come from the Firebase `.on('value')` re-render
  path when the modal opens — the highlight state isn't surviving that re-render. Still need to
  read `showModal`/`showDetail`/`closeModal` (not yet located) before editing.

#### NOT done — carried to next session (the two open tasks)
1. **Bug 1 — filter lost when a modal opens.** Isaac's exact report: clicking an idea (list *and*
   board) opens the modal fine, but the background filter is lost and all ideas reappear.
   → Fix approach: read `showModal`/`showDetail`/`closeModal`, then ensure
   `state.dashHighlight`/`dashLocked` persist through the Firebase `.on('value')` re-render that
   fires when a modal opens (re-assert the highlight after that re-render, don't let it reset).
2. **Header rework** (`prototypes/a11y-ux/ideaboard.html`). Isaac's exact ask: near the title,
   keep only **one** of the two labels — keep "Team Innovation Tracker" and rename it to
   **"Arch. Middleware Team Innovation Tracker"** (drop the separate "Architecture Middleware
   Integration Team" team-name span); move the **version tag** closer to the title; move the
   **"last updated X hr…"** stamp next to the title.
   → Current markup: `<h1>Idea Board <span class="team-name">Architecture Middleware Integration
   Team</span> <span class="version-badge" id="app-version">` and
   `<span class="subtitle">Team Innovation Tracker <span class="last-updated" id="last-updated">`.

#### Also carried forward (Lighthouse 93 → 100, once the two tasks are done)
- **`color-contrast`:** dark-theme `--text-light` token + hardcoded kanban badge colours
  (e.g. `.col-new` / `#dbeafe`) in `ideaboard.html`.
- **`target-size`:** bump `vote-btn` / close-btn / `btn-sm` tap targets to ≥24px.

#### Verify (next session, after edits)
- `get_diagnostics` on both edited files. Isaac to re-run Lighthouse and manually confirm the
  filter now persists when a modal opens (browser test can't be run here — Windows shell quirk).

#### After sign-off (future)
- Port finalized changes to live (`ideaboard.html` + `app.js`), bump to **v2.5.0**, changelog,
  PWA cache-name bump, docs, keep the "Powered by Forjé" footer, Isaac runs `git pushall`.
- **Ideas.md:** set the Idea Board row to **In Progress** (prototype work underway) at the start
  of the next session — currently still `Built (v2.4.8)`. `Built` stays until Isaac signs off v2.5.0.

**Status: In Progress — prototype, awaiting next session. No live changes, no version bump, nothing committed.**


## Session 13 — Sep 24, 2026
**a11y/UX prototype completed + BT-purple rebrand, then ported to LIVE (v2.4.8 → v2.5.0)**

Continued from the Session 12 addendum checkpoint. Finished the `prototypes/a11y-ux/`
prototype, took it through the Pre-Live agent + Lighthouse to 100, rebranded to BT purple,
then ported the whole thing into the live app as **v2.5.0**. Quick Spec / prototype-first,
then the deliberate one-pass port. Ideas.md row flipped to **In Progress** at the start.

### Prototype work finished (in `prototypes/a11y-ux/`, then ported)
- **Bug 1 — filter lost when a modal opens:** root cause was `dashClearOnOutsideClick`
  treating the idea-open click as an outside click. Fixed to ignore clicks on idea cards,
  list rows, the modal overlay, and vote buttons; `render()` re-asserts the highlight after
  the Firebase re-render.
- **Bug 2 — first stat-card click showed all ideas:** the toggle keyed off the transient
  hover highlight (which hover had already set to that card). Rebased the toggle on
  `state.dashLocked` so the first click/Enter locks the previewed filter; a second clears it.
  Mouse and keyboard now identical.
- **Header rework:** dropped the separate team-name span; single subtitle renamed
  "Arch. Middleware Team Innovation Tracker"; version badge + last-updated by the title.
- **Filter model + borders:** hover/keyboard-focus = SINGLE border (preview); click/Enter =
  DOUBLE border (locked). Border moved to the CONTAINER (kanban column / list-view box), not
  each card/row. `onfocus`/`onblur` added to stat cards so keyboard preview matches hover.
- **Contributors:** replaced the "Top Contributor" stat with a **Contributors** count
  (distinct submitters; all-ideas highlight); added a toolbar **Contributors** dropdown filter;
  renamed the Category/Priority dropdown placeholders to "Categories"/"Priority".
- **Dashboard counts** now reflect the active toolbar filters (status card never zeroes itself).
- **Clear filters:** context-aware "✕ Clear filters (N)" button (shown only when a filter is
  active) + **Esc** clears all filters. Filter result count announced to AT.
- **Manifest screenshots:** copied `screenshot-wide.png` (1280×720) + `screenshot-narrow.png`
  (720×1280) into the prototype and declared them with `form_factor` (cleared both DevTools
  "Richer PWA Install UI" warnings).
- **Pre-Live Testing Agent:** run on the prototype — verdict "minor fixes, no blockers";
  applied its cheap wins (comment-delete ×+aria-label already present, de-duplicated bulk
  announcements, filter result announcement).
- **Lighthouse → Accessibility 100 (light AND dark):** fixed contrast on dark `--text-light`
  (#94a3b8 → #aab6c9); tokenised kanban column-header colours so they theme; dedicated
  `--statnum-*` colours (amber stat number was the failure); `.priority-high` → #b91c1c; base
  tap targets ≥24px on `.vote-btn`/`.close-btn`/`.btn-sm`; added standard `line-clamp`. Then a
  second dark-theme pass: white-on-primary failed because dark `--primary` is a light violet →
  introduced an **`--on-primary`** token (white light / dark ink dark) for buttons, the active
  view-toggle, avatar, clear-filters; gave the bulk bar a fixed deep-purple background.
- **BT-purple rebrand:** retuned the `--primary` family to BT purple
  (`#5514b4` light / `#b39dff` dark, `--primary-light` `#7e3ff2`/`#cdbcff`), `theme-color`
  `#5514b4`, bulk bar `#4c1d95`, and updated the icon generator palette. Accessibility stayed
  100 in both themes (Isaac confirmed).

### Ported to LIVE (v2.4.8 → v2.5.0) — files changed
- **`ideaboard.html`** — rebuilt from the prototype: BT-purple tokens + `--on-primary` +
  statnum/col tokens, single/double container border rules, header rework, Contributors
  dropdown + renamed Categories/Priority, Clear-filters button, ≥24px tap targets, `line-clamp`,
  bulk-bar fixed bg, `theme-color #5514b4`, `app.js?v=2.5.0`. PROTOTYPE banner + proto tag
  removed; title/description/apple-title de-proto'd; "Powered by Forjé" footer kept.
- **`app.js`** — rebuilt from `app-a11y.js`: `APP_VERSION = '2.5.0'` + a full v2.5.0 changelog
  entry; localStorage keys back to `ib_*` (were `ibax_*` in the sandbox); de-proto'd the name
  prompt, export filename, and version-badge title. All the a11y/filter/contributors/clear-
  filters logic + the two bug fixes carried over verbatim. (No Entra auth gate — that stays
  prototype-only per Session 10 Addendum 4.)
- **`sw.js`** — `CACHE_VERSION` `v2.4.8` → `v2.5.0`; precache `./app.js?v=2.5.0`.
- **`manifest.json`** — `theme_color` `#6366f1` → `#5514b4`.
- **`make_icons.py`** (live) — palette updated to BT purple (`#5514b4`/`#7e3ff2`) + docstring.
- **`userguide.html`** — version badge + footer → v2.5.0; BT-purple `--primary`; documented the
  Contributors filter/stat, Clear filters + Esc, the single/double border + keyboard-parity
  filtering, filters-affect-dashboard-counts, and a keyboard-reachability tip. Kept Forjé footer.
- Diagnostics clean on all six edited files.

### Data safety / migration notes
- Live keeps the same Firebase DB and the same `ib_*` localStorage keys — **no data migration**;
  existing ideas/users/theme/tour flag all carry over untouched.
- The live DB rules are still the open, non-expiring rules from the Session 12 incident fix.

### Still to do (handed to Isaac — needs his terminal / sign-off)
1. **Regenerate the live BT-purple icons:** run `python make_icons.py` in the Idea Board folder
   (regenerates `icon-192/512/512-maskable.png` + the two screenshots). Not runnable here
   (Python stub + Windows shell quirk). Until then the live tab/header icon stays the old indigo.
2. **Verify the live build on Live Server** (BT-purple UI + icon, filters, Clear filters, dark
   mode; optional Lighthouse re-check).
3. **`git pushall`** (origin, team, github) to redeploy all three Pages sites — Isaac's to run.
4. On sign-off: set **Ideas.md** to `Built (Idea Board v2.5.0)` (currently In Progress).

### Status
- **Code-complete at v2.5.0; NOT yet committed/pushed; live sites still on v2.4.8** until Isaac
  runs `git pushall`. Version stays In Progress / awaiting sign-off per the standing rule
  (Forjé doesn't self-mark Built).
- Carried-forward (unchanged): TASK-02 v3-modular parity port (still frozen ~v2.3; treat as a
  Spec); the a11y-ux prototype folder remains as the reference for this release.


### Session 13 — Addendum (same session): signed off + marked Built (push pending)
- Isaac regenerated the BT-purple icons (`python make_icons.py`) and verified the live app on
  Live Server — BT-purple UI + icon, filters/Clear-filters/dark mode all good.
- **Ideas.md flipped to `Built (Idea Board v2.5.0)`** (was In Progress) on Isaac's sign-off.
- **Still pending: `git pushall`** (origin, team, github) — Isaac's to run; all three Pages sites
  are still on v2.4.8 until then. Suggested files to stage: `app.js`, `ideaboard.html`, `sw.js`,
  `manifest.json`, `userguide.html`, `make_icons.py`, `SESSION-LOG.md`, and the regenerated
  `icon-192/512/512-maskable.png` + `screenshot-wide/narrow.png`. (Optional: also commit the
  updated `Ideas.md` from the Ideas folder if tracking the backlog in the repo — it lives outside
  this app folder, so it's a separate concern.)


### Session 13 — Addendum 2 (same session): SHIPPED
- `git pushall` run — v2.5.0 pushed `master:main` to all three remotes (origin/personal,
  team, github), redeploying all three Pages sites. **Idea Board v2.5.0 is now live.**
- Status: **Built (Idea Board v2.5.0)** in Ideas.md; live app at v2.5.0 across all sites.
- If the update doesn't show immediately on a site, it's the cache-first service worker —
  a hard refresh (or waiting for the SW to pick up the new `ideaboard-shell-v2.5.0` cache)
  resolves it.
- Session closed. Carried-forward (unchanged): TASK-02 v3-modular parity port (still frozen
  ~v2.3; treat as a Spec when picked up); the `prototypes/a11y-ux/` folder stays as the
  reference for this release.

### Session 13 — Addendum 3 (same session): prototype folder + wrap-up committed & synced
- GitHub Desktop showed 13 uncommitted files, all under `prototypes/a11y-ux/`. Checked
  `git status`: the **live v2.5.0 release was already committed + pushed** (root files on
  `main` across all three remotes — that's why the live sites/PWA were correct); the only
  outstanding items were the untracked `prototypes/a11y-ux/` folder and the modified
  `SESSION-LOG.md` (the post-push addenda).
- Committed all of it — `git commit e163281` "Add a11y-ux prototype (v2.5.0 reference) +
  session log wrap-up" (13 files: the 12 prototype files + SESSION-LOG.md). Ran `git pushall`;
  Isaac confirmed all three remotes' `main` are in sync on `e163281`.
- This commit is **reference/docs only** (the prototype folder + log) — it does not change the
  deployed live app, which remains v2.5.0.
- Expected/benign: GitHub Desktop shows "Push origin 1↑" against `origin/master` — that's the
  known `master`-vs-`main` branch drift (Session 10 Addendum 3); Pages builds from `main`
  everywhere, and the remotes' `master` is a stale leftover nothing depends on. Not a failed push.
- LF→CRLF line-ending warnings on the committed files are cosmetic (Windows checkout). Optional
  future tidy: a `.gitattributes` (`* text=auto eol=lf`) to silence them.

**Session 13 fully closed. Everything committed and synced across origin/team/github; live app v2.5.0; backlog Built (Idea Board v2.5.0).**
