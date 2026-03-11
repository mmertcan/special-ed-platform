# backend/main.py

from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from auth import (
    AuthUser,
    require_admin,
    require_can_view_student,
    require_can_write_student,
)
from db import (
    init_db,
    insert_daily_feed_entry,
    fetch_daily_feed_entries,
    fetch_students,
    student_exists,
    fetch_user_by_id,
    assign_parent_to_student,
    assign_teacher_to_student,
    parent_has_student,
    teacher_has_student,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("LIFESPAN STARTUP: init_db() running")
    yield


app = FastAPI(lifespan=lifespan)


class DailyFeedCreateRequest(BaseModel):
    note: str


class AssignParentRequest(BaseModel):
    parent_user_id: str
    student_id: int


class AssignTeacherRequest(BaseModel):
    teacher_user_id: str
    student_id: int


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "special-ed-platform-backend"}


@app.get("/students")
def list_students():
    return fetch_students()


def assert_student_exists(student_id: int) -> None:
    if not student_exists(student_id=student_id):
        raise HTTPException(status_code=404, detail="student not found")


@app.post("/students/{student_id}/daily-feed")
def create_daily_feed_entry_route(
    student_id: int,
    payload: DailyFeedCreateRequest,
    user: AuthUser = Depends(require_can_write_student),
):
    # 1) Validate student exists (API boundary concern)
    assert_student_exists(student_id)

    # 2) Validate note (API concern)
    note_clean = payload.note.strip()
    if not note_clean:
        raise HTTPException(status_code=400, detail="note cannot be empty")

    created_at = datetime.now(timezone.utc).isoformat()

    # 3) Write to DB (DB concern)
    new_id = insert_daily_feed_entry(
        student_id=student_id,
        entry_type="note",
        note=note_clean,
        created_at_utc=created_at,
    )

    entry = {
        "id": new_id,
        "student_id": student_id,
        "type": "note",
        "note": note_clean,
        "created_at_utc": created_at,
        "created_by_role": user.role,
        "created_by_user_id": user.user_id,
    }

    return {"ok": True, "entry": entry}


@app.get("/students/{student_id}/daily-feed")
def get_daily_feed(
    student_id: int,
    user: AuthUser = Depends(require_can_view_student),
):
    # 1) Validate student exists (API boundary concern)
    assert_student_exists(student_id)

    # 2) Read from DB (DB concern)
    entries = fetch_daily_feed_entries(student_id=student_id)

    return {
        "ok": True,
        "student_id": student_id,
        "viewer_role": user.role,
        "viewer_user_id": user.user_id,
        "entries": entries,
    }


@app.post("/admin/assign-parent")
def assign_parent(
    payload: AssignParentRequest,
    user: AuthUser = Depends(require_admin),
):
    parent = fetch_user_by_id(user_id=payload.parent_user_id)
    if parent is None:
        raise HTTPException(status_code=404, detail="parent user not found")

    if parent["role"] != "parent":
        raise HTTPException(status_code=400, detail="user is not a parent")

    assert_student_exists(payload.student_id)

    if parent_has_student(
        parent_user_id=payload.parent_user_id,
        student_id=payload.student_id,
    ):
        raise HTTPException(status_code=409, detail="parent already assigned")

    assign_parent_to_student(
        parent_user_id=payload.parent_user_id,
        student_id=payload.student_id,
    )

    return {
        "ok": True,
        "assigned_by_user_id": user.user_id,
        "parent_user_id": payload.parent_user_id,
        "student_id": payload.student_id,
    }


@app.post("/admin/assign-teacher")
def assign_teacher(
    payload: AssignTeacherRequest,
    user: AuthUser = Depends(require_admin),
):
    teacher = fetch_user_by_id(user_id=payload.teacher_user_id)
    if teacher is None:
        raise HTTPException(status_code=404, detail="teacher user not found")

    if teacher["role"] != "teacher":
        raise HTTPException(status_code=400, detail="user is not a teacher")

    assert_student_exists(payload.student_id)

    if teacher_has_student(
        teacher_user_id=payload.teacher_user_id,
        student_id=payload.student_id,
    ):
        raise HTTPException(status_code=409, detail="teacher already assigned")

    assign_teacher_to_student(
        teacher_user_id=payload.teacher_user_id,
        student_id=payload.student_id,
    )

    return {
        "ok": True,
        "assigned_by_user_id": user.user_id,
        "teacher_user_id": payload.teacher_user_id,
        "student_id": payload.student_id,
    }
