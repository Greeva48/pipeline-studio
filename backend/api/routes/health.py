from fastapi import APIRouter

from infrastructure.supabase.client import test_connection

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/database")
async def database_health() -> dict[str, str]:
    """
    Tests connectivity to Supabase by pinging the Auth health endpoint.

    Returns:
      200 {"database": "connected"}          — Supabase is reachable
      200 {"database": "not_configured"}     — credentials not set in .env
      200 {"database": "failed", "error": …} — reachable but returning errors,
                                               or network failure
    """
    return await test_connection()
