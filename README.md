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

## What works in the frontend right now

- root route decides whether to send the user to `/login`, `/admin`, `/teacher`, or `/parent/feed`
- saved token is read from `localStorage`
- app boot calls `GET /me`
- invalid token is cleared
- authenticated users are redirected away from `/login`
- protected routes reject the wrong role
- logout clears the session and routes back to `/login`

## What is intentionally not built yet

- actual login form POSTing to `/auth/login`
- admin users page
- admin students page
- admin assignments page
- teacher students page
- teacher daily feed page
- parent feed page content
