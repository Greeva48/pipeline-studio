"""
FastAPI dependency: extract and verify the Supabase JWT from the Authorization header.
Returns a CurrentUser with id, workspace_id, role, and email.

Supports both HS256 (old Supabase projects) and ES256/RS256 (new Supabase projects that
use asymmetric JWKS signing). Tries JWKS first, falls back to HS256 secret.

Self-healing: if the public.users profile doesn't exist (user created before migration,
or trigger race condition), the dependency creates workspace + profile on first call.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
import jwt
from jwt import PyJWKClient

from core.config import settings
from infrastructure.supabase.client import get_service_client

bearer = HTTPBearer(auto_error=False)

# Cached JWKS client — initialized on first request, reused thereafter
_jwks_client: PyJWKClient | None = None

def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def _decode_token(token: str) -> dict:
    """
    Decode and verify a Supabase JWT.
    Tries JWKS (ES256/RS256) first; falls back to HS256 secret for older projects.
    """
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "HS256")

    if alg in ("ES256", "RS256"):
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            options={"verify_aud": False},
        )

    # Fallback: HS256 with the project JWT secret
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=["HS256"],
        options={"verify_aud": False},
    )


class CurrentUser(BaseModel):
    id: str
    email: str
    workspace_id: str
    role: str


def _seed_demo_pipelines(svc, workspace_id: str) -> None:
    """
    Seed three read-only starter templates into a workspace.

    Templates are marked by ``owner_id = NULL`` (no user owns them), which the
    API uses to keep them read-only while user-created pipelines stay editable.
    Idempotent: does nothing if the workspace already has starter templates.
    """
    # Idempotency — skip if this workspace already has system templates
    existing = (
        svc.table("pipelines")
        .select("id", count="exact")
        .eq("workspace_id", workspace_id)
        .is_("owner_id", "null")
        .execute()
    )
    if existing.count and existing.count > 0:
        return

    demos = [
        {
            "name": "Customer Support Bot",
            "description": "[Demo] AI agent that handles customer questions with a friendly, structured prompt.",
            "accent_color": "#A855F7",
            "nodes": [
                {"id": "input-1",  "type": "customInput",    "position": {"x": 60,  "y": 180},
                 "data": {"id": "input-1",  "nodeType": "customInput",    "inputName": "user_message", "inputType": "text"}},
                {"id": "pt-1",     "type": "promptTemplate", "position": {"x": 320, "y": 100},
                 "data": {"id": "pt-1",     "nodeType": "promptTemplate",
                          "systemPrompt": "You are a helpful and friendly customer support agent. Be concise and polite.",
                          "userPrompt": "{{user_message}}"}},
                {"id": "llm-1",   "type": "llm",            "position": {"x": 620, "y": 180},
                 "data": {"id": "llm-1",   "nodeType": "llm", "model": "gpt-4o", "temperature": 0.7, "maxTokens": 1024}},
                {"id": "output-1","type": "customOutput",   "position": {"x": 900, "y": 180},
                 "data": {"id": "output-1","nodeType": "customOutput", "outputName": "response", "outputType": "text"}},
            ],
            "edges": [
                {"id": "e1", "source": "input-1", "target": "pt-1",    "sourceHandle": "input-1-value",  "targetHandle": "pt-1-user_message", "type": "smoothstep"},
                {"id": "e2", "source": "pt-1",    "target": "llm-1",   "sourceHandle": "pt-1-prompt",    "targetHandle": "llm-1-prompt",      "type": "smoothstep"},
                {"id": "e3", "source": "llm-1",   "target": "output-1","sourceHandle": "llm-1-response", "targetHandle": "output-1-value",    "type": "smoothstep"},
            ],
        },
        {
            "name": "Document Search (RAG)",
            "description": "[Demo] Retrieval-Augmented Generation: searches a vector store then synthesizes an answer.",
            "accent_color": "#FACC15",
            "nodes": [
                {"id": "input-2",  "type": "customInput",    "position": {"x": 60,  "y": 200},
                 "data": {"id": "input-2",  "nodeType": "customInput",    "inputName": "query", "inputType": "text"}},
                {"id": "vs-1",     "type": "vectorSearch",   "position": {"x": 320, "y": 80},
                 "data": {"id": "vs-1",     "nodeType": "vectorSearch",   "collection": "documents", "topK": 5, "metric": "cosine"}},
                {"id": "pt-2",     "type": "promptTemplate", "position": {"x": 320, "y": 320},
                 "data": {"id": "pt-2",     "nodeType": "promptTemplate",
                          "systemPrompt": "Answer the user's question using only the provided context.",
                          "userPrompt": "Context: {{context}}\n\nQuestion: {{query}}"}},
                {"id": "llm-2",   "type": "llm",            "position": {"x": 620, "y": 200},
                 "data": {"id": "llm-2",   "nodeType": "llm", "model": "gpt-4o", "temperature": 0.3, "maxTokens": 2048}},
                {"id": "output-2","type": "customOutput",   "position": {"x": 900, "y": 200},
                 "data": {"id": "output-2","nodeType": "customOutput", "outputName": "answer", "outputType": "text"}},
            ],
            "edges": [
                {"id": "e1", "source": "input-2", "target": "vs-1",    "sourceHandle": "input-2-value",  "targetHandle": "vs-1-query",        "type": "smoothstep"},
                {"id": "e2", "source": "input-2", "target": "pt-2",    "sourceHandle": "input-2-value",  "targetHandle": "pt-2-query",        "type": "smoothstep"},
                {"id": "e3", "source": "vs-1",    "target": "pt-2",    "sourceHandle": "vs-1-context",   "targetHandle": "pt-2-context",      "type": "smoothstep"},
                {"id": "e4", "source": "pt-2",    "target": "llm-2",   "sourceHandle": "pt-2-prompt",    "targetHandle": "llm-2-prompt",      "type": "smoothstep"},
                {"id": "e5", "source": "llm-2",   "target": "output-2","sourceHandle": "llm-2-response", "targetHandle": "output-2-value",    "type": "smoothstep"},
            ],
        },
        {
            "name": "Email Classification",
            "description": "[Demo] Classifies incoming emails by category and priority using an LLM + Parser.",
            "accent_color": "#FB7185",
            "nodes": [
                {"id": "input-3",  "type": "customInput",    "position": {"x": 60,  "y": 200},
                 "data": {"id": "input-3",  "nodeType": "customInput",    "inputName": "email_text", "inputType": "text"}},
                {"id": "pt-3",     "type": "promptTemplate", "position": {"x": 300, "y": 140},
                 "data": {"id": "pt-3",     "nodeType": "promptTemplate",
                          "systemPrompt": "You are an email classification assistant. Extract: category (billing/support/sales/other), priority (high/medium/low), and a one-sentence summary.",
                          "userPrompt": "Classify this email:\n\n{{email_text}}"}},
                {"id": "llm-3",   "type": "llm",            "position": {"x": 580, "y": 200},
                 "data": {"id": "llm-3",   "nodeType": "llm", "model": "gpt-4o", "temperature": 0.1, "maxTokens": 512}},
                {"id": "parser-1","type": "parser",         "position": {"x": 840, "y": 140},
                 "data": {"id": "parser-1","nodeType": "parser", "fieldText": "category\npriority\nsummary"}},
                {"id": "output-3","type": "customOutput",   "position": {"x": 1100,"y": 80},
                 "data": {"id": "output-3","nodeType": "customOutput", "outputName": "category", "outputType": "text"}},
                {"id": "output-4","type": "customOutput",   "position": {"x": 1100,"y": 200},
                 "data": {"id": "output-4","nodeType": "customOutput", "outputName": "priority", "outputType": "text"}},
                {"id": "output-5","type": "customOutput",   "position": {"x": 1100,"y": 320},
                 "data": {"id": "output-5","nodeType": "customOutput", "outputName": "summary", "outputType": "text"}},
            ],
            "edges": [
                {"id": "e1", "source": "input-3",  "target": "pt-3",     "sourceHandle": "input-3-value",   "targetHandle": "pt-3-email_text",   "type": "smoothstep"},
                {"id": "e2", "source": "pt-3",     "target": "llm-3",    "sourceHandle": "pt-3-prompt",     "targetHandle": "llm-3-prompt",      "type": "smoothstep"},
                {"id": "e3", "source": "llm-3",    "target": "parser-1", "sourceHandle": "llm-3-response",  "targetHandle": "parser-1-raw",      "type": "smoothstep"},
                {"id": "e4", "source": "parser-1", "target": "output-3", "sourceHandle": "parser-1-category","targetHandle": "output-3-value",   "type": "smoothstep"},
                {"id": "e5", "source": "parser-1", "target": "output-4", "sourceHandle": "parser-1-priority","targetHandle": "output-4-value",   "type": "smoothstep"},
                {"id": "e6", "source": "parser-1", "target": "output-5", "sourceHandle": "parser-1-summary", "targetHandle": "output-5-value",   "type": "smoothstep"},
            ],
        },
    ]

    for demo in demos:
        try:
            pipeline_row = svc.table("pipelines").insert({
                "workspace_id": workspace_id,
                "owner_id":     None,  # NULL owner ⇒ read-only system template
                "name":         demo["name"],
                "description":  demo["description"],
                "accent_color": demo["accent_color"],
                "status":       "draft",
                "node_count":   len(demo["nodes"]),
                "edge_count":   len(demo["edges"]),
            }).execute()

            pipeline_id = pipeline_row.data[0]["id"]

            svc.table("pipeline_canvas").upsert({
                "pipeline_id": pipeline_id,
                "nodes":       demo["nodes"],
                "edges":       demo["edges"],
            }).execute()

            # Seed normalized nodes/edges tables
            try:
                svc.rpc("sync_canvas_to_normalized", {
                    "p_pipeline_id": pipeline_id,
                    "p_nodes":       demo["nodes"],
                    "p_edges":       demo["edges"],
                }).execute()
            except Exception:
                pass
        except Exception:
            pass  # Never fail login due to demo seeding


def _create_profile(svc, user_id: str, user_email: str) -> dict:
    name = user_email.split("@")[0] if user_email else "User"
    initials = name[:2].upper()

    ws = svc.table("workspaces").insert({"name": "My Workspace"}).execute()
    workspace_id = ws.data[0]["id"]

    user_row = svc.table("users").insert({
        "id":           user_id,
        "email":        user_email,
        "name":         name,
        "initials":     initials,
        "workspace_id": workspace_id,
        "role":         "admin",
    }).execute()

    svc.table("workspaces").update({"owner_id": user_id}).eq("id", workspace_id).execute()
    svc.table("workspace_settings").upsert({"workspace_id": workspace_id}).execute()

    # Seed read-only starter templates for new users
    _seed_demo_pipelines(svc, workspace_id)

    return user_row.data[0]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = credentials.credentials
    try:
        payload = _decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub")

    user_email = payload.get("email", "")

    svc = get_service_client()

    # Fetch existing profile
    data = None
    try:
        row = svc.table("users").select(
            "id, email, workspace_id, role"
        ).eq("id", user_id).single().execute()
        data = row.data
    except Exception:
        pass

    # Self-heal: create profile if missing
    if not data:
        try:
            data = _create_profile(svc, user_id, user_email)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"User profile not found and could not be created: {exc}",
            )

    if not data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User profile not found")

    # Ensure the workspace has its starter templates. The on_auth_user_created
    # DB trigger creates the profile + workspace but not the demo pipelines, so
    # _create_profile (which seeds) is skipped for trigger-created users. Seed
    # here too — idempotent (skips if templates already exist), so no duplicates
    # and existing users are unaffected.
    try:
        _seed_demo_pipelines(svc, data["workspace_id"])
    except Exception:
        pass

    return CurrentUser(
        id=data["id"],
        email=data["email"],
        workspace_id=data["workspace_id"],
        role=data["role"],
    )
