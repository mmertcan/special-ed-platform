# backend/db.py

from __future__ import annotations

import sqlite3
from typing import Any, Optional

DB_PATH = "app.db"


def get_db_connection() -> sqlite3.Connection:
    """
    Creates and returns a SQLite connection.
    - row_factory makes rows behave like dictionaries (sqlite3.Row).
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """
    Creates tables if they don't exist.
    Runs once at app startup.
    Also seeds initial data if tables are empty.
    """
    conn = get_db_connection()
    try:
        # --- Core tables ---
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                role TEXT NOT NULL CHECK (role IN ('teacher','parent','admin'))
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS api_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL
            )
            """
        )

        # --- Relationship tables (authorization mappings) ---
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS parent_students (
                parent_user_id TEXT NOT NULL,
                student_id INTEGER NOT NULL,
                PRIMARY KEY (parent_user_id, student_id),
                FOREIGN KEY (parent_user_id) REFERENCES users(user_id),
                FOREIGN KEY (student_id) REFERENCES students(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS teacher_students (
                teacher_user_id TEXT NOT NULL,
                student_id INTEGER NOT NULL,
                PRIMARY KEY (teacher_user_id, student_id),
                FOREIGN KEY (teacher_user_id) REFERENCES users(user_id),
                FOREIGN KEY (student_id) REFERENCES students(id)
            )
            """
        )

        # --- Existing daily feed table (keep as-is) ---
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_feed_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                note TEXT,
                created_at_utc TEXT NOT NULL
            )
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
    This keeps your MVP usable without manual SQL setup.
    """
    users_count = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    if users_count == 0:
        conn.executemany(
            "INSERT INTO users (user_id, role) VALUES (?, ?)",
            [
                ("teacher_1", "teacher"),
                ("parent_1", "parent"),
                ("admin_1", "admin"),
            ],
        )

    tokens_count = conn.execute("SELECT COUNT(*) AS c FROM api_tokens").fetchone()["c"]
    if tokens_count == 0:
        conn.executemany(
            "INSERT INTO api_tokens (token, user_id) VALUES (?, ?)",
            [
                ("teacher-token-123", "teacher_1"),
                ("parent-token-123", "parent_1"),
                ("admin-token-123", "admin_1"),
            ],
        )

    students_count = conn.execute("SELECT COUNT(*) AS c FROM students").fetchone()["c"]
    if students_count == 0:
        conn.executemany(
            "INSERT INTO students (id, name) VALUES (?, ?)",
            [
                (1, "Ayse"),
                (2, "Memo"),
                (15, "Jason"),
                (14, "Jikan"),
                (22, "Tobby"),
            ],
        )

    parent_links_count = conn.execute(
        "SELECT COUNT(*) AS c FROM parent_students"
    ).fetchone()["c"]
    if parent_links_count == 0:
        conn.executemany(
            "INSERT INTO parent_students (parent_user_id, student_id) VALUES (?, ?)",
            [
                ("parent_1", 1),
                ("parent_1", 2),
            ],
        )

    teacher_links_count = conn.execute(
        "SELECT COUNT(*) AS c FROM teacher_students"
    ).fetchone()["c"]
    if teacher_links_count == 0:
        conn.executemany(
            "INSERT INTO teacher_students (teacher_user_id, student_id) VALUES (?, ?)",
            [
                ("teacher_1", 1),
                ("teacher_1", 15),
                ("teacher_1", 22),
            ],
        )


# -------------------------
# Daily feed functions (existing)
# -------------------------

def insert_daily_feed_entry(
    *,
    student_id: int,
    entry_type: str,
    note: Optional[str],
    created_at_utc: str,
) -> int:
    """
    Inserts one daily feed entry into the database.
    Returns: new_id (int)
    """
    conn = get_db_connection()
    try:
        cur = conn.execute(
            """
            INSERT INTO daily_feed_entries (student_id, type, note, created_at_utc)
            VALUES (?, ?, ?, ?)
            """,
            (student_id, entry_type, note, created_at_utc),
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
            SELECT id, student_id, type, note, created_at_utc
            FROM daily_feed_entries
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

def fetch_students() -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT id, name FROM students ORDER BY id ASC").fetchall()
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
    """
    Returns {"user_id": ..., "role": ...} if token exists, else None.
    """
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT u.user_id, u.role
            FROM api_tokens t
            JOIN users u ON u.user_id = t.user_id
            WHERE t.token = ?
            """,
            (token,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def fetch_user_by_id(*,user_id: str) -> Optional[dict[str,Any]]:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT user_id, role
            FROM users
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def assign_parent_to_student(*, parent_user_id: str, student_id: int) -> None:
    conn = get_db_connection()

    try:
        conn.execute(
        """
        INSERT INTO parent_students (parent_user_id, student_id)
        VALUES (?, ?)
        """,
        (parent_user_id, student_id),
        )
        conn.commit()
    finally:
        conn.close()


def assign_teacher_to_student(*,teacher_user_id: str, student_id: int) -> None:
    conn = get_db_connection ()
    try:
        conn.execute(
            """
            INSERT INTO teacher_students (teacher_user_id, student_id)
            VALUES (?,?)
            """,
            (teacher_user_id, student_id),
        )
        conn.commit()
    finally:
        conn.close()

def parent_has_student(*, parent_user_id: str, student_id: int) -> bool:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT 1 AS ok
            FROM parent_students
            WHERE parent_user_id = ? AND student_id = ?
            """,
            (parent_user_id, student_id),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def teacher_has_student(*, teacher_user_id: str, student_id: int) -> bool:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT 1 AS ok
            FROM teacher_students
            WHERE teacher_user_id = ? AND student_id = ?
            """,
            (teacher_user_id, student_id),
        ).fetchone()
        return row is not None
    finally:
        conn.close()