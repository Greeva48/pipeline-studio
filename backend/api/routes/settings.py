"""
Settings routes — workspace settings persistence.
Endpoint prefix: /api/settings
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.deps import CurrentUser, get_current_user
from infrastructure.supabase.client import get_service_client

router = APIRouter(prefix="/api/settings", tags=["settings"])


class UpdateSettingsBody(BaseModel):
    workspace_name:           Optional[str]       = None
    default_pipeline_name:    Optional[str]       = None
    auto_save:                Optional[bool]      = None
    snap_to_grid:             Optional[bool]      = None
    default_environment:      Optional[str]       = None
    auto_deploy_on_validate:  Optional[bool]      = None
    deployment_region:        Optional[str]       = None
    active_models:            Optional[list[str]] = None


def _fmt(row: dict) -> dict:
    return {
        "workspaceName":          row.get("workspace_name",         "Pipeline Studio"),
        "defaultPipelineName":    row.get("default_pipeline_name",  "workflow.graph"),
        "autoSave":               row.get("auto_save",              True),
        "snapToGrid":             row.get("snap_to_grid",           True),
        "defaultEnvironment":     row.get("default_environment",    "Production"),
        "autoDeployOnValidate":   row.get("auto_deploy_on_validate", False),
        "deploymentRegion":       row.get("deployment_region",      "us-east-1"),
        "activeModels":           row.get("active_models",          ["gpt-4o", "claude-sonnet-4-6"]),
    }


@router.get("")
async def get_settings(user: CurrentUser = Depends(get_current_user)):
    svc = get_service_client()
    rows = (
        svc.table("workspace_settings")
        .select("*")
        .eq("workspace_id", user.workspace_id)
        .execute()
    )
    if not rows.data:
        # Auto-create defaults if missing (handles edge cases)
        svc.table("workspace_settings").upsert({
            "workspace_id": user.workspace_id
        }).execute()
        return _fmt({})
    return _fmt(rows.data[0])


@router.put("")
async def update_settings(body: UpdateSettingsBody, user: CurrentUser = Depends(get_current_user)):
    svc = get_service_client()
    patch: dict = {"workspace_id": user.workspace_id}

    if body.workspace_name is not None:         patch["workspace_name"]          = body.workspace_name
    if body.default_pipeline_name is not None:  patch["default_pipeline_name"]   = body.default_pipeline_name
    if body.auto_save is not None:              patch["auto_save"]               = body.auto_save
    if body.snap_to_grid is not None:           patch["snap_to_grid"]            = body.snap_to_grid
    if body.default_environment is not None:    patch["default_environment"]     = body.default_environment
    if body.auto_deploy_on_validate is not None: patch["auto_deploy_on_validate"] = body.auto_deploy_on_validate
    if body.deployment_region is not None:      patch["deployment_region"]       = body.deployment_region
    if body.active_models is not None:          patch["active_models"]           = body.active_models

    rows = svc.table("workspace_settings").upsert(patch).execute()
    return _fmt(rows.data[0] if rows.data else {})
