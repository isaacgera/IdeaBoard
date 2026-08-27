# Idea Board — Session Log

## Project Info
- **App Name:** Idea Board
- **Team:** Architecture Middleware Integration Team
- **Location:** `C:\Users\615509493\OneDrive - BT Plc\Data Drive\Personal\Learning\Kiro\Projects\Idea Board\`
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
