# Homora — Product Requirements Document

## Executive Summary

Homora is a private, local-first real estate intelligence assistant that answers diligence questions using **only** ingested documents. It enforces strict citation requirements, refuses to hallucinate, and clearly communicates uncertainty.

**Key Differentiators:**
- Citation-first responses with document, page, and section references
- Zero hallucination policy — only answers from provided documents
- Project-based workspaces for organizing deals
- Fully local deployment (PostgreSQL, Python, Node.js)
- Multi-provider LLM support (OpenAI, Anthropic, Ollama)

---

## Core Requirements

### Response Behavior (Non-Negotiable)

1. **Citation First**
   - Every factual claim MUST be supported by a citation
   - Citation format: document name, page number, section (if available)
   - Uncitable claims marked as "Unconfirmed based on available documents"

2. **No Hallucination**
   - Never guess, infer, or generalize beyond documents
   - Never complete missing information from prior knowledge
   - Clearly state when documentation is missing

3. **Multi-Source Reasoning**
   - Synthesize across multiple documents IF all claims are cited
   - Distinguish between property-specific and jurisdiction-level documents

4. **Uncertainty Handling**
   - Answer what is known, explicitly state what is unknown
   - Use clear uncertainty language:
     - "The provided documents do not specify..."
     - "This could not be confirmed in the ingested documents..."

5. **Clarification Over Guessing**
   - Ask specific clarifying questions for ambiguous queries
   - Offer 2–3 interpretations when appropriate

### Response Structure (Required)

Every response follows this format:

```
### Answer
Direct, concise answer grounded strictly in documents.

### Evidence
- Document Name — Page X, Section Y
- Document Name — Page Z

### Risk Flags
List risks, constraints, or red flags found in documents.
(Or: "No explicit risks were identified in the provided documents.")

### Unknowns / Missing Information
Relevant information that could not be verified.

### Suggested Next Steps
Recommended documents or clarifications to improve confidence.
```

### Role Modes

| Mode | Behavior |
|------|----------|
| **Plain** | Non-technical language, explains implications simply |
| **Analytical** | Precise terminology, focuses on constraints, edge cases, implications |

---

## Design Decisions

| Area | Decision |
|------|----------|
| **Response delivery** | Stream tokens live, reformat into structured sections when complete |
| **Document viewer** | Modal overlay (full-screen) when clicking citations |
| **Large documents** | Support 500+ pages; chunked upload, resumable processing, progress tracking |
| **UI theme** | System-aware toggle (follows OS preference, manual override available) |
| **Conflict handling** | Ask user for clarification when documents contain conflicting information |
| **Embeddings** | OpenAI text-embedding-3-large (3072 dimensions) |
| **Chat history** | Session-based with archive; past sessions searchable but not auto-included in context |
| **Export** | Full diligence report as PDF with customizable sections |
| **Search** | Full search across documents + conversations with filters (project, date, doc type) |
| **Doc organization** | Auto-categorize by type (Lease, Appraisal, etc.) + manual custom tags |
| **Backup** | Export/import projects as portable archives |
| **Scale target** | Medium: 10-20 projects, ~200 documents |
| **Keyboard shortcuts** | Full shortcuts (Cmd+K search, Cmd+N new project, Cmd+U upload, etc.) |
| **Chunk size** | ~800 tokens with 150 token overlap for better context |
| **Table handling** | Convert tables to markdown format |
| **Language** | English only |
| **Chat input** | Multi-line with Shift+Enter for new lines, Enter to send |
| **Follow-up suggestions** | Always show 2-3 suggested questions after each response |
| **Project onboarding** | Guided wizard: name → upload docs → wait for processing → ready |
| **Notifications** | Toast + sound when ingestion completes |
| **Document comparison** | Side-by-side diff view for comparing two documents |
| **Error handling** | Skip failed documents with warning; continue with others |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                    (Next.js Frontend)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST + SSE (streaming)
┌─────────────────────▼───────────────────────────────────────┐
│                    FastAPI Backend                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Projects   │  │  Document   │  │   Chat / RAG        │  │
│  │  Service    │  │  Ingestion  │  │   Engine            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                           │                │                 │
│                    LangChain               │                 │
└───────────────────────────┼────────────────┼─────────────────┘
                            │                │
┌───────────────────────────▼────────────────▼─────────────────┐
│                    PostgreSQL + pgvector                     │
│         (Projects, Documents, Chunks, Embeddings)            │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, LangChain |
| Database | PostgreSQL 16 + pgvector + pg_trgm |
| LLM Providers | OpenAI, Anthropic, Ollama (switchable) |
| OCR | Vision models (GPT-4o, Claude Vision) |
| Deployment | Local (Shell) |

