"""
Deployments routes.
Endpoint prefix: /api/deployments
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from api.deps import CurrentUser, get_current_user
from api.utils import assert_editable, ensure_uuid
from infrastructure.supabase.client import get_service_client

router = APIRouter(prefix="/api/deployments", tags=["deployments"])


class CreateDeploymentBody(BaseModel):
    pipeline_id: str
    environment: str = "staging"


def _next_version(existing: list[dict]) -> str:
    """Auto-increment semver patch from the latest deployment version."""
    if not existing:
        return "v1.0.0"
    latest = existing[0].get("version", "v0.0.0")
    parts = latest.lstrip("v").split(".")
    try:
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
        return f"v{major}.{minor}.{patch + 1}"
    except (IndexError, ValueError):
        return "v1.0.0"


def _fmt(row: dict) -> dict:
    return {
        "id":          row["id"],
        "pipelineId":  row.get("pipeline_id"),
        "version":     row["version"],
        "environment": row["environment"],
        "status":      row["status"],
        "latencyMs":   row.get("latency_ms"),
        "deployedAt":  row.get("deployed_at"),
        "archivedAt":  row.get("archived_at"),
        "pipelineName": row.get("pipeline_name", ""),
    }


@router.get("")
async def list_deployments(
    env: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    svc = get_service_client()
    q = (
        svc.table("deployments")
        .select(
            "id, pipeline_id, version, environment, status, latency_ms, deployed_at, archived_at, "
            "pipelines(name)"
        )
        .eq("workspace_id", user.workspace_id)
        .order("deployed_at", desc=True)
    )
    if env and env.lower() in ("production", "staging"):
        q = q.eq("environment", env.lower())

    rows = q.execute()
    result = []
    for r in (rows.data or []):
        pipeline_name = ""
        if r.get("pipelines"):
            pipeline_name = r["pipelines"].get("name", "")
        item = _fmt(r)
        item["pipelineName"] = pipeline_name
        result.append(item)
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_deployment(
    body: CreateDeploymentBody,
    user: CurrentUser = Depends(get_current_user),
):
    ensure_uuid(body.pipeline_id)
    svc = get_service_client()

    # Verify pipeline ownership
    meta = (
        svc.table("pipelines")
        .select("id, name, owner_id")
        .eq("id", body.pipeline_id)
        .eq("workspace_id", user.workspace_id)
        .execute()
    )
    if not meta.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    assert_editable(meta.data[0])  # read-only templates can't be deployed

    pipeline_name = meta.data[0]["name"]

    env = body.environment.lower()
    if env not in ("production", "staging"):
        raise HTTPException(status_code=422, detail="environment must be 'production' or 'staging'")

    # Get latest version for this pipeline to auto-increment
    existing = (
        svc.table("deployments")
        .select("version")
        .eq("pipeline_id", body.pipeline_id)
        .order("deployed_at", desc=True)
        .limit(1)
        .execute()
    )
    version = _next_version(existing.data or [])

    row = svc.table("deployments").insert({
        "pipeline_id":  body.pipeline_id,
        "workspace_id": user.workspace_id,
        "deployed_by":  user.id,
        "version":      version,
        "environment":  env,
        "status":       "live",
    }).execute()

    deployment = row.data[0]

    # Update pipeline status to live
    svc.table("pipelines").update({"status": "live"}).eq("id", body.pipeline_id).execute()

    # Log activity
    svc.table("activity_log").insert({
        "workspace_id":  user.workspace_id,
        "pipeline_id":   body.pipeline_id,
        "user_id":       user.id,
        "pipeline_name": pipeline_name,
        "type":          "deployed",
        "detail":        f"Deployed {version} to {env}",
        "dot_color":     "#A855F7",
    }).execute()

    item = _fmt(deployment)
    item["pipelineName"] = pipeline_name
    return item


@router.put("/{deployment_id}/archive")
async def archive_deployment(
    deployment_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    from datetime import datetime, timezone

    svc = get_service_client()

    check = (
        svc.table("deployments")
        .select("id, pipeline_id, version")
        .eq("id", deployment_id)
        .eq("workspace_id", user.workspace_id)
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Deployment not found")

    pipeline_id = check.data[0].get("pipeline_id")
    version = check.data[0].get("version", "")

    now_iso = datetime.now(timezone.utc).isoformat()
    rows = svc.table("deployments").update({
        "status":      "archived",
        "archived_at": now_iso,
    }).eq("id", deployment_id).execute()

    # Log activity
    if pipeline_id:
        meta = svc.table("pipelines").select("name").eq("id", pipeline_id).execute()
        pipeline_name = meta.data[0]["name"] if meta.data else ""
        svc.table("activity_log").insert({
            "workspace_id":  user.workspace_id,
            "pipeline_id":   pipeline_id,
            "user_id":       user.id,
            "pipeline_name": pipeline_name,
            "type":          "deploy_archived",
            "detail":        f"Archived deployment {version}",
            "dot_color":     "#6B7280",
        }).execute()

    return _fmt(rows.data[0])
