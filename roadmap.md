# MVP Roadmap

## Phase 1 — Backend foundation
- [x] FastAPI server
- [x] SQLite database
- [x] Authentication
- [x] Authorization

## Phase 2 — Admin operations
- [x] Teacher assignment API
- [x] Parent assignment API
- [x] Login/logout endpoint
- [x] Me endpoint to restore session and route by role
- [ ] Student management
- [ ] Admin web dashboard

## Phase 3 — Daily classroom feed
- [x] Post notes API
- [ ] Upload photos
- [ ] Parent viewing web page
- [ ] Teacher feed publishing web page

## Phase 4 — Core school workflows
- [ ] Weekly homework
- [ ] Class program
- [ ] Parent weekly overview

## Phase 5 — Future AI features
- [ ] AI lesson summaries
- [ ] Homework assistant

## Immediate next steps — Fastest MVP path
- [x] POST /auth/login
- [x] POST /auth/logout
- [x] GET /me
- [x] GET /me/students
- [x] POST /admin/users
- [x] GET /admin/users
- [x] POST /admin/students
- [x] GET /admin/students

## Frontend MVP build checklist

Assessment date: `2026-04-01`

### First principle
- A frontend feature is only usable when these 4 pieces exist together:
- [x] route
- [x] auth and role protection
- [ ] real feature data flow
- [ ] success, empty, and error behavior for the actual MVP task

### Foundation already present in the codebase
- [x] Next.js App Router frontend exists
- [x] Shared `apiRequest()` helper exists for authenticated JSON requests
- [x] Session token is stored in `localStorage`
- [x] Auth provider restores the session through `GET /me`
- [x] Role router exists:
- [x] admin -> `/admin`
- [x] teacher -> `/teacher`
- [x] parent -> `/parent/feed`
- [x] Protected routes exist for admin, teacher, and parent pages
- [x] Public-only login guard exists
- [x] Login form uses the real `POST /auth/login` flow
- [x] Logout button uses the real `POST /auth/logout` flow

### Phase 0 — Access and bootstrap
- [ ] Seeded demo accounts work with the real browser login flow
- [x] Session restore is implemented through `GET /me`
- [ ] Normal browser testing is fully independent from manual seeded bearer tokens

### Phase 1 — Admin setup completion
- [x] Admin landing page exists
- [x] Admin users page is wired to `GET /admin/users`
- [x] Admin users page can create teacher accounts with `POST /admin/users`
- [x] Admin users page can create parent accounts with `POST /admin/users`
- [x] Admin users page supports role and active filters
- [x] Admin students page is wired to `GET /admin/students`
- [x] Admin students page can create students with `POST /admin/students`
- [x] Admin students page supports active and inactive filters
- [x] Admin assignments page is wired
- [x] Admin assignments page fetches students from `GET /admin/students`
- [x] Admin assignments page fetches active parents from `GET /admin/users?role=parent&is_active=true`
- [x] Admin assignments page fetches active teachers from `GET /admin/users?role=teacher&is_active=true`
- [x] Admin assignments page lets admin assign a parent with `POST /admin/assign-parent`
- [x] Admin assignments page lets admin assign a teacher with `POST /admin/assign-teacher`
- [x] Admin assignments page shows current teacher and parent assignments for the selected student

### Shared frontend feed contracts
- [x] Add a dedicated frontend response type for `GET /me/students`
- [x] Add a dedicated frontend type for daily feed entries
- [x] Add a dedicated frontend type for daily feed media items

### Phase 2 — Teacher text-only feed MVP
- [x] Teacher landing page exists and is protected
- [x] `/teacher/students` route exists
- [x] `/teacher/students` fetches assigned students from `GET /me/students`
- [x] `/teacher/students` renders assigned students
- [x] `/teacher/students` shows an empty state when no students are assigned
- [x] `/teacher/students` links each student to `/teacher/students/[studentId]`
- [x] Create `/teacher/students/[studentId]`
- [x] Verify that the route `studentId` belongs to the logged-in teacher
- [x] Fetch feed history from `GET /students/{student_id}/daily-feed`
- [x] Render newest-first feed entries for the selected student
- [x] Build a daily note composer
- [x] Post text notes with `POST /students/{student_id}/daily-feed`
- [x] On success, clear the draft and prepend the new note
- [x] On failure, keep the draft and show the backend error

### Phase 2 — Parent text-only feed MVP
- [x] Parent protected route exists at `/parent/feed`
- [ ] `/parent/feed` fetches linked students from `GET /me/students`
- [ ] Show an empty state when the parent has zero linked children
- [ ] Auto-select the child when the parent has exactly one linked student
- [ ] Render a child switcher when the parent has more than one linked student
- [ ] Load the selected child feed from `GET /students/{student_id}/daily-feed`
- [ ] Render newest-first feed entries
- [ ] Show loading, empty, and error states for both student selection and feed loading

### Phase 3 — Single-photo upload MVP
- [ ] Add an optional image picker to the teacher daily post flow
- [ ] Show a local preview before upload
- [ ] Add a frontend request path for multipart text + optional image submission
- [ ] Extend frontend feed types so posts can include media items
- [ ] Render uploaded images in teacher feed history
- [ ] Render uploaded images in parent feed entries
- [ ] Show frontend validation messages for unsupported file types and oversized files

### Phase 4 — Frontend hardening and verification
- [x] Admin setup flows already show loading, success, and error states
- [ ] Teacher flow has complete loading, empty, success, and error states
- [ ] Parent flow has complete loading, empty, success, and error states
- [ ] Verify teacher users only see their assigned students
- [ ] Verify parent users only see their linked children
- [ ] Verify unauthorized roles are redirected away from protected pages
- [ ] Verify frontend behavior for backend validation errors on feed creation and upload

### Current MVP status snapshot
- [x] Auth foundation is implemented
- [x] Login, session restore, logout, and role redirects are implemented
- [x] Admin users, students, and assignments pages are implemented
- [ ] Teacher assigned-student list is not implemented yet
- [ ] Teacher daily feed publish page is not implemented yet
- [ ] Parent feed page is not implemented yet
- [ ] Photo upload UI is not implemented yet
- [ ] Shared frontend feed types are not implemented yet

### Recommended frontend build order from here
- [x] 1. Auth foundation and login
- [x] 2. Admin users
- [x] 3. Admin students
- [x] 4. Admin assignments
- [ ] 5. Shared frontend feed types
- [ ] 6. Teacher assigned-student list
- [ ] 7. Teacher student detail page with text composer
- [ ] 8. Parent feed with child switcher
- [ ] 9. Photo upload flow
- [ ] 10. Frontend hardening pass
