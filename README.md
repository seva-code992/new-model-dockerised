# Project Overview: Gene Search App

## Tech Stack
- Frontend: React / Vite (`frontend/`)
- Backend: FastAPI + SentenceTransformers (`backend/`)
- Package Manager: `uv` (system-wide inside Docker)
- Orchestration: Docker Compose

## Key Architecture Details
- Data Persistence: Local `./db` mapped to `/app/db`
- Embeddings: Local `./db/embeddings` mapped to `/app/embeddings:ro`
- Entry Point: `backend/query.py` running via `uvicorn` on port 8000
- Frontend API: Communicates via `VITE_API_URL=http://localhost:8000`

## Container Commands
- Start: `docker compose up --build`