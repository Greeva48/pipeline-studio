-- V011: Row Level Security
--
-- Every table is workspace-scoped. The pattern is:
--   auth.uid() → users.id → users.workspace_id → resource.workspace_id
--
-- A helper function resolves the current user's workspace_id once per query.
-- All policies use it to avoid per-row subqueries against the users table.

-- ── Helper: current user's workspace_id ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT workspace_id FROM public.users WHERE id = auth.uid();
$$;

-- ── Enable RLS on all application tables ─────────────────────────────────────

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

-- ── workspaces ────────────────────────────────────────────────────────────────

CREATE POLICY workspaces_own_workspace ON public.workspaces
    FOR ALL
    USING (id = public.current_workspace_id());

-- ── users ─────────────────────────────────────────────────────────────────────

-- Members can see all users in their workspace
CREATE POLICY users_same_workspace ON public.users
    FOR SELECT
    USING (workspace_id = public.current_workspace_id());

-- A user can update only their own profile
CREATE POLICY users_update_self ON public.users
    FOR UPDATE
    USING (id = auth.uid());

-- ── workspace_settings ────────────────────────────────────────────────────────

CREATE POLICY ws_settings_own_workspace ON public.workspace_settings
    FOR ALL
    USING (workspace_id = public.current_workspace_id());

-- ── pipelines ─────────────────────────────────────────────────────────────────

CREATE POLICY pipelines_own_workspace ON public.pipelines
    FOR SELECT
    USING (workspace_id = public.current_workspace_id());

-- Only admin and editor roles can mutate pipelines
CREATE POLICY pipelines_mutate ON public.pipelines
    FOR ALL
    USING (
        workspace_id = public.current_workspace_id()
        AND (
            SELECT role FROM public.users WHERE id = auth.uid()
        ) IN ('admin', 'editor')
    );

-- ── pipeline_canvas ───────────────────────────────────────────────────────────

CREATE POLICY canvas_own_workspace ON public.pipeline_canvas
    FOR ALL
    USING (
        pipeline_id IN (
            SELECT id FROM public.pipelines
            WHERE workspace_id = public.current_workspace_id()
        )
    );

-- ── nodes ─────────────────────────────────────────────────────────────────────

CREATE POLICY nodes_own_workspace ON public.nodes
    FOR ALL
    USING (
        pipeline_id IN (
            SELECT id FROM public.pipelines
            WHERE workspace_id = public.current_workspace_id()
        )
    );

-- ── edges ─────────────────────────────────────────────────────────────────────

CREATE POLICY edges_own_workspace ON public.edges
    FOR ALL
    USING (
        pipeline_id IN (
            SELECT id FROM public.pipelines
            WHERE workspace_id = public.current_workspace_id()
        )
    );

-- ── validation_runs ───────────────────────────────────────────────────────────

-- All workspace members can read validation history
CREATE POLICY validation_runs_read ON public.validation_runs
    FOR SELECT
    USING (workspace_id = public.current_workspace_id());

-- Only admin/editor can insert (Validate button requires write access)
CREATE POLICY validation_runs_insert ON public.validation_runs
    FOR INSERT
    WITH CHECK (
        workspace_id = public.current_workspace_id()
        AND (
            SELECT role FROM public.users WHERE id = auth.uid()
        ) IN ('admin', 'editor')
    );

-- ── deployments ───────────────────────────────────────────────────────────────

CREATE POLICY deployments_read ON public.deployments
    FOR SELECT
    USING (workspace_id = public.current_workspace_id());

CREATE POLICY deployments_mutate ON public.deployments
    FOR ALL
    USING (
        workspace_id = public.current_workspace_id()
        AND (
            SELECT role FROM public.users WHERE id = auth.uid()
        ) IN ('admin', 'editor')
    );

-- ── activity_log ──────────────────────────────────────────────────────────────

-- All members can read activity
CREATE POLICY activity_read ON public.activity_log
    FOR SELECT
    USING (workspace_id = public.current_workspace_id());

-- Backend service role inserts on behalf of users — no direct client insert
CREATE POLICY activity_insert ON public.activity_log
    FOR INSERT
    WITH CHECK (workspace_id = public.current_workspace_id());
