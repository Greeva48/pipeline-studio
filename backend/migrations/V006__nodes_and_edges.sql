-- V006: Normalized Nodes and Edges
--
-- Secondary representation of canvas content. These tables are populated
-- as a side effect of canvas saves (via a database function or backend service).
-- They enable: per-node queries, analytics, future graph execution engine,
-- and fine-grained RLS without scanning JSONB.
--
-- Primary storage is pipeline_canvas (JSONB). These tables are derived.

-- ── Nodes ─────────────────────────────────────────────────────────────────────

CREATE TABLE public.nodes (
    id              text        NOT NULL,           -- ReactFlow node id ("customInput-1")
    pipeline_id     uuid        NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    type            text        NOT NULL,           -- "customInput", "llm", "text", etc.
    position_x      real        NOT NULL DEFAULT 0,
    position_y      real        NOT NULL DEFAULT 0,
    data            jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- node-specific config
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, pipeline_id)
);

COMMENT ON TABLE public.nodes IS
    'Normalized node rows, derived from pipeline_canvas.nodes JSONB. '
    'Rebuilt on every canvas save. Do not mutate directly.';

COMMENT ON COLUMN public.nodes.data IS
    'Node-type-specific config: {inputName, inputType} for Input; '
    '{model, temperature, maxTokens} for LLM; etc.';

CREATE TRIGGER nodes_set_updated_at
    BEFORE UPDATE ON public.nodes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Edges ─────────────────────────────────────────────────────────────────────

CREATE TABLE public.edges (
    id              text        NOT NULL,           -- ReactFlow edge id
    pipeline_id     uuid        NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    source          text        NOT NULL,           -- source node id
    target          text        NOT NULL,           -- target node id
    source_handle   text,                           -- e.g. "customInput-1-value"
    target_handle   text,                           -- e.g. "llm-1-prompt"
    edge_type       text,                           -- ReactFlow edge type ("smoothstep")
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, pipeline_id)
);

COMMENT ON TABLE public.edges IS
    'Normalized edge rows, derived from pipeline_canvas.edges JSONB. '
    'Rebuilt on every canvas save. Do not mutate directly.';

-- ── Sync function: called by backend after every canvas save ──────────────────
-- Replaces all nodes/edges for a pipeline atomically.

CREATE OR REPLACE FUNCTION public.sync_canvas_to_normalized(
    p_pipeline_id   uuid,
    p_nodes         jsonb,
    p_edges         jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Replace nodes
    DELETE FROM public.nodes WHERE pipeline_id = p_pipeline_id;
    INSERT INTO public.nodes (id, pipeline_id, type, position_x, position_y, data)
    SELECT
        node->>'id',
        p_pipeline_id,
        COALESCE(node->>'type', 'unknown'),
        COALESCE((node->'position'->>'x')::real, 0),
        COALESCE((node->'position'->>'y')::real, 0),
        COALESCE(node->'data', '{}'::jsonb)
    FROM jsonb_array_elements(p_nodes) AS node;

    -- Replace edges
    DELETE FROM public.edges WHERE pipeline_id = p_pipeline_id;
    INSERT INTO public.edges (id, pipeline_id, source, target, source_handle, target_handle, edge_type)
    SELECT
        edge->>'id',
        p_pipeline_id,
        edge->>'source',
        edge->>'target',
        edge->>'sourceHandle',
        edge->>'targetHandle',
        edge->>'type'
    FROM jsonb_array_elements(p_edges) AS edge;
END;
$$;
