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

## Deployment (Internal GitLab Pages)

Deployed to the team's internal GitLab via `.gitlab-ci.yml` (a `pages` job that
copies static files into `public/`). Pages deploys on every push to the default
branch (`main`).

### Repositories & Remotes

| Remote   | Path                                  | Purpose                          |
|----------|---------------------------------------|----------------------------------|
| `origin` | `615509493/IdeaBoard`                 | Personal repo                    |
| `team`   | `robt/app02752/IdeaBoard`             | Team space (deploys GitLab Pages)|

Local working branch is `master`; the team project's default branch is `main`,
so team pushes map `master:main`.

### Push workflow

```
git add <files>
git commit -m "Describe your change"
git pushall          # pushes to origin (master) then team (master:main)
```

`git pushall` is a global git alias:
```
git config --global alias.pushall "!git push origin master && git push team master:main"
```

### Editing directly on GitLab

Files can be edited in the browser (Edit → Edit single file, or the Web IDE for
multiple files). A direct commit to team `main` triggers the Pages pipeline.
After a browser edit, re-sync locally to avoid divergence:
```
git pull team main
git push origin master
```

### GitLab Pages troubleshooting notes

- Runner assignments do NOT transfer during a GitLab project import — after
  importing, assign a runner to the new project (Settings → CI/CD → Runners) or
  the `pages` job stays stuck/pending.
- A runner showing "online" in the list is not the same as "assigned to this
  project." Click into a stuck job to read its exact status message.
- GitLab project paths are case-sensitive; copy the exact clone URL from the
  project's blue **Code** button rather than guessing.
- Never embed access tokens in remote URLs — let the OS credential manager
  (Windows Credential Manager, helper `manager`) hold them.

## Tech Stack

- Vanilla HTML/CSS/JS (no build tools, no dependencies)
- Firebase Realtime Database (multi-user sync)
- localStorage fallback (works offline without Firebase)

## Files

- `ideaboard.html` — UI shell + CSS
- `app.js` — All application logic
- `dummy-data.json` — Sample data for testing (import via the Import button)
- `index.html` — Redirect for GitHub Pages
