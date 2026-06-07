-- V007: Validation Runs
--
-- One row per click of the Validate button in Studio.
-- pipeline_name is denormalized so history is preserved even if the pipeline
-- is renamed or deleted (ON DELETE SET NULL on pipeline_id).

CREATE TABLE public.validation_runs (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id     uuid        REFERENCES public.pipelines(id) ON DELETE SET NULL,
    workspace_id    uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    ran_by          uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    pipeline_name   text        NOT NULL DEFAULT '',  -- denormalized snapshot
    is_dag          boolean     NOT NULL,
    node_count      integer     NOT NULL DEFAULT 0 CHECK (node_count >= 0),
    edge_count      integer     NOT NULL DEFAULT 0 CHECK (edge_count >= 0),
    error           text,                             -- null when is_dag = true
    created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.validation_runs IS
    'Immutable audit log of every pipeline validation. Never updated, only inserted.';

COMMENT ON COLUMN public.validation_runs.pipeline_name IS
    'Snapshot of the pipeline name at validation time. '
    'Preserved even after pipeline rename or deletion.';

COMMENT ON COLUMN public.validation_runs.error IS
    'Cycle description or structural error message when is_dag = false. '
    'NULL when validation passes.';
