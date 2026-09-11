# Entra Auth Prototype — Temporary Swap Instructions

## How this works
The swap changes **one line** in `.gitlab-ci.yml` so Pages publishes the prototype
files from `prototypes/` instead of the live files from root. No live files are
moved, renamed, or deleted. The restore is reverting that one line.

## BEFORE YOU START

### 0. Download the MSAL library locally (ONE-TIME — required)
The MSAL sign-in library is loaded from a local file, NOT the CDN, because the
corporate proxy (Zscaler) blocks `alcdn.msauth.net`. Your browser handles the
proxy fine, so download it there:

1. In your browser, open:
   `https://alcdn.msauth.net/browser/2.35.0/js/msal-browser.min.js`
2. Save the file as **`msal-browser.min.js`** into the `prototypes/` folder
   (right-click the page → Save As, or Ctrl+S). It should be ~360-370 KB.
3. Confirm it starts with `/*! @azure/msal-browser v2.35.0 ...`.

The prototype `ideaboard.html` already points at `msal-browser.min.js` (local),
`sw.js` precaches it, and the CI `*.js` glob will publish it. If this file is
missing, the gate shows "Sign-in problem: The sign-in library could not be loaded."

### Then:
- Note the current commit hash on `main` (visible in GitLab or `git log --oneline -1`).
  This is your safety net — you can always `git revert` back to this exact state.
- Warn your team the board will briefly show a sign-in gate during the test.

---

## TO DEPLOY THE PROTOTYPE (swap)

In `.gitlab-ci.yml`, change this line:

```yaml
    - cp *.html *.js *.json *.png public/
```

to:

```yaml
    - cp prototypes/*.html prototypes/*.js prototypes/*.json prototypes/*.png public/
```

Then:
```
git add .gitlab-ci.yml prototypes/
git commit -m "TEMP: deploy auth prototype to Pages for sign-in testing"
git push team master:main
```

Wait for the pipeline to go green (Build → Pipelines). Pages now serves the prototype.

---

## TO RESTORE THE LIVE APP

Change `.gitlab-ci.yml` back to:

```yaml
    - cp *.html *.js *.json *.png public/
```

Then:
```
git add .gitlab-ci.yml
git commit -m "Restore: live app back on Pages after auth prototype test"
git push team master:main
```

Wait for pipeline green. Live app is back. Total downtime = duration of your test.

---

## NUCLEAR OPTION (if anything goes wrong)
```
git revert HEAD
git push team master:main
```
This undoes the last commit and re-deploys whatever was there before.
