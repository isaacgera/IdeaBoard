# Entra Auth Prototype — Temporary Swap Instructions

## How this works
The swap changes **one line** in `.gitlab-ci.yml` so Pages publishes the prototype
files from `prototypes/` instead of the live files from root. No live files are
moved, renamed, or deleted. The restore is reverting that one line.

## BEFORE YOU START
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
