"""
Canvas routes — load and save ReactFlow canvas state for a pipeline.
Endpoint prefix: /api/projects/{pipeline_id}/canvas
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import CurrentUser, get_current_user
from api.utils import assert_editable, ensure_uuid
from infrastructure.supabase.client import get_service_client

router = APIRouter(prefix="/api/projects", tags=["canvas"])


class SaveCanvasBody(BaseModel):
    nodes: list = []
    edges: list = []


def _get_owned_pipeline(svc, pipeline_id: str, workspace_id: str) -> dict:
    ensure_uuid(pipeline_id)
    rows = (
        svc.table("pipelines")
        .select("id, owner_id")
        .eq("id", pipeline_id)
        .eq("workspace_id", workspace_id)
        .execute()
    )
    if not rows.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return rows.data[0]


@router.get("/{pipeline_id}/canvas")
async def load_canvas(pipeline_id: str, user: CurrentUser = Depends(get_current_user)):
    svc = get_service_client()
    _get_owned_pipeline(svc, pipeline_id, user.workspace_id)  # read allowed for templates

    rows = (
        svc.table("pipeline_canvas")
        .select("nodes, edges, updated_at")
        .eq("pipeline_id", pipeline_id)
        .execute()
    )
    if not rows.data:
        return {"nodes": [], "edges": [], "updatedAt": None}

    row = rows.data[0]
    return {
        "nodes":     row["nodes"] or [],
        "edges":     row["edges"] or [],
        "updatedAt": row.get("updated_at"),
    }


@router.put("/{pipeline_id}/canvas")
async def save_canvas(
    pipeline_id: str,
    body: SaveCanvasBody,
    user: CurrentUser = Depends(get_current_user),
):
    svc = get_service_client()
    assert_editable(_get_owned_pipeline(svc, pipeline_id, user.workspace_id))

    # Upsert canvas JSONB
    svc.table("pipeline_canvas").upsert({
        "pipeline_id": pipeline_id,
        "nodes":       body.nodes,
        "edges":       body.edges,
    }).execute()

    # Keep denormalized counts in sync
    svc.table("pipelines").update({
        "node_count": len(body.nodes),
        "edge_count": len(body.edges),
    }).eq("id", pipeline_id).execute()

    # Sync to normalized nodes/edges tables
    try:
        import json
        svc.rpc("sync_canvas_to_normalized", {
            "p_pipeline_id": pipeline_id,
            "p_nodes":       body.nodes,
            "p_edges":       body.edges,
        }).execute()
    except Exception:
        pass  # normalized tables are secondary; don't fail the save

    return {"ok": True, "nodeCount": len(body.nodes), "edgeCount": len(body.edges)}
