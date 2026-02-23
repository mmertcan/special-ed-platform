# backend/main.py

from datetime import datetime, timezone
import sqlite3

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI () # create a FastAPI object from the FastAPI class

DB_PATH = "app.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Read rows like dicts
    return conn

def init_db() -> None:
    conn = get_db_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_feed_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                note TEXT,
                created_at_utc TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def on_startup():
    init_db()




STUDENTS = [
    {"id": 1, "name": "Ayse"},
    {"id": 2, "name": "Memo"},
    {"id": 15, "name": "Jason"},
    {"id": 14, "name": "Jikan"},
    {"id": 22, "name": "Tobby"},
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
    
    created_at = datetime.now(timezone.utc).isoformat()


    # 3) Create entry

    conn = get_db_connection()
    try:
        curr = conn.execute(
            """
            INSERT INTO daily_feed_entries (student_id, type, note, created_at_utc)
            VALUES(?,?,?,?)
            """,
            (student_id, "note", note_clean, created_at),
        )

        conn.commit()
        new_id = curr.lastrowid
    finally:
        conn.close()
    entry = {
        "id": new_id,
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




@app.get("/students/{student_id}/daily-feed")
def get_daily_feed(student_id: int):
    # 1) Validate student exists
    student_exists = any(s["id"] == student_id for s in STUDENTS)
    if not student_exists:
        raise HTTPException(status_code=404, detail="student not found")

    # 2) Read from DB
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, student_id, type, note, created_at_utc
            FROM daily_feed_entries
            WHERE student_id = ?
            ORDER BY id DESC
            """,
            (student_id,),
        ).fetchall()
    finally:
        conn.close()

    entries = [dict(r) for r in rows]
    return {"ok": True, "student_id": student_id, "entries": entries}
