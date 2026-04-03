from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import db
import main


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_user_via_admin(
    client: TestClient,
    *,
    role: str = "teacher",
    full_name: str = "Dil ve Konusma Terapisti",
    email: str = "therapist@example.com",
    password: str = "secure-password-123",
    is_active: bool = True,
):
    return client.post(
        "/admin/users",
        json={
            "role": role,
            "full_name": full_name,
            "email": email,
            "password": password,
            "is_active": is_active,
        },
        headers=auth_header("admin-token-123"),
    )


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    test_db_path = tmp_path / "test_app.db"
    monkeypatch.setattr(db, "DB_PATH", str(test_db_path))
    monkeypatch.setattr(main, "UPLOADS_DIR", tmp_path / "uploads")
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


def test_admin_can_get_assignments_for_student(client: TestClient):
    response = client.get(
        "/admin/assignments?student_id=1",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["student"] == {
        "id": 1,
        "full_name": "Ayse",
        "is_active": True,
    }
    assert payload["parents"] == [
        {
            "id": 3,
            "full_name": "Parent User",
            "email": "parent@example.com",
            "is_active": True,
            "relationship_label": "mother",
        }
    ]
    assert payload["teachers"] == [
        {
            "id": 2,
            "full_name": "Teacher User",
            "email": "teacher@example.com",
            "is_active": True,
        }
    ]


def test_admin_can_get_empty_assignments_for_unassigned_student(client: TestClient):
    response = client.get(
        "/admin/assignments?student_id=4",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["student"] == {
        "id": 4,
        "full_name": "Jikan",
        "is_active": True,
    }
    assert payload["parents"] == []
    assert payload["teachers"] == []


def test_get_admin_assignments_missing_student_id_returns_400(client: TestClient):
    response = client.get(
        "/admin/assignments",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "student_id is required"


def test_get_admin_assignments_invalid_student_id_returns_400(client: TestClient):
    response = client.get(
        "/admin/assignments?student_id=abc",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "student_id must be an integer"


def test_get_admin_assignments_nonexistent_student_returns_404(client: TestClient):
    response = client.get(
        "/admin/assignments?student_id=9999",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "student not found"


def test_get_admin_assignments_teacher_token_returns_403(client: TestClient):
    response = client.get(
        "/admin/assignments?student_id=1",
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "admin role required"


def test_get_admin_assignments_missing_auth_returns_401(client: TestClient):
    response = client.get("/admin/assignments?student_id=1")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing Authorization header"


def test_get_admin_assignments_invalid_token_returns_401(client: TestClient):
    response = client.get(
        "/admin/assignments?student_id=1",
        headers=auth_header("wrong-token"),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


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


def test_admin_can_list_all_students_sorted_by_id_desc(client: TestClient):
    response = client.get(
        "/admin/students",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["students"] == [
        {
            "id": 5,
            "full_name": "Tobby",
            "is_active": True,
            "created_at_utc": payload["students"][0]["created_at_utc"],
        },
        {
            "id": 4,
            "full_name": "Jikan",
            "is_active": True,
            "created_at_utc": payload["students"][1]["created_at_utc"],
        },
        {
            "id": 3,
            "full_name": "Jason",
            "is_active": True,
            "created_at_utc": payload["students"][2]["created_at_utc"],
        },
        {
            "id": 2,
            "full_name": "Memo",
            "is_active": True,
            "created_at_utc": payload["students"][3]["created_at_utc"],
        },
        {
            "id": 1,
            "full_name": "Ayse",
            "is_active": True,
            "created_at_utc": payload["students"][4]["created_at_utc"],
        },
    ]
    for student in payload["students"]:
        assert student["created_at_utc"].endswith("+00:00")


def test_admin_can_filter_students_by_is_active_true(client: TestClient):
    create_response = client.post(
        "/admin/students",
        json={"full_name": "Inactive Student", "is_active": False},
        headers=auth_header("admin-token-123"),
    )
    assert create_response.status_code == 201

    response = client.get(
        "/admin/students?is_active=true",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["students"] == [
        {
            "id": 5,
            "full_name": "Tobby",
            "is_active": True,
            "created_at_utc": payload["students"][0]["created_at_utc"],
        },
        {
            "id": 4,
            "full_name": "Jikan",
            "is_active": True,
            "created_at_utc": payload["students"][1]["created_at_utc"],
        },
        {
            "id": 3,
            "full_name": "Jason",
            "is_active": True,
            "created_at_utc": payload["students"][2]["created_at_utc"],
        },
        {
            "id": 2,
            "full_name": "Memo",
            "is_active": True,
            "created_at_utc": payload["students"][3]["created_at_utc"],
        },
        {
            "id": 1,
            "full_name": "Ayse",
            "is_active": True,
            "created_at_utc": payload["students"][4]["created_at_utc"],
        },
    ]


def test_admin_can_filter_students_by_is_active_false(client: TestClient):
    create_response = client.post(
        "/admin/students",
        json={"full_name": "Inactive Student", "is_active": False},
        headers=auth_header("admin-token-123"),
    )
    assert create_response.status_code == 201

    response = client.get(
        "/admin/students?is_active=false",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["students"] == [
        {
            "id": 6,
            "full_name": "Inactive Student",
            "is_active": False,
            "created_at_utc": payload["students"][0]["created_at_utc"],
        }
    ]
    assert payload["students"][0]["created_at_utc"].endswith("+00:00")


def test_admin_students_teacher_token_returns_403(client: TestClient):
    response = client.get(
        "/admin/students",
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "admin role required"


def test_admin_students_missing_authorization_header_returns_401(client: TestClient):
    response = client.get("/admin/students")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing Authorization header"


def test_admin_students_invalid_token_returns_401(client: TestClient):
    response = client.get(
        "/admin/students",
        headers=auth_header("wrong-token"),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


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
    response = create_user_via_admin(client)
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


def test_admin_can_list_all_users_sorted_by_id_desc(client: TestClient):
    response = client.get(
        "/admin/users",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["users"] == [
        {
            "id": 3,
            "role": "parent",
            "full_name": "Parent User",
            "email": "parent@example.com",
            "is_active": True,
            "created_at_utc": payload["users"][0]["created_at_utc"],
        },
        {
            "id": 2,
            "role": "teacher",
            "full_name": "Teacher User",
            "email": "teacher@example.com",
            "is_active": True,
            "created_at_utc": payload["users"][1]["created_at_utc"],
        },
        {
            "id": 1,
            "role": "admin",
            "full_name": "Admin User",
            "email": "admin@example.com",
            "is_active": True,
            "created_at_utc": payload["users"][2]["created_at_utc"],
        },
    ]
    assert payload["users"][0]["created_at_utc"].endswith("+00:00")
    assert payload["users"][1]["created_at_utc"].endswith("+00:00")
    assert payload["users"][2]["created_at_utc"].endswith("+00:00")


def test_admin_can_filter_users_by_role(client: TestClient):
    response = client.get(
        "/admin/users?role=teacher",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["users"] == [
        {
            "id": 2,
            "role": "teacher",
            "full_name": "Teacher User",
            "email": "teacher@example.com",
            "is_active": True,
            "created_at_utc": payload["users"][0]["created_at_utc"],
        }
    ]
    assert payload["users"][0]["created_at_utc"].endswith("+00:00")


def test_admin_can_filter_users_by_is_active(client: TestClient):
    create_response = create_user_via_admin(
        client,
        email="inactive-parent@example.com",
        role="parent",
        is_active=False,
    )
    assert create_response.status_code == 201

    response = client.get(
        "/admin/users?is_active=false",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["users"] == [
        {
            "id": 4,
            "role": "parent",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "inactive-parent@example.com",
            "is_active": False,
            "created_at_utc": payload["users"][0]["created_at_utc"],
        }
    ]
    assert payload["users"][0]["created_at_utc"].endswith("+00:00")


def test_admin_can_filter_users_by_role_and_is_active(client: TestClient):
    create_response = create_user_via_admin(
        client,
        email="inactive-teacher-list@example.com",
        role="teacher",
        is_active=False,
    )
    assert create_response.status_code == 201

    response = client.get(
        "/admin/users?role=teacher&is_active=false",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["users"] == [
        {
            "id": 4,
            "role": "teacher",
            "full_name": "Dil ve Konusma Terapisti",
            "email": "inactive-teacher-list@example.com",
            "is_active": False,
            "created_at_utc": payload["users"][0]["created_at_utc"],
        }
    ]
    assert payload["users"][0]["created_at_utc"].endswith("+00:00")


def test_admin_users_teacher_token_returns_403(client: TestClient):
    response = client.get(
        "/admin/users",
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "admin role required"


def test_admin_users_missing_authorization_header_returns_401(client: TestClient):
    response = client.get("/admin/users")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing Authorization header"


def test_admin_users_invalid_token_returns_401(client: TestClient):
    response = client.get(
        "/admin/users",
        headers=auth_header("wrong-token"),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


def test_login_returns_session_for_valid_credentials(client: TestClient):
    create_response = create_user_via_admin(
        client,
        email="login-teacher@example.com",
        password="known-password-123",
    )
    assert create_response.status_code == 201

    response = client.post(
        "/auth/login",
        json={
            "email": "LOGIN-TEACHER@EXAMPLE.COM",
            "password": "known-password-123",
        },
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert isinstance(payload["token"], str)
    assert payload["token"] != "teacher-token-123"
    assert payload["expires_at_utc"].endswith("+00:00")
    assert payload["user"] == {
        "id": 4,
        "role": "teacher",
        "full_name": "Dil ve Konusma Terapisti",
        "email": "login-teacher@example.com",
        "is_active": True,
        "created_at_utc": payload["user"]["created_at_utc"],
    }
    assert payload["user"]["created_at_utc"].endswith("+00:00")
    assert "password_hash" not in payload["user"]

    conn = db.get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT token, user_id, created_at_utc, expires_at_utc
            FROM user_sessions
            WHERE token = ?
            """,
            (payload["token"],),
        ).fetchone()
    finally:
        conn.close()

    assert row is not None
    assert row["user_id"] == 4
    assert row["created_at_utc"].endswith("+00:00")
    assert row["expires_at_utc"] == payload["expires_at_utc"]


@pytest.mark.parametrize(
    ("email", "expected_role"),
    [
        ("admin@example.com", "admin"),
        ("teacher@example.com", "teacher"),
        ("parent@example.com", "parent"),
    ],
)
def test_seeded_demo_accounts_can_log_in_from_browser_flow(
    client: TestClient,
    email: str,
    expected_role: str,
):
    response = client.post(
        "/auth/login",
        json={"email": email, "password": db.SEEDED_DEMO_PASSWORD},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["user"]["email"] == email
    assert payload["user"]["role"] == expected_role


def test_init_db_repairs_legacy_seeded_password_hashes(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    test_db_path = tmp_path / "repair_seeded_passwords.db"
    monkeypatch.setattr(db, "DB_PATH", str(test_db_path))

    db.init_db()

    conn = db.get_db_connection()
    try:
        conn.execute(
            """
            UPDATE users
            SET password_hash = 'seeded-admin-password-hash'
            WHERE email = 'admin@example.com'
            """
        )
        conn.commit()
    finally:
        conn.close()

    db.init_db()

    with TestClient(main.app) as test_client:
        response = test_client.post(
            "/auth/login",
            json={
                "email": "admin@example.com",
                "password": db.SEEDED_DEMO_PASSWORD,
            },
        )

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "admin@example.com"


def test_login_missing_email_returns_400(client: TestClient):
    response = client.post(
        "/auth/login",
        json={"email": "   ", "password": "known-password-123"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "email is required"


def test_login_missing_password_returns_400(client: TestClient):
    response = client.post(
        "/auth/login",
        json={"email": "teacher@example.com", "password": "   "},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "password is required"


def test_login_unknown_email_returns_401(client: TestClient):
    response = client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": "known-password-123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid email or password"


def test_login_wrong_password_returns_401(client: TestClient):
    create_response = create_user_via_admin(
        client,
        email="wrong-password@example.com",
        password="known-password-123",
    )
    assert create_response.status_code == 201

    response = client.post(
        "/auth/login",
        json={
            "email": "wrong-password@example.com",
            "password": "wrong-password",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid email or password"


def test_login_inactive_user_returns_403(client: TestClient):
    create_response = create_user_via_admin(
        client,
        email="inactive-teacher@example.com",
        password="known-password-123",
        is_active=False,
    )
    assert create_response.status_code == 201

    response = client.post(
        "/auth/login",
        json={
            "email": "inactive-teacher@example.com",
            "password": "known-password-123",
        },
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "user account is inactive"


def test_logout_deletes_current_session(client: TestClient):
    login_create_response = create_user_via_admin(
        client,
        email="logout-teacher@example.com",
        password="known-password-123",
    )
    assert login_create_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={
            "email": "logout-teacher@example.com",
            "password": "known-password-123",
        },
    )
    assert login_response.status_code == 200
    token = login_response.json()["token"]

    response = client.post(
        "/auth/logout",
        json={},
        headers=auth_header(token),
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}

    conn = db.get_db_connection()
    try:
        row = conn.execute(
            "SELECT 1 AS ok FROM user_sessions WHERE token = ?",
            (token,),
        ).fetchone()
    finally:
        conn.close()

    assert row is None


def test_logout_missing_authorization_header_returns_401(client: TestClient):
    response = client.post(
        "/auth/logout",
        json={},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "missing Authorization header"


def test_logout_invalid_token_returns_401(client: TestClient):
    response = client.post(
        "/auth/logout",
        json={},
        headers=auth_header("wrong-token"),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


def test_get_me_returns_current_user(client: TestClient):
    create_response = create_user_via_admin(
        client,
        email="me-teacher@example.com",
        password="known-password-123",
    )
    assert create_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={
            "email": "me-teacher@example.com",
            "password": "known-password-123",
        },
    )
    assert login_response.status_code == 200
    token = login_response.json()["token"]

    response = client.get(
        "/me",
        headers=auth_header(token),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["user"]["id"] == 4
    assert payload["user"]["role"] == "teacher"
    assert payload["user"]["full_name"] == "Dil ve Konusma Terapisti"
    assert payload["user"]["email"] == "me-teacher@example.com"
    assert payload["user"]["is_active"] is True
    assert payload["user"]["created_at_utc"].endswith("+00:00")


def test_get_me_missing_authorization_header_returns_401(client: TestClient):
    response = client.get("/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing Authorization header"


def test_get_me_invalid_token_returns_401(client: TestClient):
    response = client.get(
        "/me",
        headers=auth_header("wrong-token"),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


def test_get_me_expired_token_returns_401(client: TestClient):
    create_response = create_user_via_admin(
        client,
        email="expired-session@example.com",
        password="known-password-123",
    )
    assert create_response.status_code == 201

    expired_token = "expired-session-token"
    created_at_utc = datetime.now(timezone.utc).isoformat()
    expires_at_utc = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    conn = db.get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO user_sessions (token, user_id, created_at_utc, expires_at_utc)
            VALUES (?, ?, ?, ?)
            """,
            (expired_token, 4, created_at_utc, expires_at_utc),
        )
        conn.commit()
    finally:
        conn.close()

    response = client.get(
        "/me",
        headers=auth_header(expired_token),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


def test_get_me_students_returns_parent_students(client: TestClient):
    response = client.get(
        "/me/students",
        headers=auth_header("parent-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["viewer_role"] == "parent"
    assert payload["viewer_user_id"] == 3
    assert payload["students"] == [
        {"id": 1, "full_name": "Ayse", "is_active": True},
        {"id": 2, "full_name": "Memo", "is_active": True},
    ]


def test_get_me_students_returns_teacher_students(client: TestClient):
    response = client.get(
        "/me/students",
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["viewer_role"] == "teacher"
    assert payload["viewer_user_id"] == 2
    assert payload["students"] == [
        {"id": 1, "full_name": "Ayse", "is_active": True},
        {"id": 3, "full_name": "Jason", "is_active": True},
        {"id": 5, "full_name": "Tobby", "is_active": True},
    ]


def test_get_me_students_admin_returns_403(client: TestClient):
    response = client.get(
        "/me/students",
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "admin should use /admin/students"


def test_get_me_students_missing_authorization_header_returns_401(client: TestClient):
    response = client.get("/me/students")
    assert response.status_code == 401
    assert response.json()["detail"] == "missing Authorization header"


def test_get_me_students_invalid_token_returns_401(client: TestClient):
    response = client.get(
        "/me/students",
        headers=auth_header("wrong-token"),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


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
    assert payload["post"]["author_full_name"] == "Teacher User"
    assert payload["post"]["body"] == "Ayse had a strong communication session today."
    assert payload["post"]["updated_at_utc"] is None
    assert payload["post"]["media_items"] == []


def test_teacher_can_upload_daily_feed_image(client: TestClient):
    create_post_response = client.post(
        "/students/1/daily-feed",
        json={"body": "Ayse had a strong communication session today."},
        headers=auth_header("teacher-token-123"),
    )
    assert create_post_response.status_code == 200
    post_id = create_post_response.json()["post"]["id"]

    response = client.post(
        f"/daily-feed/{post_id}/media",
        files={"file": ("session-photo.png", b"fake-png-bytes", "image/png")},
        headers=auth_header("teacher-token-123"),
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["ok"] is True
    assert payload["media"]["post_id"] == post_id
    assert payload["media"]["media_type"] == "image"
    assert payload["media"]["storage_key"].startswith(f"daily-feed/{post_id}/")
    assert payload["media"]["storage_key"].endswith(".png")

    saved_file = main.UPLOADS_DIR / payload["media"]["storage_key"]
    assert saved_file.exists()
    assert saved_file.read_bytes() == b"fake-png-bytes"


def test_feed_entries_include_uploaded_media_items(client: TestClient):
    create_post_response = client.post(
        "/students/1/daily-feed",
        json={"body": "Ayse had a strong communication session today."},
        headers=auth_header("teacher-token-123"),
    )
    assert create_post_response.status_code == 200
    post_id = create_post_response.json()["post"]["id"]

    upload_response = client.post(
        f"/daily-feed/{post_id}/media",
        files={"file": ("session-photo.webp", b"fake-webp-bytes", "image/webp")},
        headers=auth_header("teacher-token-123"),
    )
    assert upload_response.status_code == 201

    response = client.get(
        "/students/1/daily-feed",
        headers=auth_header("parent-token-123"),
    )

    assert response.status_code == 200
    payload = response.json()
    matching_entry = next(entry for entry in payload["entries"] if entry["id"] == post_id)
    assert matching_entry["media_items"] == [
        {
            "id": upload_response.json()["media"]["id"],
            "post_id": post_id,
            "storage_key": upload_response.json()["media"]["storage_key"],
            "media_type": "image",
            "created_at_utc": upload_response.json()["media"]["created_at_utc"],
        }
    ]


def test_teacher_upload_rejects_unsupported_image_type(client: TestClient):
    create_post_response = client.post(
        "/students/1/daily-feed",
        json={"body": "Ayse had a strong communication session today."},
        headers=auth_header("teacher-token-123"),
    )
    assert create_post_response.status_code == 200
    post_id = create_post_response.json()["post"]["id"]

    response = client.post(
        f"/daily-feed/{post_id}/media",
        files={"file": ("session-photo.gif", b"gif-bytes", "image/gif")},
        headers=auth_header("teacher-token-123"),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "unsupported image type"


def test_teacher_upload_rejects_oversized_image(client: TestClient):
    create_post_response = client.post(
        "/students/1/daily-feed",
        json={"body": "Ayse had a strong communication session today."},
        headers=auth_header("teacher-token-123"),
    )
    assert create_post_response.status_code == 200
    post_id = create_post_response.json()["post"]["id"]

    oversized_bytes = b"a" * (main.MAX_DAILY_FEED_IMAGE_BYTES + 1)
    response = client.post(
        f"/daily-feed/{post_id}/media",
        files={"file": ("session-photo.png", oversized_bytes, "image/png")},
        headers=auth_header("teacher-token-123"),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "image file is too large"


def test_unassigned_teacher_cannot_upload_daily_feed_image(client: TestClient):
    create_post_response = client.post(
        "/students/1/daily-feed",
        json={"body": "Ayse had a strong communication session today."},
        headers=auth_header("teacher-token-123"),
    )
    assert create_post_response.status_code == 200
    post_id = create_post_response.json()["post"]["id"]

    create_second_teacher_response = create_user_via_admin(
        client,
        email="photo-upload-teacher@example.com",
        password="known-password-123",
    )
    assert create_second_teacher_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={
            "email": "photo-upload-teacher@example.com",
            "password": "known-password-123",
        },
    )
    assert login_response.status_code == 200
    second_teacher_token = login_response.json()["token"]

    response = client.post(
        f"/daily-feed/{post_id}/media",
        files={"file": ("session-photo.png", b"fake-png-bytes", "image/png")},
        headers=auth_header(second_teacher_token),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "teacher not allowed to access this student"


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
    assert payload["entries"][0]["author_full_name"] == "Teacher User"


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
    assert payload["entries"][0]["author_full_name"] == "Teacher User"


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
