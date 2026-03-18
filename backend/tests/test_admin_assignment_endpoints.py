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
