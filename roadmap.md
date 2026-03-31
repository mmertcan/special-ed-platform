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

## Frontend implementation checklist — page by page

### First principle
- A frontend page is just 4 things combined:
- [ ] route
- [ ] UI state
- [ ] API call
- [ ] success and error behavior

### Shared frontend foundation
- [x] Create a Next.js app
- [x] Choose App Router structure under `app/`
- [x] Add a shared fetch helper that attaches `Authorization: Bearer <token>`
- [x] Store session token in `localStorage` for MVP
- [x] Create a `CurrentUser` type:

```ts
type CurrentUser = {
  id: number
  role: "admin" | "teacher" | "parent"
  full_name: string
  email: string
  is_active: boolean
  created_at_utc: string
}
```

- [x] Create an auth store or auth context with this state shape:

```ts
type AuthState = {
  token: string | null
  currentUser: CurrentUser | null
  isBooting: boolean
  isAuthenticated: boolean
}
```

- [x] On app load:
- [x] read token from `localStorage`
- [x] if token exists, call `GET /me`
- [x] if token is valid, store `currentUser`
- [x] if token is invalid, clear token and send user to `/login`
- [x] Create a role router:
- [x] admin -> `/admin`
- [x] teacher -> `/teacher`
- [x] parent -> `/parent/feed`
- [x] Create route guards:
- [x] unauthenticated users go to `/login`
- [x] authenticated users cannot open `/login`
- [x] admin-only pages reject teacher and parent users
- [x] teacher-only pages reject admin and parent users
- [x] parent-only pages reject admin and teacher users
- [x] Create shared UI states:
- [x] loading screen while restoring session
- [x] empty state
- [x] error banner
- [x] logout button that calls `POST /auth/logout`, clears local token, and routes to `/login`

### `/login`
- [x] Build login form with `email` and `password`
- [x] Add submit loading state
- [x] POST form to `POST /auth/login`
- [x] On success:
- [x] store returned token in `localStorage`
- [x] store returned user in auth state
- [x] route by `user.role`
- [x] On invalid credentials:
- [x] show backend error message
- [x] keep user on `/login`
- [x] If already logged in, immediately redirect by role
- [x] Acceptance check:
- [x] admin lands on `/admin`
- [x] teacher lands on `/teacher`
- [x] parent lands on `/parent/feed`

### `/admin`
- [x] Create a minimal admin landing page
- [x] Show current admin name and email
- [x] Add navigation links:
- [x] `/admin/users`
- [x] `/admin/students`
- [x] `/admin/assignments`
- [x] Protect route for admin role only

### `/admin/users`
- [x] Create a protected placeholder route for `/admin/users`
- [x] Fetch `GET /admin/users` on page load
- [x] Render table or list of users
- [x] Show columns:
- [x] full name
- [x] email
- [x] role
- [x] active status
- [x] created time
- [x] Add role filter:
- [x] all
- [x] admin
- [x] teacher
- [x] parent
- [x] Wire role filter to query string, example:
- [x] `GET /admin/users?role=teacher`
- [x] Add active filter:
- [x] all
- [x] active
- [x] inactive
- [x] Wire active filter to query string, example:
- [x] `GET /admin/users?is_active=true`
- [x] Build create user form with fields:
- [x] full_name
- [x] email
- [x] password
- [x] role
- [x] is_active
- [x] POST form to `POST /admin/users`
- [x] On success:
- [x] clear form
- [x] refresh user list
- [x] show success message
- [x] On failure:
- [x] show field or server error
- [x] keep entered values
- [ ] Acceptance check:
- [x] admin can create teacher
- [x] admin can create parent
- [x] admin can filter by role and active status

### `/admin/students`
- [x] Create a protected placeholder route for `/admin/students`
- [x] Fetch `GET /admin/students` on page load
- [x] Render table or list of students
- [x] Show columns:
- [x] full name
- [x] active status
- [x] created time
- [x] Add active filter:
- [x] all
- [x] active
- [x] inactive
- [x] Wire filter to query string, example:
- [x] `GET /admin/students?is_active=false`
- [x] Build create student form with fields:
- [x] full_name
- [x] is_active
- [x] POST form to `POST /admin/students`
- [x] On success:
- [x] clear form
- [x] refresh student list
- [x] show success message
- [x] On failure:
- [x] show server error
- [x] keep entered values
- [ ] Acceptance check:
- [x] admin can create student
- [x] admin can filter active and inactive students

### `/admin/assignments`
- [x] Create a protected placeholder route for `/admin/assignments`
- [x] Fetch students from `GET /admin/students`
- [x] Fetch parents from `GET /admin/users?role=parent&is_active=true`
- [ ] Fetch teachers from `GET /admin/users?role=teacher&is_active=true`
- [x] Build student selector
- [x] Build parent selector
- [ ] Build teacher selector
- [x] Add "Assign parent" action:
- [x] POST to `POST /admin/assign-parent`
- [x] body shape:

```json
{
  "parent_user_id": 3,
  "student_id": 1
}
```

- [ ] Add "Assign teacher" action:
- [ ] POST to `POST /admin/assign-teacher`
- [ ] body shape:

```json
{
  "teacher_user_id": 2,
  "student_id": 1
}
```

- [x] Show current assignments for the selected student
- [x] Backend blocker resolved:
- [x] add `GET /admin/assignments?student_id=123`
- [x] Read response is available for frontend wiring:

```json
{
  "ok": true,
  "student": {
    "id": 123,
    "full_name": "Ayse",
    "is_active": true
  },
  "parents": [
    {
      "id": 3,
      "full_name": "Parent User",
      "email": "parent@example.com",
      "is_active": true,
      "relationship_label": "mother"
    }
  ],
  "teachers": [
    {
      "id": 2,
      "full_name": "Teacher User",
      "email": "teacher@example.com",
      "is_active": true
    }
  ]
}
```

