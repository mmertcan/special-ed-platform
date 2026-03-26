# backend/db.py

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Optional

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = str(BASE_DIR / "app.db")



def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn



def init_db() -> None:
    """
    Creates tables if they don't exist.
    Runs once at app startup.
    Also seeds initial data if tables are empty.
    """
    conn = get_db_connection()
    try:
        # 1. users
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL CHECK (role IN ('teacher', 'parent', 'admin')),
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at_utc TEXT NOT NULL
            )
            """
        )

        # 2. students
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at_utc TEXT NOT NULL
            )
            """
        )

        # 3. student_parents
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS student_parents (
                student_id INTEGER NOT NULL,
                parent_user_id INTEGER NOT NULL,
                relationship_label TEXT,
                created_at_utc TEXT NOT NULL,
                PRIMARY KEY (student_id, parent_user_id),
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (parent_user_id) REFERENCES users(id)
            )
            """
        )

        # 4. student_teachers
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS student_teachers (
                student_id INTEGER NOT NULL,
                teacher_user_id INTEGER NOT NULL,
                created_at_utc TEXT NOT NULL,
                PRIMARY KEY (student_id, teacher_user_id),
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (teacher_user_id) REFERENCES users(id)
            )
            """
        )

        # 5. user_sessions
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at_utc TEXT NOT NULL,
                expires_at_utc TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )

        # 6. daily_feed_posts
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_feed_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                author_user_id INTEGER NOT NULL,
                body TEXT NOT NULL,
                posted_at_utc TEXT NOT NULL,
                updated_at_utc TEXT,
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (author_user_id) REFERENCES users(id)
            )
            """
        )

        # 7. daily_feed_media
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_feed_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                storage_key TEXT NOT NULL,
                media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
                created_at_utc TEXT NOT NULL,
                FOREIGN KEY (post_id) REFERENCES daily_feed_posts(id)
            )
            """
        )

        # 8. weekly_homework
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS weekly_homework (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                author_user_id INTEGER NOT NULL,
                week_start_date TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at_utc TEXT NOT NULL,
                updated_at_utc TEXT,
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (author_user_id) REFERENCES users(id)
            )
            """
        )

        # 9. schedule_entries
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schedule_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                teacher_user_id INTEGER,
                entry_date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                lesson_type TEXT NOT NULL,
                created_at_utc TEXT NOT NULL,
                updated_at_utc TEXT,
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (teacher_user_id) REFERENCES users(id)
            )
            """
        )

        # Indexes
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_users_role
            ON users(role)
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_student_parents_parent_user_id
            ON student_parents(parent_user_id)
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_student_teachers_teacher_user_id
            ON student_teachers(teacher_user_id)
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
            ON user_sessions(user_id)
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_daily_feed_posts_student_posted_at
            ON daily_feed_posts(student_id, posted_at_utc DESC)
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_daily_feed_media_post_id
            ON daily_feed_media(post_id)
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_weekly_homework_student_week
            ON weekly_homework(student_id, week_start_date)
            """
        )

        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_schedule_entries_student_date
            ON schedule_entries(student_id, entry_date)
            """
        )

        conn.commit()

        # Seed after schema exists
        _seed_if_empty(conn)
        conn.commit()

    finally:
        conn.close()


