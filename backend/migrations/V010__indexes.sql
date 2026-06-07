-- V010: Indexes
--
-- Added after all tables exist to avoid forward-reference issues.
-- All FK columns that appear in WHERE clauses get indexes.
-- List-view queries (ordered by updated_at DESC) get composite indexes.

-- ── workspaces ────────────────────────────────────────────────────────────────
CREATE INDEX idx_workspaces_owner       ON public.workspaces (owner_id);

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_workspace        ON public.users (workspace_id);
CREATE INDEX idx_users_email            ON public.users (email);

-- ── pipelines ─────────────────────────────────────────────────────────────────
-- Primary list query: all pipelines in a workspace, newest first
CREATE INDEX idx_pipelines_workspace_updated
    ON public.pipelines (workspace_id, updated_at DESC);

-- Filter by status (Projects page filter tabs)
CREATE INDEX idx_pipelines_workspace_status
    ON public.pipelines (workspace_id, status);

CREATE INDEX idx_pipelines_owner        ON public.pipelines (owner_id);

-- Trigram index for pipeline name search (requires pg_trgm from V001)
CREATE INDEX idx_pipelines_name_trgm
    ON public.pipelines USING gin (name gin_trgm_ops);

-- ── nodes ─────────────────────────────────────────────────────────────────────
CREATE INDEX idx_nodes_pipeline         ON public.nodes (pipeline_id);
CREATE INDEX idx_nodes_type             ON public.nodes (pipeline_id, type);

-- ── edges ─────────────────────────────────────────────────────────────────────
CREATE INDEX idx_edges_pipeline         ON public.edges (pipeline_id);
CREATE INDEX idx_edges_source           ON public.edges (pipeline_id, source);
CREATE INDEX idx_edges_target           ON public.edges (pipeline_id, target);

-- ── validation_runs ───────────────────────────────────────────────────────────
-- Validation history page: all runs in a workspace, newest first
CREATE INDEX idx_validation_runs_workspace_created
    ON public.validation_runs (workspace_id, created_at DESC);

-- Per-pipeline validation history
CREATE INDEX idx_validation_runs_pipeline_created
    ON public.validation_runs (pipeline_id, created_at DESC);

-- ── deployments ───────────────────────────────────────────────────────────────
-- Deployments page: all live deployments in a workspace
CREATE INDEX idx_deployments_workspace_status
    ON public.deployments (workspace_id, status);

CREATE INDEX idx_deployments_pipeline   ON public.deployments (pipeline_id, deployed_at DESC);
CREATE INDEX idx_deployments_env_status ON public.deployments (environment, status);

-- ── activity_log ──────────────────────────────────────────────────────────────
-- Dashboard feed: most recent 100 events for a workspace
CREATE INDEX idx_activity_workspace_created
    ON public.activity_log (workspace_id, created_at DESC);

CREATE INDEX idx_activity_pipeline      ON public.activity_log (pipeline_id);
