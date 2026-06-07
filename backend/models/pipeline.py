"""
Domain models and repository interfaces.

These are abstract contracts — no database imports here.
Concrete implementations live in infrastructure/supabase/ (when that phase lands)
and are injected via FastAPI's Depends() system.

Each model mirrors the corresponding database table from the migration files.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal


# ── Literal types (match DB enums) ───────────────────────────────────────────

WorkspaceRole        = Literal["admin", "editor", "viewer"]
PipelineStatus       = Literal["draft", "live", "archived"]
DeploymentEnv        = Literal["production", "staging"]
DeploymentStatus     = Literal["live", "archived", "failed"]

ActivityType = Literal[
    "created", "renamed", "deleted", "archived",
    "validated", "validation_failed",
    "deployed", "deploy_archived",
]


# ── Domain models ─────────────────────────────────────────────────────────────

@dataclass
class Workspace:
    id: str
    name: str
    owner_id: str | None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class User:
    id: str                              # mirrors auth.users.id
    email: str
    name: str
    initials: str
    workspace_id: str
    role: WorkspaceRole = "admin"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class WorkspaceSettings:
    workspace_id: str
    workspace_name: str                  = "Pipeline Studio"
    default_pipeline_name: str           = "workflow.graph"
    auto_save: bool                      = True
    snap_to_grid: bool                   = True
    default_environment: str             = "Production"
    auto_deploy_on_validate: bool        = False
    deployment_region: str               = "us-east-1"
    active_models: list[str]             = field(default_factory=lambda: ["gpt-4o", "claude-sonnet-4-6"])
    updated_at: datetime                 = field(default_factory=datetime.utcnow)


@dataclass
class Pipeline:
    id: str
    workspace_id: str
    owner_id: str | None
    name: str
    description: str                     = ""
    accent_color: str                    = "#A855F7"
    status: PipelineStatus               = "draft"
    node_count: int                      = 0
    edge_count: int                      = 0
    created_at: datetime                 = field(default_factory=datetime.utcnow)
    updated_at: datetime                 = field(default_factory=datetime.utcnow)


@dataclass
class PipelineCanvas:
    pipeline_id: str
    nodes: list[dict[str, Any]]          = field(default_factory=list)
    edges: list[dict[str, Any]]          = field(default_factory=list)
    updated_at: datetime                 = field(default_factory=datetime.utcnow)


@dataclass(frozen=True)
class Node:
    id: str
    pipeline_id: str
    type: str
    position_x: float
    position_y: float
    data: dict[str, Any]                 = field(default_factory=dict)


@dataclass(frozen=True)
class Edge:
    id: str
    pipeline_id: str
    source: str
    target: str
    source_handle: str | None            = None
    target_handle: str | None            = None
    edge_type: str | None                = None


@dataclass
class ValidationRun:
    id: str
    workspace_id: str
    pipeline_id: str | None
    pipeline_name: str
    ran_by: str | None
    is_dag: bool
    node_count: int
    edge_count: int
    error: str | None                    = None
    created_at: datetime                 = field(default_factory=datetime.utcnow)


@dataclass
class Deployment:
    id: str
    pipeline_id: str
    workspace_id: str
    deployed_by: str | None
    version: str
    environment: DeploymentEnv
    status: DeploymentStatus             = "live"
    latency_ms: int | None               = None
    deployed_at: datetime                = field(default_factory=datetime.utcnow)
    archived_at: datetime | None         = None


@dataclass
class ActivityLogEntry:
    id: str
    workspace_id: str
    pipeline_id: str | None
    user_id: str | None
    pipeline_name: str
    type: ActivityType
    detail: str                          = ""
    dot_color: str                       = "#6B7280"
    created_at: datetime                 = field(default_factory=datetime.utcnow)


# ── Repository interfaces ─────────────────────────────────────────────────────
# Implement these in infrastructure/supabase/ when Supabase integration lands.
# Inject via FastAPI Depends(): route → service → repository.

class WorkspaceRepository(ABC):
    @abstractmethod
    async def get(self, workspace_id: str) -> Workspace | None: ...

    @abstractmethod
    async def get_settings(self, workspace_id: str) -> WorkspaceSettings: ...

    @abstractmethod
    async def save_settings(self, workspace_id: str, patch: dict[str, Any]) -> WorkspaceSettings: ...


class UserRepository(ABC):
    @abstractmethod
    async def get(self, user_id: str) -> User | None: ...

    @abstractmethod
    async def list_workspace_members(self, workspace_id: str) -> list[User]: ...

    @abstractmethod
    async def update_role(self, user_id: str, role: WorkspaceRole) -> User: ...


class PipelineRepository(ABC):
    @abstractmethod
    async def list(self, workspace_id: str) -> list[Pipeline]: ...

    @abstractmethod
    async def get(self, pipeline_id: str) -> Pipeline | None: ...

    @abstractmethod
    async def create(self, workspace_id: str, owner_id: str, name: str, **kwargs: Any) -> Pipeline: ...

    @abstractmethod
    async def update(self, pipeline_id: str, patch: dict[str, Any]) -> Pipeline: ...

    @abstractmethod
    async def delete(self, pipeline_id: str) -> None: ...


class CanvasRepository(ABC):
    @abstractmethod
    async def load(self, pipeline_id: str) -> PipelineCanvas: ...

    @abstractmethod
    async def save(self, pipeline_id: str, nodes: list[dict], edges: list[dict]) -> PipelineCanvas: ...


class ValidationRunRepository(ABC):
    @abstractmethod
    async def add(self, run: ValidationRun) -> ValidationRun: ...

    @abstractmethod
    async def list_for_pipeline(self, pipeline_id: str) -> list[ValidationRun]: ...

    @abstractmethod
    async def list_workspace(self, workspace_id: str, limit: int = 50) -> list[ValidationRun]: ...


class DeploymentRepository(ABC):
    @abstractmethod
    async def list_workspace(self, workspace_id: str) -> list[Deployment]: ...

    @abstractmethod
    async def list_for_pipeline(self, pipeline_id: str) -> list[Deployment]: ...

    @abstractmethod
    async def create(self, deployment: Deployment) -> Deployment: ...

    @abstractmethod
    async def archive(self, deployment_id: str) -> Deployment: ...


class ActivityLogRepository(ABC):
    @abstractmethod
    async def log(self, entry: ActivityLogEntry) -> None: ...

    @abstractmethod
    async def list_workspace(self, workspace_id: str, limit: int = 100) -> list[ActivityLogEntry]: ...
