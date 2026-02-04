# Homora - Real Estate Intelligence Assistant

Homora is a private, local-first real estate intelligence assistant that answers diligence questions using **only** ingested documents. It enforces strict citation requirements, refuses to hallucinate, and clearly communicates uncertainty.

## Features

- **Citation-first responses**: Every claim references document name, page, and section
- **No hallucination**: Never guesses or infers beyond documents
- **Multi-source reasoning**: Synthesizes across documents with citations
- **Uncertainty handling**: Explicitly states what's unknown
- **Structured responses**: Answer → Evidence → Risk Flags → Unknowns → Next Steps
- **Role modes**: Plain (non-technical) vs Analytical (precise terminology)
- **Document support**: PDF, DOCX, XLSX, and images
- **OCR support**: Vision models for scanned documents
- **Multi-provider LLM**: OpenAI, Anthropic, Ollama
- **Full search**: Search across documents and conversations
- **Report generation**: Export diligence reports as PDF

## Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key (or Anthropic/Ollama)

### Setup

1. Clone the repository and navigate to the project directory:

```bash
cd homora-labs
```

2. Copy the environment file and configure your API keys:

```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Start all services:

```bash
docker-compose up -d
```

4. Wait for services to start, then run database migrations:

```bash
docker-compose exec backend alembic upgrade head
```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                    (Next.js Frontend)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼───────────────────────────────────────┐
│                    FastAPI Backend                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Projects   │  │  Document   │  │   Chat / RAG        │  │
│  │  Service    │  │  Ingestion  │  │   Engine            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┼────────────────┼─────────────────┘
                            │                │
┌───────────────────────────▼────────────────▼─────────────────┐
│                    PostgreSQL + pgvector                     │
│         (Projects, Documents, Chunks, Embeddings)            │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, LangChain |
| Database | PostgreSQL 16 + pgvector |
| LLM Providers | OpenAI, Anthropic, Ollama (switchable) |
| OCR | Vision models (GPT-4o, Claude Vision) |
| Deployment | Docker Compose (fully local) |

## Project Structure

```
homora-labs/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic/                 # DB migrations
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings management
│   │   ├── database.py          # DB connection
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   ├── routers/             # API endpoints
│   │   └── prompts/             # LLM prompts
│   └── tests/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom hooks
│   │   └── lib/                 # Utilities
└── documents/                   # Document storage
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Global search |
| `Cmd+N` | New project |
| `Cmd+U` | Upload documents |
| `Cmd+Enter` | Send message |
| `Escape` | Close modals |
| `Cmd+,` | Open settings |

## API Endpoints

### Projects
- `GET /projects` - List all projects
- `POST /projects` - Create project
- `GET /projects/{id}` - Get project
- `PATCH /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project
- `GET /projects/{id}/export` - Export project as ZIP

### Documents
- `GET /projects/{id}/documents` - List documents
- `POST /projects/{id}/documents` - Upload document
- `GET /projects/{id}/documents/{doc_id}` - Get document
- `DELETE /projects/{id}/documents/{doc_id}` - Delete document
- `POST /projects/{id}/documents/{doc_id}/reprocess` - Reprocess document

### Chat
- `GET /projects/{id}/conversations` - List conversations
- `GET /projects/{id}/conversations/{conv_id}` - Get conversation
- `POST /projects/{id}/chat` - Send message
- `POST /projects/{id}/chat/stream` - Send message (streaming)

### Search
- `POST /search` - Search across documents and conversations

### Reports
- `GET /reports/templates` - List report templates
- `POST /reports/generate` - Generate PDF report

### Settings
- `GET /settings` - Get settings
- `PATCH /settings` - Update settings

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_PASSWORD` | PostgreSQL password | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes* |
| `ANTHROPIC_API_KEY` | Anthropic API key | No |
| `OLLAMA_BASE_URL` | Ollama server URL | No |
| `SECRET_KEY` | Encryption key for API keys | Yes |

*At least one LLM provider API key is required.

## Development

### Backend

```bash
cd backend
pip install -e ".[dev]"
python -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## License

MIT
