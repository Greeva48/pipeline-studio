from collections import deque

from schemas.pipeline import ParseRequest, ParseResponse


def analyse_graph(req: ParseRequest) -> ParseResponse:
    """
    Validates whether the submitted ReactFlow graph is a directed acyclic graph (DAG).

    Algorithm: Kahn's topological sort (BFS-based).
    - Compute in-degree for every node.
    - Seed a queue with all zero-in-degree nodes.
    - Each iteration: pop a node, decrement neighbours' in-degrees, enqueue
      any that reach zero.
    - If the total processed == total nodes, no cycle exists → is_dag = True.
    - Any unprocessed node is part of a cycle → is_dag = False.

    Edge nodes that reference unknown node IDs are treated as structural errors
    and cause is_dag = False without raising an exception.
    """
    node_ids = {n.id for n in req.nodes}
    num_nodes = len(node_ids)
    num_edges = len(req.edges)

    # Validate edge endpoints exist before building the graph
    for edge in req.edges:
        if edge.source not in node_ids or edge.target not in node_ids:
            return ParseResponse(
                num_nodes=num_nodes,
                num_edges=num_edges,
                is_dag=False,
            )

    # Build adjacency list and in-degree map
    adjacency: dict[str, list[str]] = {nid: [] for nid in node_ids}
    in_degree: dict[str, int] = {nid: 0 for nid in node_ids}

    for edge in req.edges:
        adjacency[edge.source].append(edge.target)
        in_degree[edge.target] += 1

    # Kahn's BFS
    queue: deque[str] = deque(nid for nid, deg in in_degree.items() if deg == 0)
    processed = 0

    while queue:
        node = queue.popleft()
        processed += 1
        for neighbour in adjacency[node]:
            in_degree[neighbour] -= 1
            if in_degree[neighbour] == 0:
                queue.append(neighbour)

    return ParseResponse(
        num_nodes=num_nodes,
        num_edges=num_edges,
        is_dag=(processed == num_nodes),
    )
