# Conversation + Document History, Branching, and Trash Design

## Validated Decisions
- Hybrid branch behavior on edit: preserve original path and create new continuation.
- User-message-only editing.
- Per-delete choice: soft delete or hard delete every time.
- Apply lifecycle parity to conversations and documents.
- Project page must include a bottom-left Trash entry point.
- History page default grouped timeline by date.

## Architecture
- Soft-delete lifecycle via `deleted_at` on conversations/documents.
- Branch lineage via `parent_conversation_id` and `branch_from_message_id`.
- Message edit lineage via `edited_from_message_id`.
- Unified trash API at project level.

## Backend API Surface
- Conversations: soft/hard delete, restore, purge, edit-and-regenerate.
- Documents: soft/hard delete, restore, purge.
- Project trash listing endpoint.
- Conversation fetch includes inline branch markers for UI nodes.

## Frontend UX
- Richer conversation selector with open + delete actions.
- User message inline edit with regenerate branch action.
- “Switch now?” prompt after regeneration while staying on existing path.
- Inline branch markers in thread.
- Dedicated `/projects/[id]/history` timeline with restore/purge.

## Rollout Notes
- Migration introduces nullable fields and indexes for active/deleted filtering.
- Existing non-history chat flow remains backward-compatible.
