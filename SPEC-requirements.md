# Idea Board — Requirements Specification

## Overview
A multi-user team innovation tracker for capturing, discussing, prioritising, and tracking ideas through their lifecycle.

## Target Users
- Architecture Middleware Integration Team (BT)
- ~5-15 team members
- Mix of technical and non-technical users

## Functional Requirements

### FR-01: Idea Management
- Users can create new ideas with: Title (required), Description, Benefits, Category, Priority, Status
- Users can edit their own ideas
- Users can delete their own ideas
- Admin can edit/delete any idea
- Ideas persist across sessions (Firebase or localStorage)

### FR-02: Views
- **Kanban Board:** 4 columns (New, In Progress, Review, Done), cards with title/category/priority/votes
- **List/Table:** Sortable columns, version history column, bulk selection checkboxes
- Toggle between views via UI button

### FR-03: Drag and Drop
- Cards draggable between status columns (changes status)
- Cards reorderable within a column (sortOrder)
- Visual drop indicators (blue line)
- Status changes logged in audit trail

### FR-04: Voting
- Upvote/Downvote per idea (one vote per user per idea, toggleable)
- Vote score displayed on cards and in list view
- Sortable by vote score

### FR-05: Comments
- Comment thread per idea
- Add/delete own comments
- Comment count on cards
- Comments logged in audit trail

### FR-06: Dashboard Statistics
- Total ideas, count by status, ideas this month, top contributor
- Interactive: hover to preview filter, click to lock filter
- Board: dims non-matching cards; List: hides non-matching rows
- Click outside to clear filter

### FR-07: Search & Filtering
- Text search across title, description, benefits, submitter
- Filter by category (dropdown)
- Filter by priority (dropdown)
- Filters work additively

### FR-08: Bulk Actions (List View)
- Checkbox selection (per row + select all)
- Bulk change status, priority, category
- Bulk delete (RBAC-enforced)
- Action bar appears when items selected

### FR-09: RBAC (Role-Based Access Control)
- **Admin:** Full access — edit/delete any idea, manage categories, manage users, import/export
- **Contributor:** Add ideas, edit/delete own ideas, comment, vote, drag cards
- Hardcoded admin: "Isaac Gera"
- Admin can promote/demote others
- Admin can rename/delete users (with idea remapping)
- "Manage Data" and "Switch User" admin-only

### FR-10: User Identity
- Name prompt on first visit (mandatory, loops until entered)
- Name displayed in header with role badge
- User registered in Firebase /users collection

### FR-11: Dark/Light Mode
- Toggle button in header
- Full CSS variable swap
- Persists via localStorage

### FR-12: Audit Log / Version History
- Every change logged: creation, edits, status changes, comments
- Milestone dates: Created, Started, In Review, Completed
- Timeline visualization in detail view
- Audit log scrollable in detail view
- "Last Change" column in list view

### FR-13: Export & Import (Admin)
- Export: JSON file download + text summary to clipboard
- Import: Merge ideas from JSON file
- Category import supported

### FR-14: Category Management (Admin)
- Default categories: Process Improvement, Technology, Customer Experience, Cost Saving, Team Culture, Other
- Add/remove categories via Manage Data modal
- Categories synced across users via Firebase

### FR-15: Online Presence (Admin)
- Shows number of users currently online
- Clickable badge shows modal listing active users
- Admin-only visibility

### FR-16: Intro Tour
- Guided 7-step overlay on first visit
- Spotlight + tooltip for each feature area
- "Tour" button to replay anytime
- localStorage flag prevents repeat auto-trigger

### FR-17: User Guide
- Standalone HTML page (userguide.html)
- Covers all features with table of contents
- Accessible via "Guide" button in header

## Non-Functional Requirements

### NFR-01: No Build Tools
- Pure HTML/CSS/JS — no npm, no bundler, no framework
- Single folder deployment
- v3-modular uses native ES Modules (`import`/`export`) — still no build step required
- Works in all modern browsers (Chrome, Edge, Firefox, Safari)

### NFR-01b: Modular Architecture (v3-modular)
- Code split into 12 focused ES modules (40-120 lines each)
- CSS split into 8 thematic stylesheet files
- Clear separation of concerns: state, auth, CRUD, rendering, UI interactions
- Entry point (`src/app.js`) wires all modules to a single `window.IB` namespace
- Facilitates onboarding, testing, and maintenance
- Requires HTTP serving (not `file://` protocol) due to ES module security restrictions

### NFR-02: Real-Time Sync
- Firebase Realtime Database for multi-user collaboration
- Graceful fallback to localStorage if Firebase unavailable

### NFR-03: Responsive Design
- Works on desktop, tablet, and mobile
- Kanban adapts: 4 cols → 2 cols → 1 col

### NFR-04: Performance
- Static files only (no server-side processing)
- Cache-busting via query string on script tags

### NFR-05: Accessibility
- Semantic HTML structure
- Keyboard navigable modals (Escape to close)
- Color contrast maintained in both themes

### NFR-06: Security
- No anonymous access (forced name entry)
- RBAC prevents unauthorized edit/delete
- Firebase security rules should be configured for production
- GitLab push uses personal access tokens
- Tokens MUST NOT be embedded in git remote URLs — use the OS credential manager
  (Windows Credential Manager, helper `manager`) instead
- If a token is ever exposed, revoke and regenerate it immediately

### NFR-07: Deployment
- GitHub Pages (public)
- GitLab Pages (internal, via CI pipeline)
- No server infrastructure required
- v3-modular deploys identically (static files only)
- Multiple CSS/JS files are fine for internal team use (<15 users); no bundling needed

#### NFR-07a: Team GitLab Space
- Deployed to the shared team GitLab space: `robt/app02752/IdeaBoard`
- Default branch: `main` (Pages deploys on push to `main`)
- CI `pages` job requires a runner assigned to the project
  (tag `mobius_shared_runner_cloud`)
- Runner assignments do NOT transfer during a GitLab project import — must be
  assigned manually in the new project after import

#### NFR-07b: Multi-Remote Workflow
- Two git remotes maintained:
  - `origin` → `615509493/IdeaBoard` (personal)
  - `team`   → `robt/app02752/IdeaBoard` (team, deploys Pages)
- Local branch `master` maps to team `main` on push (`master:main`)
- `git pushall` alias pushes to both remotes in one command
- Direct in-browser GitLab edits require a follow-up `git pull team main` to keep
  local and personal repos in sync

### NFR-08: Code Maintainability (v3-modular)
- Each module has a single responsibility
- Shared state is centralized in one module (`state.js`)
- Public API surface is explicitly declared in the entry point
- New features can be added by creating new modules without touching existing code
- Module dependency graph is documented in SPEC-design.md
