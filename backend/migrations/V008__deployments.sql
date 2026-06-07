-- V008: Deployments
--
-- ON DELETE RESTRICT on pipeline_id: you cannot delete a pipeline that
-- has ever been deployed (prevents orphaned production artifacts).
-- Archive the pipeline first, then delete if needed after confirmation.

CREATE TYPE public.deployment_environment AS ENUM ('production', 'staging');
CREATE TYPE public.deployment_status      AS ENUM ('live', 'archived', 'failed');

CREATE TABLE public.deployments (
    id              uuid                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id     uuid                    NOT NULL REFERENCES public.pipelines(id) ON DELETE RESTRICT,
    workspace_id    uuid                    NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    deployed_by     uuid                    REFERENCES public.users(id) ON DELETE SET NULL,
    version         text                    NOT NULL,       -- semver string e.g. "v1.4.2"
    environment     deployment_environment  NOT NULL DEFAULT 'staging',
    status          deployment_status       NOT NULL DEFAULT 'live',
    latency_ms      integer                 CHECK (latency_ms IS NULL OR latency_ms >= 0),
    deployed_at     timestamptz             NOT NULL DEFAULT now(),
    archived_at     timestamptz,

    CONSTRAINT deployments_archive_consistency
        CHECK (
            (status = 'archived' AND archived_at IS NOT NULL) OR
            (status != 'archived' AND archived_at IS NULL)
        )
);

COMMENT ON TABLE public.deployments IS
    'One row per deployment event. Archiving a deployment sets status=archived '
    'and archived_at; it does not delete the row.';

COMMENT ON COLUMN public.deployments.version IS
    'Semantic version tag assigned at deploy time. Auto-increment logic lives in the service layer.';

COMMENT ON COLUMN public.deployments.latency_ms IS
    'Most recent p50 latency in milliseconds. Updated by the execution runtime, null until first invocation.';
