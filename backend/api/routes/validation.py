"""
Validation routes — run validation on a pipeline and persist results.
Endpoint prefix: /api/projects/{pipeline_id}/validate  and  /api/validation-runs
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import CurrentUser, get_current_user
from api.utils import ensure_uuid
from infrastructure.supabase.client import get_service_client
from schemas.pipeline import ParseRequest
from services.graph_service import analyse_graph

router = APIRouter(tags=["validation"])


class ValidateBody(BaseModel):
    nodes: list = []
    edges: list = []
    pipeline_name: str = "Pipeline"


@router.post("/api/projects/{pipeline_id}/validate")
async def validate_pipeline(
    pipeline_id: str,
    body: ValidateBody,
    user: CurrentUser = Depends(get_current_user),
):
    ensure_uuid(pipeline_id)
    svc = get_service_client()

    # Confirm ownership
    rows = (
        svc.table("pipelines")
        .select("id, name")
        .eq("id", pipeline_id)
        .eq("workspace_id", user.workspace_id)
        .execute()
    )
    if not rows.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    pipeline_name = rows.data[0]["name"]

    # Run DAG analysis
    req = ParseRequest(nodes=body.nodes, edges=body.edges)
    result = analyse_graph(req)

    error_msg = None
    if not result.is_dag:
        error_msg = "Cycle detected in graph"

    # Persist validation run
    run_row = svc.table("validation_runs").insert({
        "pipeline_id":   pipeline_id,
        "workspace_id":  user.workspace_id,
        "ran_by":        user.id,
        "pipeline_name": pipeline_name,
        "is_dag":        result.is_dag,
        "node_count":    result.num_nodes,
        "edge_count":    result.num_edges,
        "error":         error_msg,
    }).execute()

    run_id = run_row.data[0]["id"] if run_row.data else None

    # Log activity
    svc.table("activity_log").insert({
        "workspace_id":  user.workspace_id,
        "pipeline_id":   pipeline_id,
        "user_id":       user.id,
        "pipeline_name": pipeline_name,
        "type":          "validated" if result.is_dag else "validation_failed",
        "detail":        (
            f"VALID DAG · {result.num_nodes} nodes · {result.num_edges} edges"
            if result.is_dag
            else f"CYCLE DETECTED · {error_msg}"
        ),
        "dot_color":     "#4ADE80" if result.is_dag else "#F87171",
    }).execute()

    return {
        "id":         run_id,
        "isDAG":      result.is_dag,
        "numNodes":   result.num_nodes,
        "numEdges":   result.num_edges,
        "error":      error_msg,
        "pipelineName": pipeline_name,
    }


@router.get("/api/validation-runs")
async def list_validation_runs(user: CurrentUser = Depends(get_current_user)):
    svc = get_service_client()
    rows = (
        svc.table("validation_runs")
        .select("id, pipeline_id, pipeline_name, is_dag, node_count, edge_count, error, created_at")
        .eq("workspace_id", user.workspace_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return [
        {
            "id":           r["id"],
            "pipelineId":   r.get("pipeline_id"),
            "pipelineName": r.get("pipeline_name", ""),
            "isDAG":        r["is_dag"],
            "nodeCount":    r.get("node_count", 0),
            "edgeCount":    r.get("edge_count", 0),
            "error":        r.get("error"),
            "timestamp":    r["created_at"],
        }
        for r in (rows.data or [])
    ]


@router.get("/api/projects/{pipeline_id}/validation-runs")
async def list_pipeline_validation_runs(
    pipeline_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    ensure_uuid(pipeline_id)
    svc = get_service_client()
    rows = (
        svc.table("validation_runs")
        .select("id, pipeline_id, pipeline_name, is_dag, node_count, edge_count, error, created_at")
        .eq("pipeline_id", pipeline_id)
        .eq("workspace_id", user.workspace_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return [
        {
            "id":           r["id"],
            "pipelineId":   r.get("pipeline_id"),
            "pipelineName": r.get("pipeline_name", ""),
            "isDAG":        r["is_dag"],
            "nodeCount":    r.get("node_count", 0),
            "edgeCount":    r.get("edge_count", 0),
            "error":        r.get("error"),
            "timestamp":    r["created_at"],
        }
        for r in (rows.data or [])
    ]
