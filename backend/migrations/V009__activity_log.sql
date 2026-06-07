-- V009: Activity Log
--
-- Append-only event feed. Written server-side as a side effect of all
-- mutating operations (create, delete, validate, deploy, archive).
-- The frontend never writes directly to this table.
--
-- pipeline_id ON DELETE SET NULL so the feed entry survives pipeline deletion.
-- pipeline_name is denormalized for the same reason.

CREATE TABLE public.activity_log (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    pipeline_id     uuid        REFERENCES public.pipelines(id) ON DELETE SET NULL,
    user_id         uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    pipeline_name   text        NOT NULL DEFAULT '',
    type            text        NOT NULL,
    detail          text        NOT NULL DEFAULT '',
    dot_color       text        NOT NULL DEFAULT '#6B7280',
    created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_log IS
    'Immutable chronological event feed scoped to a workspace. '
    'Drives the Dashboard activity panel and future audit trail.';

COMMENT ON COLUMN public.activity_log.type IS
    'One of: created | renamed | deleted | archived | validated | '
    'validation_failed | deployed | deploy_archived';

COMMENT ON COLUMN public.activity_log.dot_color IS
    'Hex color for the timeline dot shown in the Dashboard activity feed.';
