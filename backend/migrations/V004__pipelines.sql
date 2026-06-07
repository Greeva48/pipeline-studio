-- V004: Pipelines
--
-- Core entity. Every canvas, validation run, deployment, and activity log
-- entry is a child of a pipeline row.

CREATE TYPE public.pipeline_status AS ENUM ('draft', 'live', 'archived');

CREATE TABLE public.pipelines (
    id              uuid            PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    uuid            NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    owner_id        uuid            REFERENCES public.users(id) ON DELETE SET NULL,
    name            text            NOT NULL DEFAULT 'New Pipeline',
    description     text            NOT NULL DEFAULT '',
    accent_color    text            NOT NULL DEFAULT '#A855F7',
    status          pipeline_status NOT NULL DEFAULT 'draft',
    node_count      integer         NOT NULL DEFAULT 0 CHECK (node_count >= 0),
    edge_count      integer         NOT NULL DEFAULT 0 CHECK (edge_count >= 0),
    created_at      timestamptz     NOT NULL DEFAULT now(),
    updated_at      timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pipelines IS
    'Pipeline metadata. Canvas data lives in pipeline_canvas (1:1).';

COMMENT ON COLUMN public.pipelines.node_count IS
    'Denormalized count kept in sync by saveCanvas. Avoids full canvas JSONB scan for list views.';

COMMENT ON COLUMN public.pipelines.accent_color IS
    'Hex color used for the accent strip on the Projects page card.';

CREATE TRIGGER pipelines_set_updated_at
    BEFORE UPDATE ON public.pipelines
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
