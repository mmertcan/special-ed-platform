# backend/main.py

import hashlib
import re
import secrets
from datetime import datetime, timezone, timedelta

from contextlib import asynccontextmanager

import sqlite3
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel

from auth import (
    AuthUser,
    require_admin,
    require_any_user,
    require_can_view_student,
    require_can_write_student,
)
from db import (
    create_new_session,
    delete_session_by_token,
    fetch_user_by_email,
    fetch_daily_feed_entries,
    fetch_students,
    fetch_user_by_id,
    init_db,
    insert_daily_feed_posts,
    insert_student,
    insert_user,
    student_exists,
    assign_parent_to_student,
    assign_teacher_to_student,
    parent_has_student,
    teacher_has_student,
    user_email_exists,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("LIFESPAN STARTUP: init_db() running")
    yield


app = FastAPI(lifespan=lifespan)

VALID_USER_ROLES = {"admin", "teacher", "parent"}
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PBKDF2_ITERATIONS = 100_000


class DailyFeedCreateRequest(BaseModel):
    body: str


class AssignParentRequest(BaseModel):
    parent_user_id: int
    student_id: int

class CreateStudentRequest(BaseModel):
    full_name: str
    is_active: bool = True

class CreateUserRequest(BaseModel):
    full_name: str
    role: str
    email: str
    password: str
    is_active: bool = True

class AssignTeacherRequest(BaseModel):
    teacher_user_id: int
    student_id: int

class CreateLoginRequest(BaseModel):
    email: str
    password: str


class LogoutRequest(BaseModel):
    pass

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "special-ed-platform-backend"}


@app.get("/students")
def list_students():
    return fetch_students()


def assert_student_exists(student_id: int) -> None:
    if not student_exists(student_id=student_id):
        raise HTTPException(status_code=404, detail="student not found")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, stored_digest = stored_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    try:
        iterations = int(iterations_text)
        salt_bytes = bytes.fromhex(salt_hex)
    except ValueError:
        return False

    computed_digest = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt_bytes,
        iterations,
    ).hex()

    return secrets.compare_digest(computed_digest, stored_digest)


def generate_random_token():
    return secrets.token_urlsafe(32)


@app.post("/students/{student_id}/daily-feed")
def create_daily_feed_entry_route(
    student_id: int,
    payload: DailyFeedCreateRequest,
    user: AuthUser = Depends(require_can_write_student),
):
    # 1) Validate student exists (API boundary concern)
    assert_student_exists(student_id)

    # 2) Validate note (API concern)
    body_clean = payload.body.strip()
    if not body_clean:
        raise HTTPException(status_code=400, detail="note cannot be empty")

    posted_at = datetime.now(timezone.utc).isoformat()

     # 3) Write to DB
    new_id = insert_daily_feed_posts(
        student_id=student_id,
        author_user_id=user.user_id,
        body=body_clean,
        posted_at_utc=posted_at,
    )

    post = {
        "id": new_id,
        "student_id": student_id,
        "author_user_id": user.user_id,
        "author_role": user.role,
        "body": body_clean,
        "posted_at_utc": posted_at,
        "updated_at_utc": None,
    }

    return {"ok": True, "post": post}


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

@app.post("/admin/students", status_code=status.HTTP_201_CREATED)
def create_student(
    payload: CreateStudentRequest,
    user: AuthUser = Depends(require_admin),
):
    full_name_clean = payload.full_name.strip()
    if not full_name_clean:
        raise HTTPException(status_code=400, detail="full_name cannot be empty")

    created_at_utc = datetime.now(timezone.utc).isoformat()
    student = insert_student(
        full_name=full_name_clean,
        is_active=payload.is_active,
        created_at_utc=created_at_utc,
    )

    return {"ok": True, "student": student}


@app.post("/admin/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: CreateUserRequest,
    user: AuthUser = Depends(require_admin),
):
    if payload.role not in VALID_USER_ROLES:
        raise HTTPException(
            status_code=400,
            detail="role must be one of admin, teacher, parent",
        )

    full_name_clean = payload.full_name.strip()
    if not full_name_clean:
        raise HTTPException(status_code=400, detail="full_name cannot be empty")

    email_clean = payload.email.strip().casefold()
    if not email_clean:
        raise HTTPException(status_code=400, detail="email cannot be empty")
    if not EMAIL_REGEX.fullmatch(email_clean):
        raise HTTPException(status_code=400, detail="email format is invalid")
    if user_email_exists(email=email_clean):
        raise HTTPException(status_code=409, detail="email already exists")

    password_clean = payload.password.strip()
    if not password_clean:
        raise HTTPException(status_code=400, detail="password cannot be empty")

    created_at_utc = datetime.now(timezone.utc).isoformat()
    try:
        new_user = insert_user(
            role=payload.role,
            full_name=full_name_clean,
            is_active=payload.is_active,
            email=email_clean,
            password_hash=hash_password(password_clean),
            created_at_utc=created_at_utc,
        )
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="email already exists") from None

    return {
        "ok": True,
        "user": new_user,
    }

@app.post("/auth/login", status_code=status.HTTP_200_OK)
def create_login(
    payload: CreateLoginRequest,
):
    email_clean = payload.email.strip().casefold()
    if not email_clean:
        raise HTTPException(status_code=400, detail="email is required")

    password_clean = payload.password.strip()
    if not password_clean:
        raise HTTPException(status_code=400, detail="password is required")

    session_user = fetch_user_by_email(email=email_clean)
    if session_user is None:
        raise HTTPException(status_code=401, detail="invalid email or password")

    if not verify_password(
        plain_password=password_clean,
        stored_hash=session_user["password_hash"],
    ):
        raise HTTPException(status_code=401, detail="invalid email or password")

    if not session_user["is_active"]:
        raise HTTPException(status_code=403, detail="user account is inactive")

    new_token = generate_random_token()
    SESSION_DURATION_DAYS = 21
    created_at_dt = datetime.now(timezone.utc)
    created_at_utc = created_at_dt.isoformat()
    expires_at = (created_at_dt + timedelta(days=SESSION_DURATION_DAYS)).isoformat()

    create_new_session(
        token=new_token,
        user_id=session_user["id"],
        created_at_utc=created_at_utc,
        expires_at_utc=expires_at,
    )

    response_user = {
        "id": session_user["id"],
        "role": session_user["role"],
        "full_name": session_user["full_name"],
        "email": session_user["email"],
        "is_active": bool(session_user["is_active"]),
    }

    return {
        "ok": True,
        "token": new_token,
        "expires_at_utc": expires_at,
        "user": response_user,
    }


@app.post("/auth/logout", status_code=status.HTTP_200_OK)
def logout(
    payload: LogoutRequest,
    user: AuthUser = Depends(require_any_user),
):
    delete_session_by_token(token=user.token)
    return {"ok": True}



@app.post("/admin/assign-parent")
def assign_parent(
    payload: AssignParentRequest,
    user: AuthUser = Depends(require_admin),
):
    parent = fetch_user_by_id(id=payload.parent_user_id)
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
    teacher = fetch_user_by_id(id=payload.teacher_user_id)
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
