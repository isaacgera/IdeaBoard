# Idea Board — Design Specification

## Architecture

### Original Architecture (v2.3 — monolithic)
```
┌─────────────────────────────────────────────────┐
│                  Browser (Client)                 │
│                                                   │
│  ideaboard.html ─── app.js ─── userguide.html    │
│       │                │                          │
│       │                │                          │
│  ┌────┴────┐    ┌──────┴──────┐                  │
│  │  CSS    │    │   App Logic  │                  │
│  │ (inline)│    │   (IIFE)     │                  │
│  └─────────┘    └──────┬──────┘                  │
│                         │                         │
└─────────────────────────┼─────────────────────────┘
                          │
              ┌───────────┼───────────┐
              │                       │
    ┌─────────┴──────────┐  ┌────────┴────────┐
    │  Firebase Realtime  │  │   localStorage   │
    │     Database        │  │   (fallback)     │
    └────────────────────┘  └─────────────────┘
```

### v3 Architecture (ES Modules)
```
┌──────────────────────────────────────────────────────────────┐
│                       Browser (Client)                         │
│                                                                │
│  ideaboard.html ──┬── styles/*.css (8 files)                  │
│                   └── src/app.js (type="module")              │
│                           │                                    │
│           ┌───────────────┼───────────────┐                   │
│           │    ES Module Imports           │                   │
│           ▼                               ▼                   │
│   ┌─────────────┐  ┌──────────────────────────────────┐      │
│   │  state.js   │  │  Feature Modules (11 files)       │      │
│   │  (shared)   │◄─┤  auth, ideas, voting, comments,  │      │
│   └─────────────┘  │  rendering, dragdrop, bulk,       │      │
│                     │  modals, tour, firebase, utils    │      │
│                     └──────────────┬───────────────────┘      │
│                                    │                           │
│                      window.IB (public API)                    │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │                       │
      ┌─────────┴──────────┐  ┌────────┴────────┐
      │  Firebase Realtime  │  │   localStorage   │
      │     Database        │  │   (fallback)     │
      └────────────────────┘  └─────────────────┘
```

## File Structure

### Original (v2.3 — monolithic)
```
Idea Board/
├── ideaboard.html       # Main app (HTML shell + inline CSS)
├── app.js               # All application logic (single IIFE, ~680 lines)
├── userguide.html       # Standalone user documentation
├── dummy-data.json      # Sample data for testing
├── index.html           # Redirect for hosting (→ ideaboard.html)
├── .gitlab-ci.yml       # GitLab Pages deployment config
├── .gitignore           # Git ignore rules
├── README.md            # Project overview + setup instructions
├── SESSION-LOG.md       # Development session history
├── SPEC-requirements.md # Requirements specification
└── SPEC-design.md       # This file
```

### v3-modular (ES Modules — professional structure)
```
v3-modular/
├── ideaboard.html              # HTML shell (CSS <link> tags + <script type="module">)
├── styles/
│   ├── variables.css           # CSS custom properties + resets
│   ├── layout.css              # App shell, header, toolbar, user bar
│   ├── components.css          # Buttons, badges, modals, forms, toast, timeline, audit
│   ├── dashboard.css           # Stat cards, hover effects, highlight logic
│   ├── kanban.css              # Columns, cards, drag-and-drop states
│   ├── list.css                # Table, bulk action bar, checkboxes
│   ├── tour.css                # Spotlight overlay + tooltip
│   └── responsive.css          # Media queries + print
└── src/
    ├── app.js                  # Entry point: imports, wires window.IB, init()
    └── modules/
        ├── state.js            # Shared state, constants, Firebase config
        ├── utils.js            # Utility functions (escape, format, toast)
        ├── firebase.js         # Firebase init, presence, localStorage fallback
        ├── auth.js             # User identity, RBAC, user admin
        ├── ideas.js            # CRUD, audit log, status dates
        ├── voting.js           # Upvote/downvote, score calculation
        ├── comments.js         # Comment add/delete
        ├── rendering.js        # Dashboard, kanban, list, filtering, sorting, theme
        ├── dragdrop.js         # Drag-and-drop event delegation
        ├── bulk.js             # Bulk actions (status, priority, category, delete)
        ├── modals.js           # Modal system, forms, detail view, manage data
        └── tour.js             # 7-step guided tour
```

