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
