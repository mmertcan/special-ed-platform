from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import db
import main


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    test_db_path = tmp_path / "test_app.db"
    monkeypatch.setattr(db, "DB_PATH", str(test_db_path))
    db.init_db()
    with TestClient(main.app) as test_client:
        yield test_client


def test_assign_parent_wrong_token_returns_401(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": 3, "student_id": 3},
        headers=auth_header("wrong-token"),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


def test_assign_parent_teacher_token_returns_403(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": 3, "student_id": 3},
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "admin role required"


def test_assign_parent_nonexistent_student_returns_404(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": 3, "student_id": 9999},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "student not found"


def test_assign_parent_nonexistent_user_returns_404(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": 9999, "student_id": 1},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "parent user not found"


def test_assign_parent_wrong_target_role_returns_400(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": 2, "student_id": 1},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "user is not a parent"


def test_assign_parent_duplicate_assignment_returns_409(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": 3, "student_id": 1},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "parent already assigned"


def test_admin_can_create_student(client: TestClient):
    response = client.post(
        "/admin/students",
        json={"full_name": "  Ayse Yilmaz  ", "is_active": False},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 201

    payload = response.json()
    assert payload["ok"] is True
    assert payload["student"]["id"] == 6
    assert payload["student"]["full_name"] == "Ayse Yilmaz"
    assert payload["student"]["is_active"] is False
    assert payload["student"]["created_at_utc"].endswith("+00:00")


def test_create_student_defaults_is_active_to_true(client: TestClient):
    response = client.post(
        "/admin/students",
        json={"full_name": "Ayse Yilmaz"},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 201
    assert response.json()["student"]["is_active"] is True


def test_create_student_empty_name_returns_400(client: TestClient):
    response = client.post(
        "/admin/students",
        json={"full_name": "   "},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "full_name cannot be empty"


def test_create_student_teacher_token_returns_403(client: TestClient):
    response = client.post(
        "/admin/students",
        json={"full_name": "Ayse Yilmaz"},
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "admin role required"


def test_admin_can_create_user(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "teacher",
            "full_name": "  Dil ve Konusma Terapisti  ",
            "email": " Therapist@Example.com ",
            "password": "secure-password-123",
            "is_active": False,
        },
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 201

    payload = response.json()
    assert payload["ok"] is True
    assert payload["user"]["id"] == 4
    assert payload["user"]["role"] == "teacher"
    assert payload["user"]["full_name"] == "Dil ve Konusma Terapisti"
    assert payload["user"]["email"] == "therapist@example.com"
    assert payload["user"]["is_active"] is False
    assert payload["user"]["created_at_utc"].endswith("+00:00")
    assert "password_hash" not in payload["user"]


def test_create_user_defaults_is_active_to_true(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "teacher",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "therapist@example.com",
            "password": "secure-password-123",
        },
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 201
    assert response.json()["user"]["is_active"] is True


def test_create_user_empty_name_returns_400(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "teacher",
            "full_name": "   ",
            "email": "therapist@example.com",
            "password": "secure-password-123",
        },
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "full_name cannot be empty"


def test_create_user_empty_email_returns_400(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "teacher",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "   ",
            "password": "secure-password-123",
        },
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "email cannot be empty"


def test_create_user_empty_password_returns_400(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "teacher",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "therapist@example.com",
            "password": "   ",
        },
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "password cannot be empty"


def test_create_user_invalid_role_returns_400(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "student",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "therapist@example.com",
            "password": "secure-password-123",
        },
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "role must be one of admin, teacher, parent"


def test_create_user_invalid_email_format_returns_400(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "teacher",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "not-an-email",
            "password": "secure-password-123",
        },
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "email format is invalid"


def test_create_user_duplicate_email_returns_409_case_insensitive(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "teacher",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "ADMIN@EXAMPLE.COM",
            "password": "secure-password-123",
        },
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "email already exists"


def test_create_user_teacher_token_returns_403(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "teacher",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "therapist@example.com",
            "password": "secure-password-123",
        },
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "admin role required"


def test_create_user_stores_hashed_password(client: TestClient):
    response = client.post(
        "/admin/users",
        json={
            "role": "teacher",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "therapist@example.com",
            "password": "secure-password-123",
        },
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 201

    conn = db.get_db_connection()
    try:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE email = ?",
            ("therapist@example.com",),
        ).fetchone()
    finally:
        conn.close()

    assert row is not None
    assert row["password_hash"] != "secure-password-123"
    assert row["password_hash"].startswith("pbkdf2_sha256$")


def test_teacher_can_create_daily_feed_post(client: TestClient):
    response = client.post(
        "/students/1/daily-feed",
        json={"body": "Ayse had a strong communication session today."},
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["post"]["student_id"] == 1
    assert payload["post"]["author_user_id"] == 2
    assert payload["post"]["author_role"] == "teacher"
    assert payload["post"]["body"] == "Ayse had a strong communication session today."
    assert payload["post"]["updated_at_utc"] is None


def test_parent_can_fetch_allowed_feed(client: TestClient):
    response = client.get(
        "/students/1/daily-feed",
        headers=auth_header("parent-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["student_id"] == 1
    assert payload["viewer_role"] == "parent"
    assert payload["viewer_user_id"] == 3
    assert isinstance(payload["entries"], list)


def test_teacher_can_fetch_allowed_feed(client: TestClient):
    response = client.get(
        "/students/1/daily-feed",
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["student_id"] == 1
    assert payload["viewer_role"] == "teacher"
    assert payload["viewer_user_id"] == 2
    assert isinstance(payload["entries"], list)


def test_admin_can_fetch_any_feed(client: TestClient):
    response = client.get(
        "/students/4/daily-feed",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["student_id"] == 4
    assert payload["viewer_role"] == "admin"
    assert payload["viewer_user_id"] == 1
    assert isinstance(payload["entries"], list)


def test_unassigned_parent_gets_403(client: TestClient):
    response = client.get(
        "/students/3/daily-feed",
        headers=auth_header("parent-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "parent not allowed to access this student"


def test_unassigned_teacher_gets_403(client: TestClient):
    response = client.get(
        "/students/2/daily-feed",
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "teacher not allowed to access this student"