## Data Model

### Ideas Collection (`/ideas/{ideaId}`)
```json
{
  "id": "string (unique, generated)",
  "title": "string (required)",
  "description": "string",
  "benefits": "string",
  "category": "string (from categories list)",
  "priority": "High | Medium | Low",
  "status": "New | In Progress | Review | Done",
  "submittedBy": "string (user name)",
  "createdAt": "number (timestamp ms)",
  "updatedAt": "number (timestamp ms)",
  "updatedBy": "string (user name)",
  "sortOrder": "number (position within column)",
  "votes": {
    "userId": "1 | -1"
  },
  "comments": [
    {
      "id": "string",
      "user": "string",
      "text": "string",
      "timestamp": "number"
    }
  ],
  "history": [
    {
      "timestamp": "number",
      "user": "string",
      "action": "string",
      "details": "string"
    }
  ],
  "dates": {
    "created": "number",
    "started": "number",
    "inReview": "number",
    "completed": "number"
  }
}
```

### Users Collection (`/users/{userId}`)
```json
{
  "name": "string",
  "role": "admin | contributor",
  "lastSeen": "number (timestamp)"
}
```

### Categories (`/categories`)
```json
["Process Improvement", "Technology", "Customer Experience", "Cost Saving", "Team Culture", "Other"]
```

### Presence (`/presence/{userId}`)
```json
{
  "name": "string",
  "online": true
}
```

## State Management

Single `state` object shared across modules (exported from `state.js`):
```javascript
{
  ideas: {},              // All ideas (object, keyed by id)
  categories: [],         // Category list
  currentView: 'kanban',  // 'kanban' | 'list'
  currentUser: {},        // {id, name}
  firebaseReady: false,   // Firebase connection status
  filters: {},            // {search, category, priority}
  sort: {},               // {column, direction}
  darkMode: false,        // Theme state
  dashHighlight: null,    // Dashboard filter state
  dashLocked: false,      // Dashboard filter locked via click
  users: {},              // All registered users
  selectedIds: [],        // Bulk selection in list view
  onlineUsers: {}         // Currently online users (presence)
}
```

In the original (v2.3), state lives in the IIFE closure. In v3-modular, it is exported from `src/modules/state.js` and imported by all modules that need it.

## Module Dependency Graph (v3-modular)

```
state.js ◄─── (imported by all modules)
utils.js ◄─── (imported by auth, rendering, modals, ideas)
firebase.js ──► state, rendering, auth
auth.js ──► state, utils, rendering, modals, ideas
ideas.js ──► state, firebase, rendering
voting.js ──► state, ideas
comments.js ──► state, utils, ideas, modals
rendering.js ──► state, utils, voting, auth
dragdrop.js ──► state, ideas, utils, rendering, modals
bulk.js ──► state, ideas, auth, rendering, utils
modals.js ──► state, utils, ideas, voting, auth, rendering
tour.js ──► (standalone, no module imports)
app.js ──► (imports all, wires window.IB, calls init)
```

## RBAC Design

```
┌─────────────────────────────────────────────────────┐
│                    isAdmin()                          │
│                                                       │
│  1. Check ADMIN_NAMES (hardcoded: ['isaac gera'])    │
│  2. Check state.users[currentId].role === 'admin'    │
│                                                       │
│  Returns true if either matches                       │
└─────────────────────────────────────────────────────┘

┌───────────────────┐     ┌───────────────────────────┐
│      Admin        │     │       Contributor          │
├───────────────────┤     ├───────────────────────────┤
│ Edit any idea     │     │ Edit own ideas only        │
│ Delete any idea   │     │ Delete own ideas only      │
│ Manage categories │     │ Add new ideas              │
│ Manage users      │     │ Comment on any idea        │
│ Import/Export     │     │ Vote on any idea           │
│ Switch user       │     │ Drag cards (change status) │
│ View online users │     │ View all data              │
│ All contributor   │     │                            │
│   permissions     │     │                            │
└───────────────────┘     └───────────────────────────┘
```

