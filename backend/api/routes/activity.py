"""
Activity routes — workspace activity feed.
Endpoint prefix: /api/activity
"""

from fastapi import APIRouter, Depends

from api.deps import CurrentUser, get_current_user
from infrastructure.supabase.client import get_service_client

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("")
async def list_activity(limit: int = 50, user: CurrentUser = Depends(get_current_user)):
    svc = get_service_client()
    rows = (
        svc.table("activity_log")
        .select("id, pipeline_id, pipeline_name, type, detail, dot_color, created_at")
        .eq("workspace_id", user.workspace_id)
        .order("created_at", desc=True)
        .limit(min(limit, 100))
        .execute()
    )
    return [
        {
            "id":           r["id"],
            "pipelineId":   r.get("pipeline_id"),
            "pipelineName": r.get("pipeline_name", ""),
            "type":         r["type"],
            "detail":       r.get("detail", ""),
            "dotColor":     r.get("dot_color", "#6B7280"),
            "timestamp":    r["created_at"],
        }
        for r in (rows.data or [])
    ]
