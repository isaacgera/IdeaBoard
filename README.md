# Idea Board

A multi-user team innovation tracker for capturing, discussing, and prioritising ideas.

## Features

- Kanban board view (New → In Progress → Review → Done)
- List/table view with sortable columns
- Drag-and-drop to change status or reorder cards
- Upvote/Downvote on ideas
- Comments thread per idea
- Category management and filtering
- Dashboard stats with interactive hover/click filtering
- Version history and audit log
- Dark/Light mode
- Export/Import (JSON)
- Real-time multi-user sync via Firebase

## Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Realtime Database (test mode)
3. Add a web app and copy the config
4. Paste config values into `app.js` (replace the YOUR_API_KEY placeholders)
5. Deploy to GitHub Pages or open `ideaboard.html` locally

## Deployment (GitHub Pages)

1. Push this folder to a GitHub repo
2. Go to repo Settings → Pages → Source: Deploy from branch → Branch: main, folder: / (root)
3. Your app will be live at `https://USERNAME.github.io/REPO-NAME/`

## Tech Stack

- Vanilla HTML/CSS/JS (no build tools, no dependencies)
- Firebase Realtime Database (multi-user sync)
- localStorage fallback (works offline without Firebase)

## Files

- `ideaboard.html` — UI shell + CSS
- `app.js` — All application logic
- `dummy-data.json` — Sample data for testing (import via the Import button)
- `index.html` — Redirect for GitHub Pages
