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
    """
    conn = get_db_connection()
    try:
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
    finally:
        conn.close()


def insert_daily_feed_entry(
    *,
    student_id: int,
    entry_type: str,
    note: Optional[str],
    created_at_utc: str,
) -> int:
    """
    Inserts one daily feed entry into the database.

    Returns:
        new_id (int): the auto-generated primary key id.
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

    Returns:
        List of dicts, each dict is one row.
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
