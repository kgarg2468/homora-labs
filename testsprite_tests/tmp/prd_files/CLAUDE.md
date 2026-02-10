# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Homora

Homora is a local-first real estate intelligence assistant. Users upload due diligence documents (leases, appraisals, surveys, etc.), and the system answers questions using **only** the ingested documents with strict citation requirements. It never hallucinates — every claim must reference a document name, page, and section.

## Development Commands

### Backend (FastAPI + Python 3.11+)

```bash
# Activate virtualenv
source backend/.venv/bin/activate

# Install dependencies
pip install -e ".[dev]"    # from backend/

# Run dev server (port 8000)
python -m uvicorn app.main:app --reload    # from backend/

# Run migrations
alembic upgrade head    # from backend/

# Create new migration
alembic revision --autogenerate -m "description"    # from backend/

# Tests
pytest    # from backend/
pytest tests/test_file.py::test_name    # single test
pytest --cov=app    # with coverage

# Lint
black app/ --check && ruff app/    # from backend/
```

### Frontend (Next.js 14 + TypeScript)

```bash
# Install dependencies
npm install    # from frontend/

# Run dev server (port 3000)
npm run dev    # from frontend/

# Build
npm run build    # from frontend/

# Lint
npm run lint    # from frontend/
```

### Database (PostgreSQL 16 + pgvector + pg_trgm)

Default connection: `postgresql://homora:homoradev@localhost:5432/homora`

Requires extensions: `vector` (for embeddings), `pg_trgm` (for keyword search).

### Environment

The `.env` file lives at the project root. Required variables: `OPENAI_API_KEY`, `SECRET_KEY`. Optional: `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`. Settings are loaded by `backend/app/config.py` via pydantic-settings.

## Architecture

### Stack

- **Backend**: FastAPI (async), SQLAlchemy 2.0 (async), LangChain, Alembic
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query, Zustand
- **Database**: PostgreSQL 16, pgvector (3072-dim embeddings), pg_trgm (full-text)
- **LLM**: Multi-provider via factory pattern (OpenAI, Anthropic, Ollama)

### Backend Structure (`backend/app/`)

- **`main.py`** — FastAPI app with CORS (localhost:3000/3001) and 6 routers
- **`config.py`** — `Settings` class via pydantic-settings, loaded from `.env` with `@lru_cache`
- **`database.py`** — Async (asyncpg) and sync (psycopg2) SQLAlchemy engines
- **`models/`** — SQLAlchemy models: Project, Document, Chunk, Conversation, Message, DocumentTag, ReportTemplate, Settings
- **`schemas/`** — Pydantic request/response schemas
- **`routers/`** — API endpoints: projects, documents, chat, search, reports, settings
- **`services/`** — Business logic layer:
  - **`ingestion/`** — Document processing pipeline: extract (PDF/DOCX/XLSX/image) → chunk (~800 tokens, 150 overlap) → categorize → embed → store
  - **`llm/`** — Provider factory: `BaseLLMProvider` → `OpenAIProvider`, `AnthropicProvider`, `OllamaProvider`
  - **`retrieval.py`** — Hybrid search: vector similarity (pgvector cosine) + keyword (pg_trgm), merged via Reciprocal Rank Fusion (70% vector, 30% keyword)
  - **`embeddings.py`** — OpenAI text-embedding-3-large (3072 dimensions)
  - **`reports.py`** — PDF generation via WeasyPrint from markdown
  - **`export.py`** — Project export/import as ZIP archives
- **`prompts/system.py`** — LLM system prompts with role modes (plain vs analytical)
- **`workers/`** — Background task processing

### Frontend Structure (`frontend/src/`)

- **`app/`** — Next.js App Router pages: `/` (project list), `/projects/new` (wizard), `/projects/[id]` (chat), `/projects/[id]/compare`, `/search`, `/settings`
- **`components/`** — Organized by feature: `chat/`, `documents/`, `wizard/`, `projects/`, `reports/`, `search/`, `settings/`, `landing/`, `ui/`
- **`lib/api.ts`** — Centralized API client (all backend fetch calls)
- **`lib/types.ts`** — TypeScript type definitions
- **`hooks/`** — Custom hooks for keyboard shortcuts, notifications, theme

### Key Data Flow

**Document ingestion**: Upload → `documents` router → FastAPI BackgroundTasks runs `IngestionPipeline` → extractors parse file → chunker splits text → categorizer auto-detects type → embeddings service generates vectors → chunks stored with embeddings in DB

**Chat/RAG query**: User question → `chat` router → `hybrid_search` retrieves relevant chunks → LLM provider streams response via SSE → citations extracted → follow-up questions generated → message saved with citations and debug_info (JSONB)

### Key Design Decisions

- **Embeddings**: 3072 dimensions (text-embedding-3-large) with IVFFlat index
- **Retrieval**: Top-40 chunks, hybrid search with RRF fusion
- **Streaming**: Server-Sent Events (SSE) via `sse-starlette`
- **Responses follow a structure**: Answer → Evidence → Risk Flags → Unknowns → Next Steps
- **Role modes**: Plain (non-technical language) vs Analytical (precise terminology)
- **LLM config**: Can be stored in DB settings table; falls back to env vars
- **Document storage**: Files stored in `backend/documents/` directory
- **Migrations**: Alembic with async support via `backend/alembic/env.py`

### Code Style

- Backend: `black` (line-length 100), `ruff` (line-length 100), target Python 3.11
- Frontend: ESLint via `next lint`, Tailwind CSS for styling
- Backend uses async/await throughout (async SQLAlchemy sessions, async route handlers)
