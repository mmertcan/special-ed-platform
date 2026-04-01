# Teacher-Parent Daily Feed MVP Roadmap

## Product goal

Build the fastest usable web MVP for one school where:

- a teacher selects an assigned student
- a teacher writes what they taught that day
- a teacher optionally uploads one photo
- a parent opens a feed and sees updates only for their linked child

This MVP is intentionally narrow.
The goal is to get the core teacher-to-parent daily communication loop working before adding broader school workflows.

## Scope boundaries

### In scope

- admin user setup
- admin student setup
- teacher-to-student assignment
- parent-to-student assignment
- teacher student list
- teacher posting page
- parent feed page
- one optional image per post

### Out of scope

- video uploads
- post editing
- post deletion
- comments
- reactions
- notifications
- AI features
- multi-school support

## Delivery phases

## Phase 0 — Access and bootstrap fixes
- [ ] Make seeded or bootstrap accounts usable with the real `POST /auth/login` flow
- [ ] Verify session restore works through `GET /me` for admin, teacher, and parent roles
- [ ] Remove reliance on manual seeded bearer tokens for normal browser testing

## Phase 1 — Admin setup completion
- [ ] Finish the admin assignments web page
- [ ] Fetch active teachers with `GET /admin/users?role=teacher&is_active=true`
- [ ] Keep fetching active parents with `GET /admin/users?role=parent&is_active=true`
- [ ] Add teacher selector
- [ ] Add parent selector action for `POST /admin/assign-parent`
- [ ] Add teacher selector action for `POST /admin/assign-teacher`
- [ ] Show current teacher and parent assignments for the selected student

## Phase 2 — Text-only feed MVP
- [ ] Build teacher student list using `GET /me/students`
- [ ] Add teacher feed publishing page for one selected student
- [ ] Use `POST /students/{student_id}/daily-feed` for text note publishing
- [ ] Build parent feed page using `GET /me/students`
- [ ] Add child switcher for parents with more than one linked student
- [ ] Use `GET /students/{student_id}/daily-feed` to render newest-first entries

## Phase 3 — Single-photo upload MVP
- [ ] Add one optional image upload to the teacher daily post flow
- [ ] Store upload files on local disk for the MVP
- [ ] Save media metadata into `daily_feed_media`
- [ ] Extend feed responses so each post can return its media items
- [ ] Render uploaded images in teacher and parent feed views

## Phase 4 — Hardening and test coverage
- [ ] Add validation for empty note bodies, invalid student ids, file type, and file size
- [ ] Apply student-level authorization rules to feed reads, feed writes, and media access
- [ ] Add backend test coverage for login, assignments, feed creation, feed reading, upload validation, and media authorization
- [ ] Check frontend loading, empty, success, and error states for admin, teacher, and parent flows

## Timeline estimate

- Text-only teacher-parent feed MVP: `2-3 working days`
- Photo-enabled MVP: `5-7 working days`

These estimates assume:

- one school only
- no cloud storage integration
- no design overhaul
- no extra workflows beyond the daily feed loop

## Acceptance criteria

- [ ] Admin can create a teacher, parent, and student
- [ ] Admin can assign one teacher and one parent to a student
- [ ] Teacher can log in and see only assigned students
- [ ] Teacher can publish a daily note for an assigned student
- [ ] Teacher can publish a daily note with one photo
- [ ] Parent can log in and see only feed entries for linked students
- [ ] Parent can switch between linked children when more than one student is assigned
- [ ] Unrelated parents, teachers, or anonymous users are blocked from reading or writing another student's feed

## Risks and blockers

- Seeded password hashes are placeholders, so login bootstrapping is not fully aligned with the real password verification path yet
- Photo upload storage does not exist yet, even though `daily_feed_media` already exists in the schema
- Feed responses currently return posts without media payloads
- Teacher and parent routes exist, but the actual feature pages are still placeholders
- Local disk uploads are fast for MVP development, but they are not the same as production-grade object storage

## Tech requirements

### Backend

- FastAPI remains the backend framework
- SQLite remains the MVP database
- Authentication remains bearer-token based
- `POST /students/{student_id}/daily-feed` must support multipart form submission for text plus an optional image
- `GET /students/{student_id}/daily-feed` must return media metadata together with each feed post
- A protected media access path must be added so image reads follow the same authorization rules as feed reads

### Storage

- Use local filesystem storage for uploaded images in the MVP
- Define one upload root directory, for example `backend/uploads/`
- Generate stored file names instead of trusting the original user file name
- Store media metadata in `daily_feed_media`
- Limit allowed image formats to:
  - `jpg`
  - `jpeg`
  - `png`
  - `webp`

### Frontend

- Keep Next.js App Router as the frontend foundation
- Add teacher student list page
- Add teacher feed publish page
- Add parent child switcher
- Add parent feed list page
- Add shared frontend types for:
  - students returned from `GET /me/students`
  - daily feed entries
  - daily feed media items

### Authorization

- Only assigned teachers can create daily feed posts for a student
- Only assigned parents, assigned teachers, and admins can read a student's feed
- Media access must use the same student-level authorization rule as feed access

### Validation

- Reject empty note bodies after trimming unless product scope is explicitly changed to allow photo-only posts
- Reject unsupported image types
- Reject oversized uploads with a clear limit
- Reject invalid or missing student ids

### Testing

- Backend tests must cover:
  - login
  - assignments
  - daily feed creation
  - daily feed reading
  - upload validation
  - media authorization
- Frontend checks must cover:
  - role-based routing
  - loading states
  - empty states
  - error states
  - teacher create flow
  - parent feed rendering

### Dev and environment setup

- Document `NEXT_PUBLIC_API_BASE_URL`
- Document allowed frontend origins if they change
- Document the upload directory path if it becomes configurable
- Ensure local development has:
  - backend dependencies installed
  - frontend dependencies installed
  - a writable upload directory

## Defaults and assumptions

- Fastest MVP scope, not pilot-ready or production-ready scope
- Single-school deployment
- One optional photo per post
- Newest-first feed ordering
- Parent experience is read-only
- The new file is additive only and does not replace `roadmap.md`
