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
