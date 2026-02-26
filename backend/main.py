# backend/main.py

from datetime import datetime, timezone
import sqlite3

from contextlib import asynccontextmanager
from auth import AuthUser, require_any_user, require_teacher

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from db import init_db, insert_daily_feed_entry, fetch_daily_feed_entries


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("LIFESPAN STARTUP: init_db() running")
    yield
    
app = FastAPI(lifespan=lifespan)



STUDENTS = [
    {"id": 1, "name": "Ayse"},
    {"id": 2, "name": "Memo"},
    {"id": 15, "name": "Jason"},
    {"id": 14, "name": "Jikan"},
    {"id": 22, "name": "Tobby"},
]

class DailyFeedCreateRequest(BaseModel):
    note: str 




@app.get("/health")
def health_check():
    return {"status":"ok", "service":"special-ed-platform-backend"}
    
@app.get("/students")
def list_students():
    return STUDENTS


def assert_student_exists(student_id: int) -> None:
    student_exists = any(s["id"] == student_id for s in STUDENTS)
    if not student_exists:
        raise HTTPException(status_code=404, detail="student not found")


@app.post("/students/{student_id}/daily-feed")
def create_daily_feed_entry(
    student_id: int, 
    payload: DailyFeedCreateRequest,
    user: AuthUser = Depends(require_teacher),
    ):
    # 1) Validate student exists (API concern)
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
        "created_by_role": user.role
    }

    return {"ok": True, "entry": entry}


@app.get("/students/{student_id}/daily-feed")
def get_daily_feed(
    student_id: int,
    user: AuthUser = Depends(require_any_user),
    ):
    # 1) Validate student exists (API concern)
    assert_student_exists(student_id)

    # 2) Read from DB (DB concern)
    entries = fetch_daily_feed_entries(student_id=student_id)

    return {"ok": True, "student_id": student_id,
            "viewer_role": user.role,
            "entries": entries}