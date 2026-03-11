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
        json={"parent_user_id": "parent_1", "student_id": 1},
        headers=auth_header("wrong-token"),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "invalid token"


def test_assign_parent_teacher_token_returns_403(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": "parent_1", "student_id": 1},
        headers=auth_header("teacher-token-123"),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "admin role required"


def test_assign_parent_nonexistent_student_returns_404(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": "parent_1", "student_id": 9999},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "student not found"


def test_assign_parent_nonexistent_user_returns_404(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": "parent_does_not_exist", "student_id": 1},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "parent user not found"


def test_assign_parent_wrong_target_role_returns_400(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": "teacher_1", "student_id": 1},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "user is not a parent"


def test_assign_parent_duplicate_assignment_returns_409(client: TestClient):
    response = client.post(
        "/admin/assign-parent",
        json={"parent_user_id": "parent_1", "student_id": 1},
        headers=auth_header("admin-token-123"),
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "parent already assigned"
