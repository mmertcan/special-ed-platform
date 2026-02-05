# backend/main.py

from fastapi import FastAPI # from the fastapi package, install the FastAPI class
from datetime import datetime, timezone
from pydantic import BaseModel

app = FastAPI () # create a FastAPI object from the FastAPI class

STUDENTS = [
    {"id": 1, "name": "Ayse"},
    {"id": 2, "name": "Memo"},
]

DAILY_FEED_BY_STUDENT_ID: dict[int, list[dict]] = {}

test = {
  1: [
    {"id": 1001, "student_id": 1, "note": "Did puzzle", "created_at_utc": "..."},
    {"id": 1002, "student_id": 1, "note": "Practiced pencil grip", "created_at_utc": "..."},
  ],
  2: [
    {"id": 2001, "student_id": 2, "note": "Worked on greetings", "created_at_utc": "..."},
  ]
}


@app.get("/health")
def health_check():
    return {"status":"ok", "service":"special-ed-platform-backend"}
    
@app.get("/students")
def list_students():
    return STUDENTS

print(test[1]["id"])