---

## Data Model

### Tables

**projects**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | string | Project name |
| description | text | Optional description |
| role_mode | enum | 'plain' or 'analytical' |
| created_at | timestamp | |
| updated_at | timestamp | |

**documents**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | FK → projects |
| filename | string | Original filename |
| file_type | enum | pdf, docx, xlsx, image, txt |
| file_path | string | Storage path |
| page_count | int | Number of pages |
| ingestion_status | enum | pending, processing, completed, failed |
| ingestion_progress | int | 0-100 progress |
| category | enum | Auto-detected: lease, appraisal, title, zoning, etc. |
| error_message | text | Error if ingestion failed |
| created_at | timestamp | |

**document_tags**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| document_id | uuid | FK → documents |
| tag | string | Custom tag |

**chunks**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| document_id | uuid | FK → documents |
| content | text | Extracted text |
| page_number | int | Source page |
| section | string | Detected section heading |
| embedding | vector[3072] | pgvector embedding (text-embedding-3-large) |
| metadata | jsonb | Additional metadata |

**conversations**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | FK → projects |
| title | string | Auto-generated from first question |
| archived | bool | Is session archived |
| created_at | timestamp | |
| updated_at | timestamp | |

**messages**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| conversation_id | uuid | FK → conversations |
| role | enum | user, assistant |
| content | text | Message content |
| citations | jsonb | [{document_id, page, section}] |
| suggested_followups | jsonb | ["q1", "q2", "q3"] |
| debug_info | jsonb | Retrieval debug metadata (chunks, scores, timing) |
| created_at | timestamp | |

**report_templates**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | string | Template name |
| sections | jsonb | ["Property Overview", ...] |
| is_default | bool | Default template |

**settings**
| Column | Type | Description |
|--------|------|-------------|
| key | string | Primary key |
| value | jsonb | Encrypted for API keys |

---

## Implementation Phases

### Phase 1: Foundation

**Objective:** Set up project infrastructure and basic scaffolding.

**Deliverables:**
1. Local environment configuration (PostgreSQL + pgvector, FastAPI, Next.js)
2. PostgreSQL schema with Alembic migrations
3. FastAPI skeleton with health check endpoint
4. Next.js project with Tailwind CSS and dark mode support
5. Basic project structure following the architecture

**Acceptance Criteria:**
- Local services start successfully
- `curl localhost:8000/health` returns 200
- Frontend loads at `localhost:3000`
- Database migrations run successfully

---

### Phase 2: Core Backend

**Objective:** Build document management and ingestion pipeline.

**Deliverables:**
1. Project CRUD endpoints (`POST/GET/PUT/DELETE /projects`)
2. Document upload with chunked upload support for large files
3. Ingestion pipeline:
   - PDF extraction (PyMuPDF)
   - DOCX extraction (python-docx)
   - XLSX → Markdown tables (openpyxl)
   - Image/scanned → Vision model OCR
4. Plain text extraction
5. Text chunking (~800 tokens, 150 token overlap)
6. Auto-categorization of document types (lease, appraisal, title, etc.)
7. Background processing with progress tracking (FastAPI BackgroundTasks)
8. Embedding generation and storage (OpenAI text-embedding-3-large, 3072 dimensions)

**Acceptance Criteria:**
- Upload 10-page PDF, verify chunks in DB with correct page numbers
- Upload 100+ page PDF, verify progress tracking
- Upload document with tables, verify markdown conversion
- Upload lease document, verify auto-categorization
- Failed documents show warning, don't block other uploads

---

### Phase 3: RAG Engine

**Objective:** Build the retrieval and response generation system.

**Deliverables:**
1. Hybrid retrieval (top-40 chunks):
   - Vector similarity search (pgvector cosine distance, 70% weight)
   - Keyword search (pg_trgm for exact terms, 30% weight)
   - Reciprocal Rank Fusion for result combination
2. LLM provider abstraction:
   - OpenAI provider
   - Anthropic provider
   - Ollama provider
   - Runtime switching via settings
3. Streaming chat endpoint with SSE
4. Homora system prompt integration
5. Citation parsing and storage
6. Conflict detection:
   - Detect conflicting facts in retrieved chunks
   - Pause and ask for clarification
   - Store user preference for session
7. Follow-up question generation (2-3 suggestions per response)