## UI Component Hierarchy

```
App
├── Header
│   ├── Brand (icon + title + team name + last updated)
│   └── User Bar (Tour, Guide, Theme, Online Count, Name, Avatar, Switch)
├── Dashboard Container (stat cards × 7)
├── Toolbar
│   ├── + New Idea button
│   ├── Search box
│   ├── Category filter
│   ├── Priority filter
│   ├── View toggle (Board / List)
│   └── Manage Data button (admin)
├── Board Content
│   ├── Kanban View
│   │   └── Column × 4 → Card × N
│   └── List View
│       ├── Bulk Action Bar (when selected)
│       └── Table (checkbox + 8 columns)
├── Modal Overlay
│   └── Modal (dynamic content: form, detail, manage data, users, online)
├── Toast (notifications)
└── Tour Overlay (spotlight + tooltip)
```

## Event Handling

### Drag and Drop (Event Delegation)
- All drag events handled on `#board-content` via delegation
- `_dragState` object tracks: dragging, didDrag, draggedId
- `didDrag` flag suppresses click after drop (50ms timeout reset)
- Drop calculates insertion position via cursor Y vs card midpoint
- sortOrder recalculated for all cards in target column after drop

### Dashboard Interaction
- `onmouseenter` / `onmouseleave` on stat cards for hover preview
- `onclick` locks the filter (dashLocked flag)
- Document-level click listener clears on outside click
- `applyDashHighlight()` manipulates DOM classes + row display

## Deployment

### GitHub Pages
- Push to `github.com/isaacgera/IdeaBoard`
- Branch: master
- GitHub Pages source: root of master branch
- Auto-deploys on push

### GitLab Pages (Internal)
- Push to `gitlab.prod.ec.devops.nat.bt.com/615509493/IdeaBoard`
- CI config: `.gitlab-ci.yml`
- Runner tag: `mobius_shared_runner_cloud`
- Image: `alpine:latest`
- Script: `mkdir public && cp *.html *.js *.json public/`
- Git proxy: `http://127.0.0.1:9000`

## CSS Architecture

### Original (v2.3): Single inline `<style>` block in HTML (~260 lines)

### v3-modular: 8 separate CSS files loaded via `<link>` tags

| File | Responsibility |
|------|---------------|
| `variables.css` | Theme tokens (light/dark), CSS resets, body defaults |
| `layout.css` | App shell, header (gradient bar, brand), toolbar, user bar |
| `components.css` | Buttons, badges, modals, forms, timeline, audit log, toast, vote widget |
| `dashboard.css` | Stat cards, hover zoom/shrink effect, highlight/dim logic |
| `kanban.css` | Board columns, idea cards, drag-and-drop visual states |
| `list.css` | Table, bulk action bar, checkbox column, row selection |
| `tour.css` | Tour overlay, spotlight box-shadow trick, tooltip positioning |
| `responsive.css` | Media queries (1024px, 640px breakpoints) + print styles |

### Theming
- CSS custom properties (variables) on `:root` and `[data-theme="dark"]`
- Toggle swaps `data-theme` attribute on `<html>`
- All colors reference variables — single source of truth

### Responsive Breakpoints
- `1024px`: Kanban 4 cols → 2 cols
- `640px`: Kanban → 1 col, toolbar stacks, header stacks

### Key CSS Patterns
- `.stat-card` hover: sibling shrink via `.dashboard:hover .stat-card`
- `.idea-card.dash-dim`: opacity 0.08 for near-invisible
- `.bulk-bar`: sticky positioned purple overlay
- `.tour-overlay`: fixed fullscreen with spotlight box-shadow trick
