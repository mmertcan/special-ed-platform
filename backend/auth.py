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


# 3) Security helper that parses: Authorization: Bearer <token>
#    auto_error=False means: we handle missing/invalid ourselves (so we can give clean error messages).
bearer_scheme = HTTPBearer(auto_error=False)


# 4) Hard-coded tokens (MVP only).
#    Key = token string
#    Value = user info (role)
TOKENS: dict[str, AuthUser] = {
    "teacher-token-123": AuthUser(role="teacher"),
    "parent-token-123": AuthUser(role="parent"),
    "admin-token-123": AuthUser(role="admin"),
}


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUser:
    """
    Reads the Authorization header and returns an AuthUser if token is valid.

    If missing/invalid -> 401 Unauthorized.
    The dependency result will be an HTTPAuthorizationCredentials object containing the scheme and the credentials
    """
    if creds is None:
        # No Authorization header at all.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing Authorization header",
        )

    # creds.scheme should be "Bearer" and creds.credentials is the token
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


def require_teacher(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """
    Allows only teachers (403 if token is valid but role is not teacher).
    """
    if user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="teacher role required",
        )
    return user


def require_any_user(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    """
    Allows any authenticated user (teacher/parent/admin).
    """
    return user
