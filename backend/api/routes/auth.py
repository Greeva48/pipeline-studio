"""
Auth routes — thin wrappers that return profile data for the logged-in user.
Supabase Auth (sign-in / sign-up / OAuth) is handled directly by the frontend
using the Supabase JS client. The backend only needs to:
  - return the current user profile (GET /api/auth/me)
"""

from fastapi import APIRouter, Depends

from api.deps import CurrentUser, get_current_user
from infrastructure.supabase.client import get_service_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
async def me(user: CurrentUser = Depends(get_current_user)):
    svc = get_service_client()
    row = svc.table("users").select(
        "id, email, name, initials, workspace_id, role, created_at"
    ).eq("id", user.id).single().execute()

    ws = svc.table("workspaces").select(
        "id, name"
    ).eq("id", user.workspace_id).single().execute()

    return {
        "user": row.data,
        "workspace": ws.data,
    }
