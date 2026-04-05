# Deployment Roadmap

Target architecture for the pilot: `app.<domain>` on `Vercel Pro`, `api.<domain>` on a single `Hetzner CX23`, with `FastAPI + SQLite + local uploads` running on the backend server. Rough recurring infrastructure cost for Option 2 is `Vercel Pro ($20/mo) + Hetzner CX23 (€3.49/mo) + Hetzner IPv4 (€0.50/mo) + Hetzner server backups (~€0.70/mo)`, before VAT/tax.

This option is chosen because it is the lowest-complexity setup that still adds real operational discipline: public frontend hosting, a production server, TLS, process supervision, and server backups, without introducing extra moving parts like PostgreSQL, Docker, or object storage.

## Target Architecture
- `app.<domain>` -> `Vercel Pro` -> Next.js frontend from `frontend/`
- `api.<domain>` -> `nginx` -> `uvicorn` -> FastAPI backend from `backend/`
- Production SQLite database path on server: `/srv/special-ed-platform/shared/data/app.db`
- Production uploads directory on server: `/srv/special-ed-platform/shared/uploads`
- App code checkout on server: `/srv/special-ed-platform/current`
- Python virtualenv on server: `/srv/special-ed-platform/venv`
- Production env file on server: `/srv/special-ed-platform/shared/.env`
- Hetzner server backups must be enabled for the backend VM

## Current State
- Backend exists in `backend/` and is a FastAPI application.
- Frontend exists in `frontend/` and is a Next.js application.
- SQLite is currently hardcoded in [`backend/db.py`](backend/db.py) as a local file inside the backend directory.
- Uploads are currently hardcoded in [`backend/main.py`](backend/main.py) as a local folder inside the backend directory.
- Demo seeding currently runs on empty database startup in [`backend/db.py`](backend/db.py).
- The backend currently seeds demo users, demo session tokens, demo students, and sample feed data when the database is empty.
- The frontend already builds successfully for production with `next build`.
- There is currently no production env template, no `systemd` service file, no `nginx` config, and no deployment runbook in the repo.

## Production Gaps To Close
- [ ] Make the database path configurable with an environment variable.
- [ ] Make the uploads path configurable with an environment variable.
- [ ] Disable demo seeding in production.
- [ ] Add a first-admin bootstrap path for a real production admin.
- [ ] Add a `systemd` service definition for the backend process.
- [ ] Add an `nginx` reverse proxy config for `api.<domain>`.
- [ ] Add a production env template for the backend.
- [ ] Add backup and restore instructions for the chosen Option 2 setup.

## Phase 1 — Production-Safe Code Changes
- [ ] Add `APP_DB_PATH` support in `backend/db.py`.
- [ ] Default `APP_DB_PATH` to the current local development path when the env var is not set.
- [ ] Add `APP_UPLOADS_DIR` support in `backend/main.py`.
- [ ] Default `APP_UPLOADS_DIR` to the current local development uploads path when the env var is not set.
- [ ] Add `ENABLE_DEMO_SEEDING` support in `backend/db.py`.
- [ ] Keep `ENABLE_DEMO_SEEDING=true` as the local default so current local development still works.
- [ ] Make production use `ENABLE_DEMO_SEEDING=false`.
- [ ] Add `SESSION_DURATION_DAYS` support in `backend/main.py` so session lifetime is configurable from the environment.
- [ ] Add a first-admin bootstrap script in the backend, for example `backend/scripts/bootstrap_admin.py`.
- [ ] Make the bootstrap script create one real admin user with a hashed password and no demo seed data.
- [ ] Add `backend/.env.example` with these exact variables:

```env
APP_ENV=production
APP_DB_PATH=/srv/special-ed-platform/shared/data/app.db
APP_UPLOADS_DIR=/srv/special-ed-platform/shared/uploads
FRONTEND_ORIGINS=https://app.<domain>
ENABLE_DEMO_SEEDING=false
SESSION_DURATION_DAYS=21
```

- [ ] Add a `deploy/` directory in the repo root.
- [ ] Add `deploy/systemd/special-ed-platform.service`.
- [ ] Add `deploy/nginx/api.conf`.
- [ ] Add `docs` or root-level deployment instructions only for this Option 2 architecture.
- [ ] Ensure local development behavior remains unchanged after these production-safe changes.

## Phase 2 — GitHub And Vercel Setup
- [ ] Push the local repository to GitHub.
- [ ] Use `main` as the production branch.
- [ ] Verify the latest local code is committed before linking GitHub to Vercel.
- [ ] Create a Vercel project from the GitHub repository.
- [ ] Set the Vercel project root directory to `frontend`.
- [ ] Confirm Vercel detects the project as Next.js.
- [ ] Add the production frontend environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.<domain>
```

- [ ] Trigger a production build on Vercel.
- [ ] Confirm the build succeeds before adding the custom domain.
- [ ] Connect the custom frontend domain `app.<domain>` in Vercel.
- [ ] Add the required DNS records for the Vercel frontend domain.
- [ ] Confirm `https://app.<domain>` loads successfully after DNS propagation.

## Phase 3 — Hetzner Server Setup
- [ ] Create one Hetzner Cloud server with plan `CX23`.
- [ ] Set the Hetzner location to `nbg1`.
- [ ] Set the server image to `Ubuntu 24.04 LTS`.
- [ ] Attach your SSH public key during server creation.
- [ ] Enable Hetzner server backups immediately after server creation.
- [ ] Ensure the server has public IPv4 enabled.
- [ ] Ensure the server also has IPv6 enabled.
- [ ] Configure Hetzner firewall rules to allow `80`, `443`, and `22`.
- [ ] Restrict `22` to your own admin IP if possible.
- [ ] SSH into the server as root for initial bootstrap.
- [ ] Run system package updates:

