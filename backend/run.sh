#!/usr/bin/env bash
# Start the Pipeline Studio API server.
# The frontend (localhost:3000) talks to this on localhost:8000.
# If this server is NOT running, the frontend silently falls back to
# localStorage and Deploy fails with "Failed to fetch".
set -euo pipefail
cd "$(dirname "$0")"
exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
