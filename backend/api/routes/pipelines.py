from fastapi import APIRouter

from schemas.pipeline import ParseRequest, ParseResponse
from services.graph_service import analyse_graph

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


@router.post("/parse", response_model=ParseResponse)
async def parse_pipeline(req: ParseRequest) -> ParseResponse:
    """
    Accepts a ReactFlow graph (nodes + edges) and returns:
    - num_nodes: total node count
    - num_edges: total edge count
    - is_dag:    True if the graph is a directed acyclic graph

    Cycle detection uses Kahn's topological sort algorithm (O(V + E)).
    """
    return analyse_graph(req)
