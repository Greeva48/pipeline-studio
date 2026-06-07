from typing import Any
from pydantic import BaseModel


# ── Inbound: raw ReactFlow graph ──────────────────────────────────────────────

class NodePosition(BaseModel):
    x: float
    y: float


class ReactFlowNode(BaseModel):
    id: str
    type: str | None = None
    position: NodePosition | None = None
    data: dict[str, Any] = {}


class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: str | None = None
    targetHandle: str | None = None
    type: str | None = None


class ParseRequest(BaseModel):
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]


# ── Outbound: graph analysis result ──────────────────────────────────────────

class ParseResponse(BaseModel):
    num_nodes: int
    num_edges: int
    is_dag: bool
