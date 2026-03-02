# backend/auth.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


# 1) "Role" is a fixed set of allowed strings.
Role = Literal["teacher", "parent", "admin"]


# 2) A tiny "user record" we return after validating a token.
@dataclass(frozen=True)
class AuthUser:
    role: Role
    user_id: str  # <-- NEW: stable identifier for authorization rules


# 3) Security helper that parses: Authorization: Bearer <token>
bearer_scheme = HTTPBearer(auto_error=False)


# 4) Hard-coded tokens (MVP only).
#    Key = token string
#    Value = user info (role + user_id)
TOKENS: dict[str, AuthUser] = {
    "teacher-token-123": AuthUser(role="teacher", user_id="teacher_1"),
    "parent-token-123": AuthUser(role="parent", user_id="parent_1"),
    "admin-token-123": AuthUser(role="admin", user_id="admin_1"),
}


# 5) Hard-coded authorization rules (MVP only).
#    These define WHICH students each user_id can access.
PARENT_STUDENT_IDS: dict[str, set[int]] = {
    "parent_1": {1, 2},       # parent_1 can only view students 1 and 2
}

TEACHER_STUDENT_IDS: dict[str, set[int]] = {
    "teacher_1": {1, 15, 22}, # teacher_1 can view/write students 1, 15, 22
}


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUser:
    """
    Reads the Authorization header and returns an AuthUser if token is valid.
    Missing/invalid -> 401 Unauthorized.
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
    user = TOKENS.get(token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid token",
        )

    return user


def require_any_user(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """
    Any authenticated user is allowed (teacher/parent/admin).
    """
    return user


def require_teacher(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """
    Authenticated AND role must be teacher.
    Valid token but wrong role -> 403 Forbidden.
    """
    if user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="teacher role required",
        )
    return user


def _assert_user_can_access_student(*, user: AuthUser, student_id: int) -> None:
    """
    Central authorization rule:
    - admin: access all
    - parent: only their students
    - teacher: only assigned students
    If not allowed -> 403 Forbidden
    """
    if user.role == "admin":
        return  # admin can access anything

    if user.role == "parent":
        allowed = PARENT_STUDENT_IDS.get(user.user_id, set())
        if student_id in allowed:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="parent not allowed to access this student",
        )

    if user.role == "teacher":
        allowed = TEACHER_STUDENT_IDS.get(user.user_id, set())
        if student_id in allowed:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="teacher not allowed to access this student",
        )

    # Should be unreachable because Role is a Literal, but it's good defensive code.
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="role not allowed",
    )


def require_can_view_student(
    student_id: int,
    user: AuthUser = Depends(require_any_user),
) -> AuthUser:
    """
    Dependency for endpoints that VIEW a student's data.
    FastAPI auto-injects student_id from the path.
    """
    _assert_user_can_access_student(user=user, student_id=student_id)
    return user


def require_can_write_student(
    student_id: int,
    user: AuthUser = Depends(require_teacher),
) -> AuthUser:
    """
    Dependency for endpoints that MODIFY a student's data.
    Rule:
    - must be a teacher (require_teacher)
    - AND must be assigned to that student
    """
    _assert_user_can_access_student(user=user, student_id=student_id)
    return user