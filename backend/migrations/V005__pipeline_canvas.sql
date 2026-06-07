-- V005: Pipeline Canvas
--
-- Stores the full ReactFlow graph state as JSONB — exactly what the frontend
-- sends and expects back. The JSONB approach is correct here because the
-- frontend treats the canvas as a single atomic blob: it always saves/loads
-- the complete state, never patches individual nodes.
--
-- Normalized nodes/edges tables (V006) exist for querying and analytics.
-- They are populated as a side effect of canvas saves, not as the primary
-- storage path.

CREATE TABLE public.pipeline_canvas (
    pipeline_id uuid        PRIMARY KEY REFERENCES public.pipelines(id) ON DELETE CASCADE,
    nodes       jsonb       NOT NULL DEFAULT '[]'::jsonb,
    edges       jsonb       NOT NULL DEFAULT '[]'::jsonb,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pipeline_canvas IS
    'Raw ReactFlow canvas state. 1:1 with pipelines. Nodes/edges stored as JSONB blobs.';

COMMENT ON COLUMN public.pipeline_canvas.nodes IS
    'Array of ReactFlow node objects: {id, type, position: {x,y}, data: {...}}';

COMMENT ON COLUMN public.pipeline_canvas.edges IS
    'Array of ReactFlow edge objects: {id, source, target, sourceHandle, targetHandle, type}';

CREATE TRIGGER pipeline_canvas_set_updated_at
    BEFORE UPDATE ON public.pipeline_canvas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create empty canvas when pipeline is created
CREATE OR REPLACE FUNCTION public.handle_new_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.pipeline_canvas (pipeline_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_pipeline_created
    AFTER INSERT ON public.pipelines
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_pipeline();
