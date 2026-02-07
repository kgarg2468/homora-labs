# Homora Labs - Project Progress

## Overview

Homora is a real estate intelligence assistant that provides citation-first, hallucination-free answers to due diligence questions using locally-ingested documents. Built with FastAPI (backend), Next.js 14 (frontend), and PostgreSQL + pgvector (database).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Query, Zustand |
| Backend | Python 3.11+, FastAPI, SQLAlchemy, LangChain |
| Database | PostgreSQL 16 + pgvector + pg_trgm |
| LLM | OpenAI, Anthropic (Claude), Ollama (local) — all fully implemented |
| Document Processing | PyMuPDF, python-docx, openpyxl, Vision OCR |

---

## Phase 1: Foundation - COMPLETE

- [x] PostgreSQL schema with Alembic migrations (8 tables)
- [x] FastAPI skeleton with health check and CORS
- [x] Next.js project with Tailwind CSS and dark mode
- [x] Environment configuration via pydantic-settings

## Phase 2: Core Backend - COMPLETE

- [x] Project CRUD endpoints (create, read, update, delete, export, import)
- [x] Document upload with background async ingestion
- [x] Text extraction for PDF, DOCX, XLSX, and images
- [x] OCR for scanned documents via Vision models
- [x] Auto-categorization (lease, appraisal, title, zoning, financial, survey, environmental)
- [x] Text chunking (~300 tokens, 75 token overlap)
- [x] Embedding generation (OpenAI text-embedding-3-small, 1536 dimensions)
- [x] Ingestion progress tracking (0-100%)
- [x] Document tagging support

## Phase 3: RAG Engine - COMPLETE

- [x] Hybrid retrieval combining vector similarity + keyword search
- [x] Reciprocal Rank Fusion scoring (70% vector, 30% keyword)
- [x] LLM provider abstraction with factory pattern
- [x] OpenAI provider fully implemented (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo)
- [x] Streaming chat endpoint via SSE
- [x] Citation parsing and storage in messages
- [x] Follow-up question generation
- [x] Conflict detection — handled via LLM system prompt; no standalone programmatic engine
- [x] Anthropic provider — fully implemented (AsyncAnthropic, streaming, multiple Claude models)
- [x] Ollama provider — fully implemented (httpx async client, streaming, dynamic model listing)

## Phase 4: Frontend Core - COMPLETE

- [x] Landing page with project cards, recent activity, keyboard shortcuts
- [x] Project creation wizard (4-step: details, upload, processing, complete)
- [x] Main chat interface with streaming responses
- [x] Citation display in messages
- [x] Follow-up question suggestions
- [x] Document list sidebar with status badges
- [x] Document viewer modal with page navigation
- [x] Drag-and-drop upload with progress indicators
- [x] Settings page (LLM provider, model, API keys, theme)
- [x] Global keyboard shortcuts (Cmd+K search, Cmd+N new project, Cmd+U upload, etc.)

## Phase 5: Advanced Features - COMPLETE

- [x] Session-based chat history with conversation management
- [x] Conversation archiving
- [x] Global search across documents and conversations
- [x] Diligence report generation (PDF via WeasyPrint)
- [x] Default report template with 7 sections
- [x] Custom report templates
- [x] Project export/import as ZIP archive
- [x] Document comparison view — document selector, side-by-side panels, sync scroll, PDF/image preview
- [x] Search results page — query input, type filtering, result cards with relevance scores

## Phase 6: Polish - COMPLETE

- [x] Settings UI for provider/model/API key selection
- [x] Theme toggle (light/dark/system via next-themes)
- [x] Error handling and retry logic
- [x] Loading states and skeleton UI
- [x] Toast notification infrastructure
- [x] Sound notifications — implemented via native Audio API in useNotifications hook; `/notification.mp3` asset missing from public/
- [x] Role modes — fully integrated (wizard radio selection, project cards badge, project page badge, API passes role_mode)
- [x] ThemeToggle hydration fix (consistent DOM structure, suppressHydrationWarning on html+body)

## Phase 7: Testing - MINIMAL

- [x] Pytest framework configured with async support
- [x] Basic tests for health check, root endpoint, list projects
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Frontend tests

---

## API Endpoints (25+)

### Projects (`/projects`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List projects with document counts |
| POST | `/projects` | Create new project |
| GET | `/projects/{id}` | Get project details |
| PATCH | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Delete project (cascades) |
| GET | `/projects/{id}/export` | Export project as ZIP |
| POST | `/import` | Import project from ZIP |

### Documents (`/projects/{id}/documents`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List documents (filter by category/status) |
| POST | `/` | Upload and start async ingestion |
| GET | `/{doc_id}` | Get document details |
| GET | `/{doc_id}/file` | Download original file |
| DELETE | `/{doc_id}` | Delete document |
| POST | `/{doc_id}/tags` | Add tag |
| DELETE | `/{doc_id}/tags/{tag_id}` | Remove tag |
| POST | `/{doc_id}/reprocess` | Re-run ingestion |

