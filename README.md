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



## For the embeddings database: 
1) Run fileprep.py (db/embeddings)
2) Run embeddings.sql 

'''
bash 
duckdb Database -f db/embeddings/embeddings.sql
'''
or 

''' 
duckdb Database 
read db/embeddings/embeddings.sql
'''

3) Run <species>_embeddings.py to compute and store the embeddings locally. 


## For the fts feature: 
1) cd db/embeddings
2) mv *.tsv *gff3 db/fts_database/
3) run fts.sql 

'''
bash 
duckdb fts_database -f db/fts_database/fts.sql
'''
or 

''' 
duckdb Database 
read db/fts_database/fts.sql
'''