**Acceptance Criteria:**
- Ask question, receive structured response (Answer/Evidence/Risks/Unknowns/Next Steps)
- Citations link to correct document and page
- Response streams live, reformats on completion
- Suggested questions appear after each response
- Conflicting documents trigger clarification prompt
- Switch between OpenAI/Anthropic/Ollama works

---

### Phase 4: Frontend Core

**Objective:** Build the main user interface.

**Deliverables:**
1. **Landing Page:**
   - Project cards with doc count and last activity
   - "New Project" button
   - Recent activity feed
   - Settings access
   - Global search (Cmd+K)
2. **Project Creation Wizard:**
   - Step 1: Enter name and description
   - Step 2: Drag-drop document upload
   - Step 3: Processing progress
   - Step 4: "Ready to chat"
3. **Main Chat UI:**
   - Left sidebar: projects, documents with category badges, filters
   - Center: chat with streaming, structured responses
   - Follow-up suggestion chips
   - Multi-line input (Shift+Enter / Enter)
4. **Document Viewer Modal:**
   - Full-screen PDF viewer
   - Page navigation
   - Search within document
   - Jump to cited page from chat
5. **Keyboard Shortcuts:**
   - Cmd+K: Global search
   - Cmd+N: New project
   - Cmd+U: Upload documents
   - Cmd+Enter: Send message
   - Escape: Close modals

**Acceptance Criteria:**
- Create project through wizard flow
- Upload documents, see processing progress
- Ask questions, see streaming structured responses
- Click citation, modal opens at correct page
- All keyboard shortcuts work

---

### Phase 5: Advanced Features

**Objective:** Add power-user features for comprehensive diligence.

**Deliverables:**
1. **Session-Based History:**
   - Each chat session is separate
   - Past sessions archived and viewable (read-only)
   - Sessions searchable
2. **Full Search:**
   - Search across documents and conversations
   - Filters: project, date range, document type, category
   - Results with context snippets
3. **Document Comparison:**
   - Select two documents
   - Side-by-side diff view
   - Sync scroll option
4. **Diligence Report Generator:**
   - Select sections to include (customizable)
   - Preview before export
   - Download as PDF
   - Default sections: Property Overview, Key Findings, Risk Summary, Open Questions, Source Documents
5. **Project Export/Import:**
   - Export project as portable archive (documents + metadata + history)
   - Import archive on another machine

**Acceptance Criteria:**
- Past sessions viewable and searchable
- Search finds results across documents and conversations
- Compare two PDFs side-by-side
- Generate customized diligence report PDF
- Export project, import on fresh instance

---

### Phase 6: Polish

**Objective:** Refine UX and handle edge cases.

**Deliverables:**
1. **Settings UI:**
   - LLM provider selection with model dropdown
   - API key input (encrypted storage)
   - Theme toggle (light/dark/system)
   - Keyboard shortcut reference
2. **Notifications:**
   - Toast notifications for events
   - Sound on ingestion complete
   - Progress indicators throughout
3. **Error Handling:**
   - Skip failed documents with warning
   - Retry option for failed uploads
   - Graceful degradation for API failures
4. **Loading States:**
   - Skeleton UI during loads
   - Progress bars for long operations
   - Smooth transitions

**Acceptance Criteria:**
- Settings persist across sessions
- Toast + sound when ingestion completes
- Failed documents show clear warning
- UI feels responsive with proper loading states

---

### Phase 7: Testing & Documentation

**Objective:** Ensure reliability and maintainability.

**Deliverables:**
1. **Backend Tests:**
   - Unit tests for services
   - Integration tests for API endpoints
   - Test coverage for ingestion pipeline
2. **Frontend Tests:**
   - Component tests with React Testing Library
   - E2E tests for critical flows (Playwright)
3. **Documentation:**
   - README with setup instructions
   - API documentation (auto-generated from FastAPI)
   - Architecture decision records

**Acceptance Criteria:**
- Backend test coverage > 80%
- Critical user flows have E2E tests
- New developer can set up project from README

---

## Project Structure