### Chat (`/projects/{id}/chat`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/conversations` | List conversations |
| GET | `/conversations/{id}` | Get conversation with messages |
| POST | `/conversations/{id}/archive` | Archive conversation |
| DELETE | `/conversations/{id}` | Delete conversation |
| POST | `/chat` | Send message (non-streaming) |
| POST | `/chat/stream` | Send message (SSE streaming) |

### Search (`/search`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Global search with filters and pagination |

### Reports (`/reports`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates` | List report templates |
| POST | `/templates` | Create custom template |
| DELETE | `/templates/{id}` | Delete template |
| POST | `/generate` | Generate PDF report |

### Settings (`/settings`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get current settings |
| PATCH | `/` | Update settings |
| GET | `/health` | Health check |

---

## Database Schema

8 tables with proper relationships, constraints, and indexes:

| Table | Purpose |
|-------|---------|
| `projects` | Project workspaces |
| `documents` | Uploaded files with ingestion status and categorization |
| `document_tags` | Custom tags for document organization |
| `chunks` | Text segments with pgvector embeddings (IVFFlat index) |
| `conversations` | Chat sessions with archive support |
| `messages` | Chat messages with citations and suggested follow-ups |
| `report_templates` | PDF report templates with section configuration |
| `settings` | Key-value settings with encrypted API key storage |

---

## Frontend Pages

| Page | Path | Status |
|------|------|--------|
| Home / Project List | `/` | Complete |
| New Project Wizard | `/projects/new` | Complete |
| Project Chat | `/projects/[id]` | Complete |
| Document Compare | `/projects/[id]/compare` | Complete |
| Search | `/search` | Complete |
| Settings | `/settings` | Complete |

---

## What's Working

- Local dev environment (PostgreSQL 16 + pgvector 0.8.1 + pg_trgm via Homebrew, backend serves on :8000)
- Full document ingestion pipeline (upload, extract, chunk, embed, categorize)
- Chat with streaming responses, citations, and follow-up suggestions
- Hybrid search (vector + keyword) with Reciprocal Rank Fusion
- Project management (create, update, delete, export, import)
- PDF report generation with customizable templates
- Dark/light theme switching
- Keyboard shortcuts throughout the app
- Settings management with encrypted API key storage
- Document comparison view (side-by-side with sync scroll)
- Search results page with filtering and relevance scores
- Anthropic (Claude) and Ollama (local) LLM providers with streaming
- Role mode selection (Plain vs Analytical) in project creation and display
- Sound notification infrastructure for ingestion events

## What's Not Yet Implemented

- .env.example template file (referenced in README but missing)
- Programmatic conflict detection engine (currently relies on LLM prompt reasoning)
- Notification sound asset (`/notification.mp3` missing from `frontend/public/`)
- Comprehensive test suite (backend: 3 smoke tests only; frontend: no tests)
- Authentication / multi-user support
- Production deployment configuration
- CI/CD pipeline

---

## Development Setup

### Prerequisites — PostgreSQL 16 + pgvector (Homebrew)

```bash
# Install PostgreSQL 16 and start the service
brew install postgresql@16
brew services start postgresql@16

# pgvector — Homebrew's bottle targets PG 17/18, so build from source for PG 16
git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git /tmp/pgvector-build
cd /tmp/pgvector-build
make PG_CONFIG=/opt/homebrew/opt/postgresql@16/bin/pg_config
make install PG_CONFIG=/opt/homebrew/opt/postgresql@16/bin/pg_config

# Add PG 16 binaries to PATH (keg-only, not symlinked by default)
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Create user, database, and extensions
createuser -s homora
psql -c "ALTER USER homora WITH PASSWORD 'homoradev';" postgres
createdb -O homora homora
psql -d homora -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql -d homora -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

### Backend

```bash
cd backend
uv venv --python python3.13 .venv
uv pip install -e ".[dev]"
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

**Note:** `postgresql@16` is keg-only. Add `export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"` to `~/.zshrc` for persistent access to `psql`, `createdb`, etc.

---

## Estimated Completion

The project is approximately **90-95% functionally complete** through Phases 1-6. Remaining work centers on:

1. .env.example template
2. Notification sound asset
3. Programmatic conflict detection engine
4. Comprehensive test suite (integration, E2E, frontend)
5. Production deployment + CI/CD

---

## Implementation Notes

- **Background tasks:** Uses FastAPI's built-in `BackgroundTasks` (not arq as PRD specifies) — lighter-weight, no Redis needed, but no task persistence across restarts.
- **Sound notifications:** Uses native `Audio` API (not `use-sound` package which is installed but unused).
- **Local dev setup:** PostgreSQL 16 via Homebrew (not Docker). pgvector must be built from source for PG 16 since Homebrew's bottle only targets PG 17/18. Python venv managed with `uv` (Python 3.13, `.venv` inside `backend/`).
