"""
Supabase client factory.

Two clients:
  - anon_client   → uses SUPABASE_ANON_KEY, subject to Row Level Security.
                    Used for operations that run in the context of a signed-in user.
  - service_client → uses SUPABASE_SERVICE_ROLE_KEY, bypasses RLS.
                    Used for server-side operations (activity logging, triggers,
                    admin tasks). Never expose this key to the browser.

Both clients are singletons, created lazily on first use and re-used across
requests. FastAPI's dependency system (Depends) will call get_anon_client()
or get_service_client() per-route when auth is wired up.
"""

from __future__ import annotations

import httpx
from supabase import Client, create_client

from core.config import settings

# ── Singletons ────────────────────────────────────────────────────────────────

_anon_client: Client | None = None
_service_client: Client | None = None


def _require_config() -> None:
    if not settings.supabase_url:
        raise RuntimeError(
            "SUPABASE_URL is not set. "
            "Copy backend/.env.example to backend/.env and fill in your Supabase credentials."
        )
    if not settings.supabase_anon_key:
        raise RuntimeError(
            "SUPABASE_ANON_KEY is not set. "
            "Copy backend/.env.example to backend/.env and fill in your Supabase credentials."
        )


def get_anon_client() -> Client:
    """
    Returns the shared anon-key Supabase client.
    Respects Row Level Security — use for user-scoped operations.
    Raises RuntimeError if credentials are not configured.
    """
    global _anon_client
    if _anon_client is None:
        _require_config()
        _anon_client = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _anon_client


def get_service_client() -> Client:
    """
    Returns the shared service-role Supabase client.
    Bypasses RLS — use only for server-side operations.
    Raises RuntimeError if service role key is not configured.
    """
    global _service_client
    if _service_client is None:
        _require_config()
        if not settings.supabase_service_role_key:
            raise RuntimeError(
                "SUPABASE_SERVICE_ROLE_KEY is not set. "
                "Required for server-side operations that bypass RLS."
            )
        _service_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _service_client


# ── Connection test ───────────────────────────────────────────────────────────

async def test_connection() -> dict[str, str]:
    """
    Pings the Supabase Auth health endpoint asynchronously.

    Uses the Auth health endpoint (/auth/v1/health) rather than a table query
    so the check works before any migrations have been run.

    Returns one of:
      {"database": "connected"}
      {"database": "not_configured"}
      {"database": "failed", "error": "<reason>"}
    """
    if not settings.supabase_url or not settings.supabase_anon_key:
        return {"database": "not_configured"}

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/health"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                url,
                headers={"apikey": settings.supabase_anon_key},
            )
            if resp.status_code < 500:
                return {"database": "connected"}
            return {
                "database": "failed",
                "error": f"Supabase returned HTTP {resp.status_code}",
            }
    except httpx.TimeoutException:
        return {"database": "failed", "error": "Connection timed out after 5s"}
    except httpx.ConnectError as exc:
        return {"database": "failed", "error": f"Cannot reach Supabase: {exc}"}
    except Exception as exc:  # noqa: BLE001
        return {"database": "failed", "error": str(exc)}
