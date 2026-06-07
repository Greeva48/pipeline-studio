-- Pipeline Studio — Combined Migration
-- Run this entire script in the Supabase Dashboard → SQL Editor
-- Paste all content and click Run.

-- ============================================================
-- V001: Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- V002: Workspaces and Users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        text        NOT NULL DEFAULT 'Pipeline Studio',
    owner_id    uuid,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
    CREATE TYPE public.workspace_role AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
    id              uuid            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           text            NOT NULL UNIQUE,
    name            text            NOT NULL DEFAULT '',
    initials        text            NOT NULL DEFAULT '',
    workspace_id    uuid            NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    role            workspace_role  NOT NULL DEFAULT 'admin',
    created_at      timestamptz     NOT NULL DEFAULT now(),
    updated_at      timestamptz     NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces
    DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;
ALTER TABLE public.workspaces
    ADD CONSTRAINT workspaces_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_workspace_id uuid;
BEGIN
    INSERT INTO public.workspaces (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'workspace_name', 'My Workspace'))
    RETURNING id INTO new_workspace_id;

    INSERT INTO public.users (id, email, name, initials, workspace_id, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        UPPER(LEFT(COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.email
        ), 2)),
        new_workspace_id,
        'admin'
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.workspaces
    SET owner_id = NEW.id
    WHERE id = new_workspace_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_set_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_set_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- V003: Workspace Settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspace_settings (
    workspace_id            uuid        PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    workspace_name          text        NOT NULL DEFAULT 'Pipeline Studio',
    default_pipeline_name   text        NOT NULL DEFAULT 'workflow.graph',
    auto_save               boolean     NOT NULL DEFAULT true,
    snap_to_grid            boolean     NOT NULL DEFAULT true,
    default_environment     text        NOT NULL DEFAULT 'Production'
                                        CHECK (default_environment IN ('Production', 'Staging')),
    auto_deploy_on_validate boolean     NOT NULL DEFAULT false,
    deployment_region       text        NOT NULL DEFAULT 'us-east-1',
    active_models           text[]      NOT NULL DEFAULT ARRAY['gpt-4o', 'claude-sonnet-4-6'],
    updated_at              timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS workspace_settings_set_updated_at ON public.workspace_settings;
CREATE TRIGGER workspace_settings_set_updated_at
    BEFORE UPDATE ON public.workspace_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.workspace_settings (workspace_id)
    VALUES (NEW.id)
    ON CONFLICT (workspace_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_workspace();

-- ============================================================
-- V004: Pipelines
-- ============================================================
DO $$ BEGIN
    CREATE TYPE public.pipeline_status AS ENUM ('draft', 'live', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.pipelines (
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

DROP TRIGGER IF EXISTS pipelines_set_updated_at ON public.pipelines;
CREATE TRIGGER pipelines_set_updated_at
    BEFORE UPDATE ON public.pipelines
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- V005: Pipeline Canvas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pipeline_canvas (
    pipeline_id uuid        PRIMARY KEY REFERENCES public.pipelines(id) ON DELETE CASCADE,
    nodes       jsonb       NOT NULL DEFAULT '[]'::jsonb,
    edges       jsonb       NOT NULL DEFAULT '[]'::jsonb,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS pipeline_canvas_set_updated_at ON public.pipeline_canvas;
CREATE TRIGGER pipeline_canvas_set_updated_at
    BEFORE UPDATE ON public.pipeline_canvas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.pipeline_canvas (pipeline_id)
    VALUES (NEW.id)
    ON CONFLICT (pipeline_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_pipeline_created ON public.pipelines;
CREATE TRIGGER on_pipeline_created
    AFTER INSERT ON public.pipelines
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_pipeline();

-- ============================================================
-- V006: Normalized Nodes and Edges
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nodes (
    id              text        NOT NULL,
    pipeline_id     uuid        NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    type            text        NOT NULL,
    position_x      real        NOT NULL DEFAULT 0,
    position_y      real        NOT NULL DEFAULT 0,
    data            jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, pipeline_id)
);

DROP TRIGGER IF EXISTS nodes_set_updated_at ON public.nodes;
CREATE TRIGGER nodes_set_updated_at
    BEFORE UPDATE ON public.nodes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.edges (
    id              text        NOT NULL,
    pipeline_id     uuid        NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    source          text        NOT NULL,
    target          text        NOT NULL,
    source_handle   text,
    target_handle   text,
    edge_type       text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, pipeline_id)
);

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

-- ============================================================
-- V007: Validation Runs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.validation_runs (
    id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id     uuid        REFERENCES public.pipelines(id) ON DELETE SET NULL,
    workspace_id    uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    ran_by          uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    pipeline_name   text        NOT NULL DEFAULT '',
    is_dag          boolean     NOT NULL,
    node_count      integer     NOT NULL DEFAULT 0 CHECK (node_count >= 0),
    edge_count      integer     NOT NULL DEFAULT 0 CHECK (edge_count >= 0),
    error           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- V008: Deployments
-- ============================================================
DO $$ BEGIN
    CREATE TYPE public.deployment_environment AS ENUM ('production', 'staging');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.deployment_status AS ENUM ('live', 'archived', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.deployments (
    id              uuid                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id     uuid                    NOT NULL REFERENCES public.pipelines(id) ON DELETE RESTRICT,
    workspace_id    uuid                    NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    deployed_by     uuid                    REFERENCES public.users(id) ON DELETE SET NULL,
    version         text                    NOT NULL,
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

-- ============================================================
-- V009: Activity Log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
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

-- ============================================================
-- V010: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_owner       ON public.workspaces (owner_id);
CREATE INDEX IF NOT EXISTS idx_users_workspace        ON public.users (workspace_id);
CREATE INDEX IF NOT EXISTS idx_users_email            ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_pipelines_workspace_updated
    ON public.pipelines (workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipelines_workspace_status
    ON public.pipelines (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_pipelines_owner        ON public.pipelines (owner_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_name_trgm
    ON public.pipelines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_nodes_pipeline         ON public.nodes (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type             ON public.nodes (pipeline_id, type);
CREATE INDEX IF NOT EXISTS idx_edges_pipeline         ON public.edges (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_edges_source           ON public.edges (pipeline_id, source);
CREATE INDEX IF NOT EXISTS idx_edges_target           ON public.edges (pipeline_id, target);
CREATE INDEX IF NOT EXISTS idx_validation_runs_workspace_created
    ON public.validation_runs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_runs_pipeline_created
    ON public.validation_runs (pipeline_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_workspace_status
    ON public.deployments (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_deployments_pipeline   ON public.deployments (pipeline_id, deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_env_status ON public.deployments (environment, status);
CREATE INDEX IF NOT EXISTS idx_activity_workspace_created
    ON public.activity_log (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_pipeline      ON public.activity_log (pipeline_id);

-- ============================================================
-- V011: Row Level Security
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT workspace_id FROM public.users WHERE id = auth.uid();
$$;

ALTER TABLE public.workspaces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_canvas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log        ENABLE ROW LEVEL SECURITY;

-- workspaces
DROP POLICY IF EXISTS workspaces_own_workspace ON public.workspaces;
CREATE POLICY workspaces_own_workspace ON public.workspaces
    FOR ALL USING (id = public.current_workspace_id());

-- users
DROP POLICY IF EXISTS users_same_workspace ON public.users;
CREATE POLICY users_same_workspace ON public.users
    FOR SELECT USING (workspace_id = public.current_workspace_id());

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users
    FOR UPDATE USING (id = auth.uid());

-- workspace_settings
DROP POLICY IF EXISTS ws_settings_own_workspace ON public.workspace_settings;
CREATE POLICY ws_settings_own_workspace ON public.workspace_settings
    FOR ALL USING (workspace_id = public.current_workspace_id());

-- pipelines
DROP POLICY IF EXISTS pipelines_own_workspace ON public.pipelines;
CREATE POLICY pipelines_own_workspace ON public.pipelines
    FOR SELECT USING (workspace_id = public.current_workspace_id());

DROP POLICY IF EXISTS pipelines_mutate ON public.pipelines;
CREATE POLICY pipelines_mutate ON public.pipelines
    FOR ALL
    USING (
        workspace_id = public.current_workspace_id()
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'editor')
    );

-- pipeline_canvas
DROP POLICY IF EXISTS canvas_own_workspace ON public.pipeline_canvas;
CREATE POLICY canvas_own_workspace ON public.pipeline_canvas
    FOR ALL
    USING (
        pipeline_id IN (
            SELECT id FROM public.pipelines WHERE workspace_id = public.current_workspace_id()
        )
    );

-- nodes
DROP POLICY IF EXISTS nodes_own_workspace ON public.nodes;
CREATE POLICY nodes_own_workspace ON public.nodes
    FOR ALL
    USING (
        pipeline_id IN (
            SELECT id FROM public.pipelines WHERE workspace_id = public.current_workspace_id()
        )
    );

-- edges
DROP POLICY IF EXISTS edges_own_workspace ON public.edges;
CREATE POLICY edges_own_workspace ON public.edges
    FOR ALL
    USING (
        pipeline_id IN (
            SELECT id FROM public.pipelines WHERE workspace_id = public.current_workspace_id()
        )
    );

-- validation_runs
DROP POLICY IF EXISTS validation_runs_read ON public.validation_runs;
CREATE POLICY validation_runs_read ON public.validation_runs
    FOR SELECT USING (workspace_id = public.current_workspace_id());

DROP POLICY IF EXISTS validation_runs_insert ON public.validation_runs;
CREATE POLICY validation_runs_insert ON public.validation_runs
    FOR INSERT
    WITH CHECK (
        workspace_id = public.current_workspace_id()
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'editor')
    );

-- deployments
DROP POLICY IF EXISTS deployments_read ON public.deployments;
CREATE POLICY deployments_read ON public.deployments
    FOR SELECT USING (workspace_id = public.current_workspace_id());

DROP POLICY IF EXISTS deployments_mutate ON public.deployments;
CREATE POLICY deployments_mutate ON public.deployments
    FOR ALL
    USING (
        workspace_id = public.current_workspace_id()
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'editor')
    );

-- activity_log
DROP POLICY IF EXISTS activity_read ON public.activity_log;
CREATE POLICY activity_read ON public.activity_log
    FOR SELECT USING (workspace_id = public.current_workspace_id());

DROP POLICY IF EXISTS activity_insert ON public.activity_log;
CREATE POLICY activity_insert ON public.activity_log
    FOR INSERT WITH CHECK (workspace_id = public.current_workspace_id());
