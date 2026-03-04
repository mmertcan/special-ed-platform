# backend/auth.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db import fetch_user_by_token, parent_has_student, teacher_has_student


Role = Literal["teacher", "parent", "admin"]


@dataclass(frozen=True)
class AuthUser:
    role: Role
    user_id: str


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUser:
    """
    Authentication:
    - Parse Authorization: Bearer <token>
    - Look token up in SQLite
    - Return AuthUser
    """
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing Authorization header",
        )

    if creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization scheme must be Bearer",
        )

    token = creds.credentials
    row = fetch_user_by_token(token=token)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid token",
        )

    # SQLite stores role as TEXT; we trust it because schema CHECK limits it.
    return AuthUser(role=row["role"], user_id=row["user_id"])


def require_any_user(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    return user


def require_teacher(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="teacher role required",
        )
    return user


def _assert_user_can_access_student(*, user: AuthUser, student_id: int) -> None:
    """
    Authorization:
    - admin: allow
    - parent: must have row in parent_students
    - teacher: must have row in teacher_students
    """
    if user.role == "admin":
        return

    if user.role == "parent":
        if parent_has_student(parent_user_id=user.user_id, student_id=student_id):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="parent not allowed to access this student",
        )

    if user.role == "teacher":
        if teacher_has_student(teacher_user_id=user.user_id, student_id=student_id):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="teacher not allowed to access this student",
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="role not allowed",
    )


def require_can_view_student(
    student_id: int,
    user: AuthUser = Depends(require_any_user),
) -> AuthUser:
    _assert_user_can_access_student(user=user, student_id=student_id)
    return user


def require_can_write_student(
    student_id: int,
    user: AuthUser = Depends(require_teacher),
) -> AuthUser:
    _assert_user_can_access_student(user=user, student_id=student_id)
    return user