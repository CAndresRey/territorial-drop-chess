# Temporary GitHub Pages + Public Backend

This project can run with a temporary public backend using `cloudflared` and GitHub Pages.

## What this gives you

- Frontend hosted on GitHub Pages.
- Backend exposed temporarily through a `trycloudflare.com` URL.
- One-command update of `VITE_SOCKET_URL` and Pages redeploy.

## Scripts

- `scripts/temp-deploy/start-temp-backend.ps1`
- `scripts/temp-deploy/redeploy-pages.ps1`
- `scripts/temp-deploy/stop-temp-backend.ps1`

## Prerequisites

- GitHub CLI authenticated (`gh auth status`).
- `cloudflared` installed.
- Repo variable permissions (to set `VITE_SOCKET_URL`).

## Start temporary backend

```powershell
.\scripts\temp-deploy\start-temp-backend.ps1 -UpdateGithubVariable -TriggerPagesDeploy
```

This command:

- starts `@tdc/server` on `localhost:3001`
- opens a public tunnel via `cloudflared`
- stores runtime artifacts in `.temp-deploy/`
- updates `VITE_SOCKET_URL`
- triggers `Deploy Web to GitHub Pages`

## Redeploy Pages with current tunnel

```powershell
.\scripts\temp-deploy\redeploy-pages.ps1
```

Use this when frontend changes and you want to keep the same tunnel URL.

## Stop temporary backend

```powershell
.\scripts\temp-deploy\stop-temp-backend.ps1
```

## Notes for future increments

- Tunnel URLs are ephemeral. Restarting tunnel usually changes URL.
- If URL changes, rerun `start-temp-backend.ps1` or `redeploy-pages.ps1`.
- If Pages build fails, check:
  - workflow `Deploy Web to GitHub Pages`
  - repo variable `VITE_SOCKET_URL`
  - backend health endpoint: `<tunnel-url>/health`