def _seed_if_empty(conn: sqlite3.Connection) -> None:
    """
    Inserts initial rows only if the tables are empty.
    This keeps the local app usable for manual testing.
    """
    created_at = datetime.now(timezone.utc).isoformat()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()

    # -------------------------
    # users
    # -------------------------
    users_count = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    if users_count == 0:
        conn.executemany(
            """
            INSERT INTO users (
                role,
                full_name,
                email,
                password_hash,
                is_active,
                created_at_utc
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    "admin",
                    "Admin User",
                    "admin@example.com",
                    "seeded-admin-password-hash",
                    1,
                    created_at,
                ),
                (
                    "teacher",
                    "Teacher User",
                    "teacher@example.com",
                    "seeded-teacher-password-hash",
                    1,
                    created_at,
                ),
                (
                    "parent",
                    "Parent User",
                    "parent@example.com",
                    "seeded-parent-password-hash",
                    1,
                    created_at,
                ),
            ],
        )

    # -------------------------
    # students
    # -------------------------
    students_count = conn.execute("SELECT COUNT(*) AS c FROM students").fetchone()["c"]
    if students_count == 0:
        conn.executemany(
            """
            INSERT INTO students (
                full_name,
                is_active,
                created_at_utc
            )
            VALUES (?, ?, ?)
            """,
            [
                ("Ayse", 1, created_at),
                ("Memo", 1, created_at),
                ("Jason", 1, created_at),
                ("Jikan", 1, created_at),
                ("Tobby", 1, created_at),
            ],
        )

    # Assumption for a fresh empty database:
    # users inserted above get ids:
    # admin = 1, teacher = 2, parent = 3
    #
    # students inserted above get ids:
    # Ayse = 1, Memo = 2, Jason = 3, Jikan = 4, Tobby = 5

    # -------------------------
    # student_parents
    # -------------------------
    parent_links_count = conn.execute(
        "SELECT COUNT(*) AS c FROM student_parents"
    ).fetchone()["c"]
    if parent_links_count == 0:
        conn.executemany(
            """
            INSERT INTO student_parents (
                student_id,
                parent_user_id,
                relationship_label,
                created_at_utc
            )
            VALUES (?, ?, ?, ?)
            """,
            [
                (1, 3, "mother", created_at),
                (2, 3, "mother", created_at),
            ],
        )

    # -------------------------
    # student_teachers
    # -------------------------
    teacher_links_count = conn.execute(
        "SELECT COUNT(*) AS c FROM student_teachers"
    ).fetchone()["c"]
    if teacher_links_count == 0:
        conn.executemany(
            """
            INSERT INTO student_teachers (
                student_id,
                teacher_user_id,
                created_at_utc
            )
            VALUES (?, ?, ?)
            """,
            [
                (1, 2, created_at),
                (3, 2, created_at),
                (5, 2, created_at),
            ],
        )

    # -------------------------
    # user_sessions
    # -------------------------
    sessions_count = conn.execute(
        "SELECT COUNT(*) AS c FROM user_sessions"
    ).fetchone()["c"]
    if sessions_count == 0:
        conn.executemany(
            """
            INSERT INTO user_sessions (
                token,
                user_id,
                created_at_utc,
                expires_at_utc
            )
            VALUES (?, ?, ?, ?)
            """,
            [
                ("admin-token-123", 1, created_at, expires_at),
                ("teacher-token-123", 2, created_at, expires_at),
                ("parent-token-123", 3, created_at, expires_at),
            ],
        )

    # -------------------------
    # daily_feed_posts
    # -------------------------
    posts_count = conn.execute(
        "SELECT COUNT(*) AS c FROM daily_feed_posts"
    ).fetchone()["c"]
    if posts_count == 0:
        conn.executemany(
            """
            INSERT INTO daily_feed_posts (
                student_id,
                author_user_id,
                body,
                posted_at_utc,
                updated_at_utc
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (
                    1,
                    2,
                    "Ayse had a focused and positive session today.",
                    created_at,
                    None,
                ),
            ],
        )

    # -------------------------
    # daily_feed_media
    # -------------------------
    media_count = conn.execute(
        "SELECT COUNT(*) AS c FROM daily_feed_media"
    ).fetchone()["c"]
    if media_count == 0:
        pass

    # -------------------------
    # weekly_homework
    # -------------------------
    homework_count = conn.execute(
        "SELECT COUNT(*) AS c FROM weekly_homework"
    ).fetchone()["c"]
    if homework_count == 0:
        pass

    # -------------------------
    # schedule_entries
    # -------------------------
    schedule_count = conn.execute(
        "SELECT COUNT(*) AS c FROM schedule_entries"
    ).fetchone()["c"]
    if schedule_count == 0:
        pass


# -------------------------
# Daily feed functions (existing)
# -------------------------

def insert_daily_feed_posts(
    *,
    student_id: int,
    author_user_id: int,
    body: str,
    posted_at_utc: str,
) -> int:
    """
    Inserts one daily feed entry into the database.
    Returns: new_id (int)
    """
    conn = get_db_connection()
    try:
        cur = conn.execute(
           """
            INSERT INTO daily_feed_posts (
                student_id,
                author_user_id,
                body,
                posted_at_utc,
                updated_at_utc
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (student_id, author_user_id, body, posted_at_utc, None),
        )
        conn.commit()
        new_id = cur.lastrowid
        if new_id is None:
            raise RuntimeError("Insert succeeded but lastrowid is None (unexpected)")
        return int(new_id)
    finally:
        conn.close()


def fetch_daily_feed_entries(*, student_id: int) -> list[dict[str, Any]]:
    """
    Fetches daily feed entries for one student (newest first).
    """
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, student_id, body, posted_at_utc
            FROM daily_feed_posts
            WHERE student_id = ?
            ORDER BY id DESC
            """,
            (student_id,),
        ).fetchall()
    finally:
        conn.close()

    return [dict(r) for r in rows]


