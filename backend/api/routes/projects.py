"""
Projects routes — full CRUD for pipelines.
Endpoint prefix: /api/projects
"""

from __future__ import annotations

from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from api.deps import CurrentUser, get_current_user
from api.utils import assert_editable, ensure_uuid
from infrastructure.supabase.client import get_service_client

router = APIRouter(prefix="/api/projects", tags=["projects"])


class CreateProjectBody(BaseModel):
    name: str = "New Pipeline"
    description: str = ""
    accent_color: str = "#A855F7"


class UpdateProjectBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    accent_color: Optional[str] = None
    status: Optional[str] = None


def _fmt(row: dict) -> dict:
    """Normalise a pipeline DB row to the camelCase shape the frontend expects."""
    return {
        "id":          row["id"],
        "name":        row["name"],
        "description": row.get("description", ""),
        "accentColor": row.get("accent_color", "#A855F7"),
        "status":      row["status"],
        "nodeCount":   row.get("node_count", 0),
        "edgeCount":   row.get("edge_count", 0),
        "createdAt":   row["created_at"],
        "updatedAt":   row["updated_at"],
        "ownerId":     row.get("owner_id"),
    }


@router.get("")
async def list_projects(user: CurrentUser = Depends(get_current_user)):
    svc = get_service_client()
    rows = (
        svc.table("pipelines")
        .select("id, name, description, accent_color, status, node_count, edge_count, created_at, updated_at, owner_id")
        .eq("workspace_id", user.workspace_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return [_fmt(r) for r in (rows.data or [])]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(body: CreateProjectBody, user: CurrentUser = Depends(get_current_user)):
    svc = get_service_client()
    row = (
        svc.table("pipelines")
        .insert({
            "workspace_id": user.workspace_id,
            "owner_id":     user.id,
            "name":         body.name,
            "description":  body.description,
            "accent_color": body.accent_color,
            "status":       "draft",
        })
        .execute()
    )
    pipeline = row.data[0]

    # Log activity (service client bypasses RLS)
    svc.table("activity_log").insert({
        "workspace_id":  user.workspace_id,
        "pipeline_id":   pipeline["id"],
        "user_id":       user.id,
        "pipeline_name": pipeline["name"],
        "type":          "created",
        "detail":        "New pipeline created",
        "dot_color":     "#9CA3AF",
    }).execute()

    return _fmt(pipeline)


@router.get("/{pipeline_id}")
async def get_project(pipeline_id: str, user: CurrentUser = Depends(get_current_user)):
    ensure_uuid(pipeline_id)
    svc = get_service_client()
    rows = (
        svc.table("pipelines")
        .select("id, name, description, accent_color, status, node_count, edge_count, created_at, updated_at, owner_id")
        .eq("id", pipeline_id)
        .eq("workspace_id", user.workspace_id)
        .execute()
    )
    if not rows.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return _fmt(rows.data[0])


@router.put("/{pipeline_id}")
async def update_project(
    pipeline_id: str,
    body: UpdateProjectBody,
    user: CurrentUser = Depends(get_current_user),
):
    ensure_uuid(pipeline_id)
    svc = get_service_client()

    # Block edits to read-only starter templates (owner_id IS NULL)
    owned = (
        svc.table("pipelines")
        .select("id, owner_id")
        .eq("id", pipeline_id)
        .eq("workspace_id", user.workspace_id)
        .execute()
    )
    if not owned.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    assert_editable(owned.data[0])

    patch: dict = {}
    if body.name is not None:        patch["name"]        = body.name
    if body.description is not None: patch["description"] = body.description
    if body.accent_color is not None: patch["accent_color"] = body.accent_color
    if body.status is not None:
        if body.status not in ("draft", "live", "archived"):
            raise HTTPException(status_code=422, detail="Invalid status")
        patch["status"] = body.status

    if not patch:
        raise HTTPException(status_code=422, detail="No fields to update")

    rows = (
        svc.table("pipelines")
        .update(patch)
        .eq("id", pipeline_id)
        .eq("workspace_id", user.workspace_id)
        .execute()
    )
    if not rows.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    pipeline = rows.data[0]

    # Log rename activity
    if "name" in patch:
        svc.table("activity_log").insert({
            "workspace_id":  user.workspace_id,
            "pipeline_id":   pipeline_id,
            "user_id":       user.id,
            "pipeline_name": pipeline["name"],
            "type":          "renamed",
            "detail":        f'Renamed to "{pipeline["name"]}"',
            "dot_color":     "#6B7280",
        }).execute()

    # Log archive/unarchive
    if "status" in patch and patch["status"] == "archived":
        svc.table("activity_log").insert({
            "workspace_id":  user.workspace_id,
            "pipeline_id":   pipeline_id,
            "user_id":       user.id,
            "pipeline_name": pipeline["name"],
            "type":          "archived",
            "detail":        "Pipeline archived",
            "dot_color":     "#6B7280",
        }).execute()

    return _fmt(pipeline)


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(pipeline_id: str, user: CurrentUser = Depends(get_current_user)):
    ensure_uuid(pipeline_id)
    svc = get_service_client()

    # Fetch name before delete for activity log
    meta = (
        svc.table("pipelines")
        .select("name, owner_id")
        .eq("id", pipeline_id)
        .eq("workspace_id", user.workspace_id)
        .execute()
    )
    if not meta.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    assert_editable(meta.data[0])  # read-only templates can't be deleted
    pipeline_name = meta.data[0]["name"]

    # Block deletion if any live deployments exist; archived ones are cleaned up automatically
    live_deps = (
        svc.table("deployments")
        .select("id", count="exact")
        .eq("pipeline_id", pipeline_id)
        .eq("status", "live")
        .execute()
    )
    if live_deps.count and live_deps.count > 0:
        raise HTTPException(
            status_code=409,
            detail="Pipeline has live deployments. Archive them before deleting.",
        )

    # Remove archived deployments so the FK RESTRICT doesn't block the pipeline delete
    svc.table("deployments").delete().eq("pipeline_id", pipeline_id).eq("status", "archived").execute()

    try:
        svc.table("pipelines").delete().eq("id", pipeline_id).eq("workspace_id", user.workspace_id).execute()
    except Exception as exc:
        msg = str(exc)
        if "23503" in msg or "restrict" in msg.lower():
            raise HTTPException(
                status_code=409,
                detail="Pipeline has active deployments. Archive all deployments before deleting.",
            )
        raise

    # Activity log (pipeline_id will be NULL after delete due to ON DELETE SET NULL)
    svc.table("activity_log").insert({
        "workspace_id":  user.workspace_id,
        "pipeline_id":   None,
        "user_id":       user.id,
        "pipeline_name": pipeline_name,
        "type":          "deleted",
        "detail":        "Pipeline deleted",
        "dot_color":     "#6B7280",
    }).execute()