```bash
apt update
apt upgrade -y
```

- [ ] Install required packages:

```bash
apt install -y nginx python3.11 python3.11-venv certbot python3-certbot-nginx sqlite3 git
```

- [ ] Create the application directory structure:

```bash
mkdir -p /srv/special-ed-platform/current
mkdir -p /srv/special-ed-platform/shared/data
mkdir -p /srv/special-ed-platform/shared/uploads
mkdir -p /srv/special-ed-platform/venv
```

- [ ] Disable SSH password login after confirming SSH key access works.
- [ ] Keep the server setup limited to one VM for this pilot.

## Phase 4 — Backend Deployment
- [ ] Clone the repository onto the server into `/srv/special-ed-platform/current`.
- [ ] Create the Python virtual environment in `/srv/special-ed-platform/venv`.
- [ ] Install backend dependencies from `backend/requirements.txt`.
- [ ] Copy `backend/.env.example` into `/srv/special-ed-platform/shared/.env` and fill in real values.
- [ ] Set `APP_DB_PATH=/srv/special-ed-platform/shared/data/app.db`.
- [ ] Set `APP_UPLOADS_DIR=/srv/special-ed-platform/shared/uploads`.
- [ ] Set `FRONTEND_ORIGINS=https://app.<domain>`.
- [ ] Set `ENABLE_DEMO_SEEDING=false`.
- [ ] Set `SESSION_DURATION_DAYS=21`.
- [ ] Install the `systemd` service file from `deploy/systemd/special-ed-platform.service`.
- [ ] Ensure the backend runs as a managed service and restarts on failure.
- [ ] Bind `uvicorn` to `127.0.0.1:8000`.
- [ ] Install the `nginx` config from `deploy/nginx/api.conf`.
- [ ] Point `nginx` at `http://127.0.0.1:8000`.
- [ ] Configure `server_name api.<domain>;` in the nginx site config.
- [ ] Enable the nginx site and reload nginx.
- [ ] Issue the TLS certificate for `api.<domain>` using `certbot`.
- [ ] Confirm `https://api.<domain>/health` returns `200`.
- [ ] Confirm uploaded files remain served from `https://api.<domain>/uploads/...`.

## Phase 5 — Data Bootstrap
- [ ] Run the first-admin bootstrap script exactly once on production.
- [ ] Create one real admin account with a real email and password.
- [ ] Verify that `admin@example.com` does not exist in production.
- [ ] Verify that `teacher@example.com` does not exist in production.
- [ ] Verify that `parent@example.com` does not exist in production.
- [ ] Verify that demo session tokens were not created in production.
- [ ] Log in as the real admin through the frontend at `https://app.<domain>`.
- [ ] Create the real teacher accounts for the pilot.
- [ ] Create the real parent accounts for the pilot.
- [ ] Create the real student records for the pilot.
- [ ] Create the required teacher-to-student assignments.
- [ ] Create the required parent-to-student assignments.
- [ ] Verify teachers only see their assigned students.
- [ ] Verify parents only see their linked children.

## Phase 6 — Backup And Recovery
- [ ] Confirm in the Hetzner console that server backups are enabled for the production VM.
- [ ] Treat the Hetzner server backup as the recovery path for Option 2.
- [ ] Document the exact restore procedure in the repo.
- [ ] State clearly that code on the server is expected to be protected by the server backup.
- [ ] State clearly that the SQLite database at `/srv/special-ed-platform/shared/data/app.db` is expected to be protected by the server backup.
- [ ] State clearly that uploads at `/srv/special-ed-platform/shared/uploads` are expected to be protected by the server backup.
- [ ] State clearly that Option 2 does not include a separate off-server backup copy.
- [ ] Require one restore drill before pilot launch.
- [ ] During the restore drill, verify that the SQLite file is present after restore.
- [ ] During the restore drill, verify that uploaded images are present after restore.
- [ ] During the restore drill, verify that the backend starts successfully after restore.

## Phase 7 — Pilot Readiness Checklist
- [ ] `https://api.<domain>/health` returns a healthy response.
- [ ] `https://app.<domain>` loads over HTTPS.
- [ ] Admin login works.
- [ ] Teacher login works.
- [ ] Parent login works.
- [ ] Session restore works after browser refresh.
- [ ] Teacher can create a text-only daily note.
- [ ] Teacher can create a daily note with an image upload.
- [ ] Parent can see the correct linked child feed.
- [ ] Wrong-role access is denied on protected routes and backend endpoints.
- [ ] Image URLs load correctly from `https://api.<domain>/uploads/...`.
- [ ] Rebooting the server does not lose the database.
- [ ] Rebooting the server does not lose uploaded media.
- [ ] The backend process restarts automatically after a reboot.

## Acceptance Criteria
- [ ] `https://app.<domain>` is publicly reachable and serves the frontend.
- [ ] `https://api.<domain>` is publicly reachable and serves the backend API.
- [ ] Production contains no demo seed accounts.
- [ ] Production contains no demo session tokens.
- [ ] The database persists across deploys and reboots.
- [ ] Uploaded files persist across deploys and reboots.
- [ ] Hetzner server backups are enabled.
- [ ] Admin, teacher, and parent end-to-end flows all work in production.
- [ ] The deployment document leaves no critical deployment decision open for Option 2.

## Open Risks
- SQLite remains a single-node database and is not designed for horizontal scaling.
- Option 2 has no separate off-server backup copy beyond the Hetzner server backups.
- Backend automated tests still need to be run in an environment where Python test dependencies are installed.