# -------------------------
# NEW: Users / tokens / students helpers
# -------------------------

def insert_student(
    *,
    full_name: str,
    is_active: bool,
    created_at_utc: str,
) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        cur = conn.execute(
            """
            INSERT INTO students (
                full_name,
                is_active,
                created_at_utc
            )
            VALUES (?, ?, ?)
            """,
            (full_name, int(is_active), created_at_utc),
        )
        conn.commit()
        new_id = cur.lastrowid
        if new_id is None:
            raise RuntimeError("Insert succeeded but lastrowid is None (unexpected)")

        return {
            "id": int(new_id),
            "full_name": full_name,
            "is_active": is_active,
            "created_at_utc": created_at_utc,
        }
    finally:
        conn.close()

def create_new_session (
        *,
        token: str,
        user_id: int,
        created_at_utc: str,
        expires_at_utc: str,
) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        cur = conn.execute(
            """
            INSERT INTO user_sessions (
            token,
            user_id,
            created_at_utc,
            expires_at_utc
            )   
            VALUES (?, ?, ?,?)
            """,
            (token,user_id,created_at_utc,expires_at_utc)
        )
        conn.commit()
        return {
            "token": token,
            "user_id": user_id,
            "created_at_utc": created_at_utc,
            "expires_at_utc": expires_at_utc
        }
    finally:
        conn.close()

    


def insert_user(
    *,
    full_name: str,
    is_active: bool,
    role: str,
    email: str,
    password_hash: str,
    created_at_utc: str
) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        cur = conn.execute(
            """
            INSERT INTO users (
                role,
                full_name,
                email,
                password_hash,
                is_active,
                created_at_utc
            )
            VALUES (?, ?, ?,?, ?, ?)
            """,
            (role, full_name, email, password_hash, int(is_active), created_at_utc),
        )
        conn.commit()
        new_id = cur.lastrowid
        if new_id is None:
            raise RuntimeError("Insert succeeded but lastrowid is None (unexpected)")

        return {
            "id": int(new_id),
            "role": role,
            "full_name": full_name,
            "email": email,
            "is_active": is_active,
            "created_at_utc": created_at_utc,
        }
    finally:
        conn.close()


def user_email_exists(*, email: str) -> bool:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT 1 AS ok
            FROM users
            WHERE lower(email) = lower(?)
            """,
            (email,),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def fetch_students() -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT id, full_name FROM students ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def student_exists(*, student_id: int) -> bool:
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT 1 AS ok FROM students WHERE id = ?",
            (student_id,),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def fetch_user_by_token(*, token: str) -> Optional[dict[str, Any]]:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT u.id AS user_id, u.role
            FROM user_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def fetch_user_by_email (*, email: str) -> Optional[dict[str,Any]]:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT id, role, full_name, email, password_hash, is_active, created_at_utc
            FROM users
            WHERE lower(email) = lower(?)
            """,
            (email,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def fetch_user_by_id(*,id: int) -> Optional[dict[str,Any]]:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT id, role
            FROM users
            WHERE id = ?
            """,
            (id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def assign_parent_to_student(*, parent_user_id: int, student_id: int) -> None:
    conn = get_db_connection()

    try:
        created_at_utc = datetime.now(timezone.utc).isoformat()
        conn.execute(
        """
        INSERT INTO student_parents (
            parent_user_id,
            student_id,
            created_at_utc
        )
        VALUES (?, ?, ?)
        """,
        (parent_user_id, student_id, created_at_utc),
        )
        conn.commit()
    finally:
        conn.close()


def assign_teacher_to_student(*,teacher_user_id: int, student_id: int) -> None:
    conn = get_db_connection ()
    try:
        created_at_utc = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO student_teachers (
                teacher_user_id,
                student_id,
                created_at_utc
            )
            VALUES (?, ?, ?)
            """,
            (teacher_user_id, student_id, created_at_utc),
        )
        conn.commit()
    finally:
        conn.close()

def parent_has_student(*, parent_user_id: int, student_id: int) -> bool:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT 1 AS ok
            FROM student_parents
            WHERE parent_user_id = ? AND student_id = ?
            """,
            (parent_user_id, student_id),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def teacher_has_student(*, teacher_user_id: int, student_id: int) -> bool:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT 1 AS ok
            FROM student_teachers
            WHERE teacher_user_id = ? AND student_id = ?
            """,
            (teacher_user_id, student_id),
        ).fetchone()
        return row is not None
    finally:
        conn.close()
