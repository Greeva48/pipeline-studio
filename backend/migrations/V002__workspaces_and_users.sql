-- V002: Workspaces and Users
--
-- Design notes:
--   - Each user belongs to exactly one workspace (multi-workspace support
--     can be added later by converting the FK to a join table).
--   - `users` references `auth.users` (managed by Supabase Auth).
--     The FK is deferred so the trigger that creates a profile row
--     can fire after the auth insert completes.
--   - `workspaces.owner_id` is nullable during creation because the
--     workspace row must exist before the owner user row can reference it.
--     A CHECK or trigger can enforce non-null after setup.

-- ── Workspaces ────────────────────────────────────────────────────────────────

CREATE TABLE public.workspaces (
    id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        text        NOT NULL DEFAULT 'Pipeline Studio',
    owner_id    uuid,                         -- FK added after users table exists (see below)
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspaces IS
    'Top-level tenant boundary. All user data is scoped to a workspace.';

-- ── Users ─────────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with application-level profile data.

CREATE TYPE public.workspace_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.users (
    id              uuid            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           text            NOT NULL UNIQUE,
    name            text            NOT NULL DEFAULT '',
    initials        text            NOT NULL DEFAULT '',
    workspace_id    uuid            NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    role            workspace_role  NOT NULL DEFAULT 'admin',
    created_at      timestamptz     NOT NULL DEFAULT now(),
    updated_at      timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS
    'Application user profile. id mirrors auth.users.id exactly.';

-- Back-fill the owner FK now that users table exists
ALTER TABLE public.workspaces
    ADD CONSTRAINT workspaces_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ── Automatic profile creation on sign-up ─────────────────────────────────────
-- This trigger fires after Supabase Auth creates the auth.users row.
-- It creates the workspace first, then the user profile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_workspace_id uuid;
BEGIN
    -- Create a personal workspace for the new user
    INSERT INTO public.workspaces (name)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'workspace_name', 'My Workspace'))
    RETURNING id INTO new_workspace_id;

    -- Create the user profile row
    INSERT INTO public.users (id, email, name, initials, workspace_id, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 2)),
        new_workspace_id,
        'admin'
    );

    -- Set the workspace owner
    UPDATE public.workspaces
    SET owner_id = NEW.id
    WHERE id = new_workspace_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ── updated_at automation ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER workspaces_set_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
