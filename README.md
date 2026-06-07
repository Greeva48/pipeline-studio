# Pipeline Studio

Visual, node-based editor for composing AI pipelines on a typed DAG runtime.
Built as a full-stack application: a React + ReactFlow canvas frontend backed by
a Python / FastAPI service and Supabase (Auth + PostgreSQL).

> Originated from the VectorShift Frontend Technical Assessment (node abstraction,
> unified styling, dynamic Text node, and FastAPI DAG-validation integration),
> then extended into a complete product with auth, persistence, validation history,
> and deployments.

---

## Overview

Pipeline Studio lets a user drag nodes onto a canvas, wire them together with
handles, and validate the resulting graph. The backend computes node/edge counts
and checks whether the graph is a **Directed Acyclic Graph (DAG)** using Kahn's
topological sort. Pipelines, canvases, validation runs, deployments, and activity
are persisted per workspace in Supabase.

---

## Features

- **Node abstraction** — a single `BaseNode` + a central node registry; new nodes
  are added in one place (`nodes/index.js`).
- **9 node types** with drag-and-drop from the toolbar (see [Node Types](#node-types)).
- **Dynamic Text node** — the textarea auto-grows in height, and `{{variable}}`
  tokens automatically create matching input handles on the node.
- **DAG validation** — server-side cycle detection (Kahn's algorithm) with a live
  status bar showing node count, edge count, and DAG status.
- **Validation history** — every run is persisted and shown on the Validation page.
- **Pipelines CRUD** — create, rename, edit, delete; read-only starter templates
  are seeded per workspace.
- **Canvas persistence** — autosave (debounced) plus manual save (Cmd/Ctrl+S),
  undo/redo history, and a command palette (Cmd/Ctrl+K).
- **Deployments** — deploy a pipeline (auto-incrementing semver), archive
  deployments, and view them per environment.
- **Authentication** — email/password plus Google and GitHub OAuth via Supabase.
- **Dashboard & activity feed** — workspace metrics and a recent-activity log.
- **Settings** — workspace settings (autosave, snap-to-grid, default environment,
  active models) persisted to the backend.

---

## Architecture

**Frontend**

- **React 18** — UI framework (Create React App)
- **ReactFlow** — canvas / node-graph engine
- **Zustand** — pipeline + canvas state, undo/redo history
- **Framer Motion** — page and UI transitions
- **Supabase JS** — authentication (session handled client-side)
- **React Router** — routing

**Backend**

- **FastAPI** — REST API
- **Python** — graph analysis (DAG validation via Kahn's topological sort)
- **PyJWT** — verifies Supabase-issued JWTs (HS256 with JWKS/ES256 fallback)
- **Supabase (PostgreSQL)** — data store, accessed via the Supabase Python client

**Request flow**

```
React UI → lib/api.js (Bearer JWT) → FastAPI route → get_current_user (verify JWT)
        → Supabase service client → PostgreSQL
```

The Supabase JS client handles sign-in and issues a JWT; that token is sent on
every API call, verified by FastAPI, and used to scope all data to the user's
workspace.

---

## Node Types

| Type (internal)  | Label           | Purpose |
|------------------|-----------------|---------|
| `customInput`    | Input           | Pipeline entry point (named, typed input) |
| `customOutput`   | Output          | Pipeline exit point (named, typed output) |
| `llm`            | LLM             | Language-model call (model, temperature, max tokens) |
| `promptTemplate` | Prompt Template | System/user prompt with `{{variable}}` input handles |
| `text`           | Text            | Static/template text; auto-resizing, `{{variable}}` handles |
| `vectorSearch`   | Vector Search   | Retrieve from a vector collection (top-k, metric) |
| `router`         | Router          | Classify input and route to one of N labeled outputs |
| `memory`         | Memory          | Conversation/state memory store |
| `parser`         | Parser          | Extract structured fields from text |

Nodes are registered in [`frontend/src/nodes/index.js`](frontend/src/nodes/index.js)
and rendered through the shared [`BaseNode`](frontend/src/nodes/BaseNode.js).

---

## Installation

Requirements: **Node.js 18+** and **Python 3.11+**.

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable             | Description                              | Default                 |
|----------------------|------------------------------------------|-------------------------|
| `REACT_APP_API_URL`  | Base URL of the FastAPI backend          | `http://localhost:8000` |

> The Supabase URL and anon key used by the browser are configured in
> `frontend/src/lib/supabase.js` — set these for your project before deploying.

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and fill in your values:

| Variable                      | Description                                              |
|-------------------------------|----------------------------------------------------------|
| `SUPABASE_URL`                | Your Supabase project URL                                |
| `SUPABASE_ANON_KEY`           | Public anon key (RLS-scoped)                             |
| `SUPABASE_SERVICE_ROLE_KEY`   | Service-role key (bypasses RLS — keep secret)           |
| `JWT_SECRET`                  | JWT secret for HS256 token verification                  |
| `DEBUG`                       | `true`/`false` (default `false`)                         |
| `CORS_ORIGINS`                | Optional JSON array of allowed origins for production    |

**Never commit `.env`.** It is gitignored. `.env.example` contains placeholders only.

---

## Running Locally

Start the backend **first** — if it is not running, the frontend silently falls
back to `localStorage` and deploys will fail.

### Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
# or: bash run.sh
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm start
```

App: http://localhost:3000

---

## Validation Flow

1. The user builds a pipeline and clicks **Validate** in the Studio.
2. The frontend sends the current `nodes` and `edges` to the backend:
   - `POST /api/projects/{id}/validate` (persists a validation run), or
   - `POST /pipelines/parse` (stateless fallback when there is no pipeline id).
3. The backend ([`services/graph_service.py`](backend/services/graph_service.py))
   runs **Kahn's topological sort**:
   - Computes in-degrees, seeds a queue with zero-in-degree nodes, and processes.
   - If every node is processed → no cycle → `is_dag = true`.
   - Edges referencing unknown nodes are treated as invalid (`is_dag = false`).
4. The response `{ num_nodes, num_edges, is_dag }` is shown in the bottom status
   bar (VALID DAG / CYCLE DETECTED) and the run is recorded in Validation history.

---

## Deployment Flow

1. The user clicks **Deploy** in the Studio (read-only templates cannot be deployed).
2. `POST /api/deployments` verifies ownership, auto-increments the semver version
   (`v1.0.0` → `v1.0.1`), records the deployment, sets the pipeline status to
   `live`, and logs an activity entry.
3. Deployments appear on the Deployments page and can be **archived**
   (`PUT /api/deployments/{id}/archive`).

### Production deployment

- **Frontend (e.g. Vercel):** set `REACT_APP_API_URL` to the deployed backend URL,
  configure an SPA rewrite so client-side routes resolve, and run `npm run build`.
- **Backend (any ASGI host):** install `requirements.txt`, set the backend env
  vars, add the production frontend origin to CORS, and run
  `uvicorn main:app` behind your process manager.
- **Supabase:** run the migrations in `backend/migrations/`, and add the
  production `/auth/callback` URL to the Auth redirect allow-list.

---

## Folder Structure

```
pipeline-studio/
├── README.md
├── .gitignore
├── frontend/
│   ├── public/                 # index.html, manifest.json, robots.txt
│   └── src/
│       ├── App.js              # routes
│       ├── store.js            # Zustand canvas state + persistence
│       ├── submit.js           # validation status bar
│       ├── toolbar.js / ui.js  # studio toolbar + ReactFlow canvas
│       ├── nodes/              # BaseNode + 9 node types + registry
│       ├── components/         # shared UI (inspector, palette, etc.)
│       ├── context/            # AuthContext
│       ├── layouts/            # AppShell
│       ├── lib/                # api.js, db.js, auth.js, supabase.js
│       └── pages/              # Landing, Dashboard, Studio, Projects,
│                               #   Validation, Deployments, Settings, Blocks, auth/
└── backend/
    ├── main.py                 # FastAPI app + middleware + router wiring
    ├── requirements.txt
    ├── run.sh
    ├── .env.example
    ├── api/
    │   ├── deps.py             # JWT verification + current-user dependency
    │   ├── utils.py
    │   └── routes/             # health, pipelines, auth, projects, canvas,
    │                           #   validation, deployments, activity, settings
    ├── core/config.py          # settings (env-driven)
    ├── schemas/pipeline.py     # request/response models
    ├── services/graph_service.py  # DAG analysis (Kahn's algorithm)
    ├── infrastructure/supabase/   # Supabase client factory
    ├── models/                 # domain dataclasses / repository interfaces
    └── migrations/             # SQL schema migrations (V001–V011)
```

---

## Future Improvements

- Auto-resize the Text node **width** (height already grows with content).
- Real pipeline execution / runtime (currently structural validation only).
- Live latency metrics for deployments (placeholder today).
- Export validation report (button present, disabled).
- Team member invites and role management (single-tenant today).
- Billing / plan upgrades (Stripe).
- API-key management UI.
- Wire the domain models / repository interfaces in `backend/models/` into the
  routes (currently the routes call the Supabase client directly).
