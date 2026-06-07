-- V003: Workspace Settings
--
-- 1:1 with workspaces. Stores all values currently in db.js DEFAULT_SETTINGS.
-- Upserted on first access so a row always exists.

CREATE TABLE public.workspace_settings (
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

COMMENT ON TABLE public.workspace_settings IS
    'Persisted workspace preferences. Maps 1:1 to the Settings page General/Deployment sections.';

CREATE TRIGGER workspace_settings_set_updated_at
    BEFORE UPDATE ON public.workspace_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create default settings row when workspace is created
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.workspace_settings (workspace_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_workspace();
