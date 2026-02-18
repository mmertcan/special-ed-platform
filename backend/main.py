# backend/main.py

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI () # create a FastAPI object from the FastAPI class

STUDENTS = [
    {"id": 1, "name": "Ayse"},
    {"id": 2, "name": "Memo"},
]

DAILY_FEED_BY_STUDENT_ID: dict[int, list[dict]] = {}

class DailyFeedCreateRequest(BaseModel):
    note: str


@app.get("/health")
def health_check():
    return {"status":"ok", "service":"special-ed-platform-backend"}
    
@app.get("/students")
def list_students():
    return STUDENTS

@app.post("/students/{student_id}/daily-feed")
def create_daily_feed_entry(student_id: int, payload: DailyFeedCreateRequest):
    # 1) Validate student exists
    student_exists = any(s["id"] == student_id for s in STUDENTS)
    if not student_exists:
        raise HTTPException(status_code=404, detail="student not found")

    # 2) Validate note
    note_clean = payload.note.strip()
    if not note_clean:
        raise HTTPException(status_code=400, detail="note cannot be empty")

    # 3) Create entry
    entry = {
        "id": int(datetime.now(timezone.utc).timestamp()),
        "student_id": student_id,
        "type": "note",
        "note": note_clean,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
    }

    # 4) Store entry
    if student_id not in DAILY_FEED_BY_STUDENT_ID:
        DAILY_FEED_BY_STUDENT_ID[student_id] = []

    DAILY_FEED_BY_STUDENT_ID[student_id].append(entry)

    # 5) Respond
    return {"ok": True, "entry": entry}