- [x] Admin assignments can now read current links once the frontend page is wired
- [ ] Acceptance check:
- [ ] admin can assign teacher to student
- [x] admin can assign parent to student
- [x] admin can see current links for a student

### `/teacher`
- [x] Create a minimal teacher landing page
- [x] Show current teacher name and email
- [x] Add navigation link to `/teacher/students`
- [x] Protect route for teacher role only

### `/teacher/students`
- [x] Create a protected placeholder route for `/teacher/students`
- [ ] Fetch `GET /me/students`
- [ ] Render only assigned students
- [ ] Each student card links to `/teacher/students/[studentId]`
- [ ] Show on each card:
- [ ] student name
- [ ] active status
- [ ] student id if needed for debugging
- [ ] Handle empty state:
- [ ] "No students assigned yet"
- [ ] Acceptance check:
- [ ] teacher sees only linked students
- [ ] teacher can open a student detail page

### `/teacher/students/[studentId]`
- [ ] Read `studentId` from route params
- [ ] Fetch teacher student list from `GET /me/students`
- [ ] Verify the route student exists inside teacher-visible students
- [ ] If not found, show access denied or not found state
- [ ] Fetch student feed from `GET /students/{student_id}/daily-feed`
- [ ] Render page sections:
- [ ] student header
- [ ] daily note composer
- [ ] feed history list
- [ ] Build note composer with field:
- [ ] `body`
- [ ] POST note to `POST /students/{student_id}/daily-feed`
- [ ] request shape:

```json
{
  "body": "Bugun iletisim calismasinda guzel ilerleme oldu."
}
```

- [ ] On successful post:
- [ ] clear textarea
- [ ] prepend new note to feed list
- [ ] On failure:
- [ ] show backend error
- [ ] keep draft text
- [ ] Sort feed newest first using `posted_at_utc`
- [ ] Acceptance check:
- [ ] teacher can create a daily note
- [ ] newly created note appears in the list

### `/parent/feed`
- [x] Create a protected parent landing route for `/parent/feed`
- [ ] Fetch `GET /me/students`
- [ ] If parent has zero children:
- [ ] show empty state
- [ ] If parent has one child:
- [ ] auto-select that child
- [ ] auto-load `GET /students/{student_id}/daily-feed`
- [ ] If parent has multiple children:
- [ ] render child switcher
- [ ] load selected child feed
- [ ] Render feed items in reverse chronological order
- [ ] Use feed item shape:

```json
{
  "id": 1,
  "student_id": 1,
  "body": "Ayse had a focused and positive session today.",
  "posted_at_utc": "...",
  "updated_at_utc": null
}
```

- [ ] Acceptance check:
- [ ] parent sees only linked children
- [ ] parent can switch children if multiple
- [ ] parent sees daily updates newest first

### `/teacher/students/[studentId]` image upload extension
- [ ] Keep text posting flow first
- [ ] After text post works, add file picker
- [ ] Show local preview before upload
- [ ] Backend blocker:
- [ ] add `POST /daily-feed/{post_id}/media` or a multipart combined endpoint
- [ ] Frontend flow for simple 2-step MVP:
- [ ] create post
- [ ] receive `post.id`
- [ ] upload image for that post
- [ ] On parent feed page, render image thumbnails under each post
- [ ] Acceptance check:
- [ ] teacher can attach photo
- [ ] parent can view photo in feed

### Weekly homework pages
- [ ] Backend blocker:
- [ ] add `POST /students/{student_id}/weekly-homework`
- [ ] add `GET /students/{student_id}/weekly-homework?week_start_date=YYYY-MM-DD`
- [ ] Teacher page option 1:
- [ ] extend `/teacher/students/[studentId]` with weekly homework composer
- [ ] Teacher page option 2:
- [ ] create `/teacher/students/[studentId]/homework`
- [ ] Parent page option 1:
- [ ] extend `/parent/feed` with latest homework card
- [ ] Parent page option 2:
- [ ] create `/parent/homework`
- [ ] Create form fields:
- [ ] week_start_date
- [ ] title
- [ ] body
- [ ] Acceptance check:
- [ ] teacher can publish weekly homework
- [ ] parent can view latest homework

### Schedule pages
- [ ] Backend blocker:
- [ ] add `POST /students/{student_id}/schedule-entries`
- [ ] add `GET /students/{student_id}/schedule-entries?week_start_date=YYYY-MM-DD`
- [ ] Admin page option 1:
- [ ] extend `/admin/assignments` into school setup page
- [ ] Admin page option 2:
- [ ] create `/admin/schedule`
- [ ] Parent page option:
- [ ] create `/parent/schedule`
- [ ] Build weekly list view first, not a calendar
- [ ] Create schedule form fields:
- [ ] entry_date
- [ ] start_time
- [ ] end_time
- [ ] lesson_type
- [ ] teacher_user_id
- [ ] Acceptance check:
- [ ] admin can create schedule entries
- [ ] parent can view weekly plan

### Recommended frontend build order
- [x] 1. Shared frontend foundation
- [x] 2. `/login`
- [x] 3. auth boot and role redirects
- [x] 4. `/admin`
- [ ] 5. `/admin/users`
- [ ] 6. `/admin/students`
- [ ] 7. `/admin/assignments`
- [x] 8. `/teacher`
- [ ] 9. `/teacher/students`
- [ ] 10. `/teacher/students/[studentId]`
- [x] 11. `/parent/feed`
- [ ] 12. image upload
- [ ] 13. weekly homework
- [ ] 14. schedule pages
