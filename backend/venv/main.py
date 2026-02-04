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


@app.get("/health")
def health_check():
    return {"status":"ok", "service":"special-ed-platform-backend"}
    
@app.get("/students")
def list_students():
    return STUDENTS