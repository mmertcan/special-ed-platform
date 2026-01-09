# backend/main.py

from fastapi import FastAPI # from the fastapi package, install the FastAPI class

app = FastAPI () # create a FastAPI object from the FastAPI class

STUDENTS = [
    {"id": 1, "name": "Ayse"},
    {"id": 2, "name": "Memo"},
]

@app.get("/health")
def health_check():
    return {"status":"ok", "service":"special-ed-platform-backend"}
    
@app.get("/students")
def list_students():
    return STUDENTS