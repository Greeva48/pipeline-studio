"""Small shared helpers for API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException


def ensure_uuid(value: str) -> str:
    """
    Return ``value`` if it is a valid UUID, otherwise raise 404.

    Pipeline ids are UUID columns in Postgres. A non-UUID id (e.g. a stale
    localStorage id like ``pipeline-1234567890-abc``) makes the database raise
    an "invalid input syntax for type uuid" error, which would bubble up as an
    unhandled 500. Such ids cannot exist server-side, so we treat them as a
    clean 404 instead of crashing the request.
    """
    try:
        UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return value


def assert_editable(pipeline_row: dict) -> None:
    """
    Reject writes to read-only starter templates.

    System-seeded starter templates are identified by ``owner_id IS NULL`` (no
    user owns them). User-created pipelines always have an ``owner_id``. This
    keeps starter templates as read-only examples while user pipelines stay
    fully editable — without requiring a schema change.
    """
    if pipeline_row.get("owner_id") is None:
        raise HTTPException(
            status_code=403,
            detail="This is a read-only starter template. Duplicate it to make changes.",
        )
