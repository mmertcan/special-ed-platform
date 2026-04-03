# special-ed-platform

## What exists now

- `backend/`: FastAPI API with auth, admin setup routes, and daily feed routes
- `frontend/`: Next.js app foundation with auth state, session restore, role redirects, and protected route wrappers

## Why the frontend foundation matters

The first frontend layer is not the feature pages themselves.
It is the plumbing that every later page depends on:

- token storage
- restore session on refresh
- call `GET /me` when the app boots
- send users to the correct route by role
- block the wrong role from opening protected pages

Without that layer, every page would duplicate auth logic and break in slightly different ways.

## Backend run

From the `backend/` folder:

```bash
uvicorn main:app --reload
```

The backend now allows browser requests from:

- `http://localhost:3000`
- `http://127.0.0.1:3000`

You can override that with the `FRONTEND_ORIGINS` environment variable.

Example:

```bash
cd backend
export FRONTEND_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.3:3000"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Seeded demo login accounts

First principle:
- browser login only works if the seeded users have real password hashes
- the app now repairs older local databases that still contain placeholder seed hashes
- that means you can test the app in the browser without first creating extra users by hand

Demo credentials:

```text
Admin   -> admin@example.com   / Pass123456!
Teacher -> teacher@example.com / Pass123456!
Parent  -> parent@example.com  / Pass123456!
```

## Frontend run

1. Go into the frontend folder.
2. Install dependencies.
3. Set the backend base URL.
4. Start the Next.js dev server.

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

`frontend/.env.local` should contain:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

For phone testing on the same Wi-Fi, replace `127.0.0.1` with your Mac's local IP:

```bash
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.3:8000
```

Then run:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

## Phone testing on the same Wi-Fi

First principle:
- `localhost` on your Mac means your Mac
- `localhost` on your phone means your phone
- so your phone must use your Mac's local network IP

1. Make sure both devices are on the same Wi-Fi.
2. Find your Mac IP:

```bash
ipconfig getifaddr en0
```

If that returns nothing:

```bash
ipconfig getifaddr en1
```

3. Start the backend with your phone origin allowed:

```bash
cd backend
export FRONTEND_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,http://YOUR_MAC_IP:3000"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

4. Start the frontend bound to your local network:

```bash
cd frontend
npm run dev -- --hostname 0.0.0.0 --port 3000
```

5. Set `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://YOUR_MAC_IP:8000
```

6. Open the app on your phone:

```text
http://YOUR_MAC_IP:3000
```

7. Quick backend check from the phone:

```text
http://YOUR_MAC_IP:8000/health
```

If login still fails with a generic network-style message, the usual causes are:
- backend is not running on `0.0.0.0`
- `FRONTEND_ORIGINS` does not include `http://YOUR_MAC_IP:3000`
- `NEXT_PUBLIC_API_BASE_URL` still points to `127.0.0.1`

## What works in the frontend right now

- root route decides whether to send the user to `/login`, `/admin`, `/teacher`, or `/parent/feed`
- saved token is read from `localStorage`
- app boot calls `GET /me`
- invalid token is cleared
- authenticated users are redirected away from `/login`
- protected routes reject the wrong role
- logout clears the session and routes back to `/login`

## Photo upload backend foundation

The backend now supports the first real photo-upload MVP path:

1. Create a daily text post with `POST /students/{student_id}/daily-feed`
2. Upload one image for that post with `POST /daily-feed/{post_id}/media`
3. Read the post back through `GET /students/{student_id}/daily-feed`

For MVP, uploaded files are stored on the local filesystem under:

```text
backend/uploads/daily-feed/<post_id>/
```

Feed responses now include a `media_items` array on each post.

## What is intentionally not built yet

- photo upload flow for daily feed posts
- weekly homework routes and pages
- schedule/class program routes and pages
