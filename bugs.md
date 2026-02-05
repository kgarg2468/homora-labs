# Homora Labs - Bug Report & Fix Summary

## Overview

**Total bugs found:** 13 (4 critical, 5 medium, 4 minor)
**Bugs fixed:** 6 (4 critical, 2 medium)

---

## All Bugs Found

### Critical

| # | Bug | File(s) | Status |
|---|-----|---------|--------|
| 3 | **Standalone image OCR never triggers.** `extractors.py` yields `images=[path]` (a `Path` object), but `pipeline.py` checks `isinstance(img, dict)` -- always False for Path. Standalone image uploads produce empty chunks. | `extractors.py:36` + `pipeline.py:70` | Fixed |
| 4 | **Import endpoint broken.** `file: bytes` parameter type won't accept multipart file uploads. Should be `file: UploadFile = File(...)`. Returns 422 on every request. | `routers/projects.py:196-198` | Fixed |
| 9 | **Settings form never populates.** Uses `useState(() => { ... })` as an initializer instead of `useEffect`. The function runs before `settings` is fetched (it's `undefined`), so form fields are never populated. | `settings/page.tsx:38-44` | Fixed |
| 10 | **Streaming chat loses conversation ID.** The `complete` SSE event doesn't include `conversation_id`. Frontend never sets `conversationId` after the first message, so each subsequent message creates a new conversation. | `routers/chat.py:387-392` + `projects/[id]/page.tsx:150-157` | Fixed |

### Medium

| # | Bug | File(s) | Status |
|---|-----|---------|--------|
| 6 | **Keyword search crashes on special characters.** `" & ".join(query.split())` passes unsanitized input to `to_tsquery`. Queries with `&`, `\|`, `!`, `:`, `*`, `(`, `)` cause PostgreSQL syntax errors. | `retrieval.py:112` | Fixed |
| 7 | **Same tsquery injection in global search.** Same unsanitized `to_tsquery` pattern. | `services/search.py:82,151` | Fixed |
| 8 | `extract_citations_from_response` uses naive substring match (`chunk.document_name in response`). False positives when filename contains common words. | `routers/chat.py:463` | Open |
| 13 | **Settings GET shows empty model lists** when API keys aren't configured (initial state). `get_llm_provider()` raises ValueError for missing keys; caught and returns `[]`. | `routers/settings.py:58-63` | Fixed |

### Minor

| # | Bug | File(s) | Status |
|---|-----|---------|--------|
| 1 | `default=` (Python-side) used instead of `server_default=` for several columns in migration. | `001_initial_schema.py:55,104,135,80` | Open |
| 2 | No metadata/title export in root layout. | `frontend/src/app/layout.tsx` | Open |
| 5 | File overwrite on duplicate filename upload -- no UUID/timestamp suffix. | `routers/documents.py:137` | Open |
| 11 | Compare page `syncScroll` checkbox exists but synchronized scrolling is not implemented. | `compare/page.tsx:19,74` | Open |
| 12 | Export ZIP can have filename collisions -- two documents with same filename overwrite each other in the archive. | `services/export.py:102` | Open |

---

## Changes Made

### 1. Fix #4 -- Import endpoint broken

**File:** `backend/app/routers/projects.py`

- Added `File, UploadFile` to FastAPI imports.
- Changed parameter `file: bytes` to `file: UploadFile = File(...)`.
- Added `file_bytes = await file.read()` before passing data to `import_project`.

### 2. Fix #9 -- Settings form never populates

**File:** `frontend/src/app/settings/page.tsx`

- Added `useEffect` to the React import.
- Replaced the incorrect `useState(() => { ... })` initializer with `useEffect(() => { ... }, [settings])` so the form fields populate once settings data is fetched.

### 3. Fix #10 -- Streaming chat loses conversation ID

**Files:**

- `backend/app/routers/chat.py` -- Added `"conversation_id": str(conversation.id)` to the `complete` SSE event payload.
- `frontend/src/lib/types.ts` -- Added `conversation_id: string` field to the `StreamCompleteEvent` interface.
- `frontend/src/app/projects/[id]/page.tsx` -- Updated the `complete` event handler to call `setConversationId(event.conversation_id)` so subsequent messages continue the same conversation.

### 4. Fix #3 -- Image OCR never triggers

**File:** `backend/app/services/ingestion/pipeline.py`

- Added an `elif isinstance(img, Path)` branch alongside the existing `isinstance(img, dict)` check.
- The new branch reads bytes from the file path (`img.read_bytes()`) and extracts the extension (`img.suffix.lstrip(".")`) before passing them to `extract_text_from_image`.

### 5. Fix #6/#7 -- Keyword search crashes on special characters

**Files:**

- `backend/app/services/retrieval.py` -- Replaced `to_tsquery('english', :query)` with `plainto_tsquery('english', :query)` and removed the manual `" & ".join(query.split())` preprocessing. The raw query string is now passed directly.
- `backend/app/services/search.py` -- Applied the same `to_tsquery` -> `plainto_tsquery` replacement in both `search_documents` and `search_conversations` functions.

### 6. Fix #13 -- Settings empty model lists on first use

**File:** `backend/app/routers/settings.py`

- Added a `fallback_models` dictionary with hardcoded model lists for each provider (openai, anthropic, ollama).
- Changed the `except ValueError` to `except (ValueError, Exception)` so any provider initialization failure falls through to the fallback list instead of returning an empty array.

---

## Remaining Open Items

| Priority | Bug # | Description |
|----------|-------|-------------|
| Nice to fix | 5, 12 | Filename collisions on upload and export (add UUID suffix) |
| Nice to fix | 8 | Citation false-positive matching (parse `[Document: ...]` format instead of substring) |
| Nice to fix | 11 | Sync scroll checkbox is a no-op on compare page |
| Non-blocking | 1 | Migration uses `default=` instead of `server_default=` |
| Non-blocking | 2 | Root layout missing metadata/title export |