```
homora-labs/
├── .env.example
├── prd.md
├── backend/
│   ├── pyproject.toml
│   ├── alembic/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── project.py
│   │   │   ├── document.py
│   │   │   ├── chunk.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   └── settings.py
│   │   ├── schemas/
│   │   │   ├── project.py
│   │   │   ├── document.py
│   │   │   ├── chat.py
│   │   │   └── report.py
│   │   ├── services/
│   │   │   ├── ingestion/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── pipeline.py
│   │   │   │   ├── extractors.py
│   │   │   │   ├── vision.py
│   │   │   │   ├── chunker.py
│   │   │   │   └── categorizer.py
│   │   │   ├── retrieval.py
│   │   │   ├── llm/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py
│   │   │   │   ├── openai.py
│   │   │   │   ├── anthropic.py
│   │   │   │   └── ollama.py
│   │   │   ├── embeddings.py
│   │   │   ├── search.py
│   │   │   ├── reports.py
│   │   │   └── export.py
│   │   ├── routers/
│   │   │   ├── projects.py
│   │   │   ├── documents.py
│   │   │   ├── chat.py
│   │   │   ├── search.py
│   │   │   ├── reports.py
│   │   │   └── settings.py
│   │   └── prompts/
│   │       └── system.py
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── compare/
│   │   │   │           └── page.tsx
│   │   │   ├── search/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── landing/
│   │   │   ├── chat/
│   │   │   ├── documents/
│   │   │   ├── wizard/
│   │   │   ├── reports/
│   │   │   ├── search/
│   │   │   ├── settings/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   └── lib/
└── docs/
    └── plans/
```

---

## Key Libraries

### Backend
| Library | Purpose |
|---------|---------|
| fastapi, uvicorn | API framework |
| sqlalchemy, asyncpg | Database ORM |
| pgvector | Vector operations |
| langchain, langchain-openai, langchain-anthropic | LLM abstraction |
| pymupdf | PDF processing |
| python-docx, openpyxl | Office formats |
| python-multipart | File uploads |
| sse-starlette | Streaming responses |
| weasyprint | PDF report generation |
| FastAPI BackgroundTasks | Background task processing |
| cryptography | API key encryption |

### Frontend
| Library | Purpose |
|---------|---------|
| next 14+ | React framework |
| tailwindcss | Styling |
| @react-pdf-viewer/core | PDF viewer |
| react-dropzone | File uploads |
| @tanstack/react-query | Data fetching |
| zustand | State management |
| next-themes | Dark mode |
| sonner | Toast notifications |
| cmdk | Command palette |
| Native Audio API | Audio notifications |

---

## Verification Checklist

### Foundation
- [ ] Local services start successfully
- [ ] Database tables created via migrations
- [ ] `curl localhost:8000/health` returns 200
- [ ] Frontend loads at `localhost:3000`

### Ingestion
- [ ] Upload 10-page PDF, chunks have correct page numbers
- [ ] Upload 100+ page PDF, progress tracking works
- [ ] Tables converted to markdown
- [ ] Document categories auto-detected
- [ ] Failed documents show warning, don't block others

### RAG & Chat
- [ ] Structured response (Answer/Evidence/Risks/Unknowns/Next Steps)
- [ ] Citations link to correct document and page
- [ ] Responses stream live
- [ ] Follow-up suggestions appear
- [ ] Conflict detection triggers clarification

### Frontend
- [ ] Project wizard flow works
- [ ] Chat with streaming responses
- [ ] Citation click opens document modal at page
- [ ] Theme toggle works
- [ ] Keyboard shortcuts work

### Advanced
- [ ] Past sessions viewable and searchable
- [ ] Search across documents and conversations
- [ ] Document comparison side-by-side
- [ ] Diligence report PDF export
- [ ] Project export/import

### Multi-provider
- [ ] OpenAI works
- [ ] Anthropic works
- [ ] Ollama works

---

## Success Metrics

1. **Accuracy**: 100% of factual claims have valid citations
2. **Response Time**: < 5s for typical queries (streaming first token < 1s)
3. **Ingestion Speed**: ~10 pages/minute for standard PDFs
4. **Uptime**: Local deployment should start reliably every time

---

## Out of Scope (v1)

- Multi-user authentication
- Real-time collaboration
- Mobile app
- Cloud deployment
- Multi-language document support
- Automatic document fetching from external sources
- Integration with external CRM/deal management tools

---

## Glossary

| Term | Definition |
|------|------------|
| **Chunk** | A segment of text (~800 tokens) extracted from a document for embedding |
| **Citation** | Reference to source: document name, page number, section |
| **Embedding** | Vector representation of text for semantic search |
| **Hybrid Retrieval** | Combining vector similarity and keyword search |
| **pgvector** | PostgreSQL extension for vector operations |
| **RAG** | Retrieval-Augmented Generation — LLM responses grounded in retrieved documents |
| **Role Mode** | Plain (simple language) vs Analytical (technical terminology) |
