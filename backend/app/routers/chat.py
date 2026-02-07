import uuid
import json
import time
import math
import re
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    MessageResponse,
    ConversationResponse,
    ConversationListResponse,
    Citation,
    DebugInfo,
    RetrievedChunkInfo,
)
from app.services.retrieval import hybrid_search, format_context_for_llm, RetrievedChunk
from app.services.embeddings import generate_embeddings
from app.services.llm import get_llm_provider
from app.prompts.system import get_system_prompt, get_followup_generation_prompt
from app.models.settings import Settings as SettingsModel
from app.routers.settings import decrypt_value
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/projects/{project_id}", tags=["chat"])


async def get_llm_config(db: AsyncSession) -> tuple[str, str | None]:
    """Read LLM provider and decrypted API key from DB settings.
    Falls back to env vars if not set in DB."""
    result = await db.execute(select(SettingsModel))
    settings_dict = {s.key: s for s in result.scalars().all()}

    # Provider from DB, fallback to env
    provider_setting = settings_dict.get("llm_provider")
    provider = (
        provider_setting.value.get("v", settings.default_llm_provider)
        if provider_setting
        else settings.default_llm_provider
    )

    # API key from DB (encrypted), fallback to env
    api_key = None
    key_setting = settings_dict.get(f"api_key_{provider}")
    if key_setting and key_setting.encrypted_value:
        try:
            api_key = decrypt_value(key_setting.encrypted_value)
        except Exception:
            pass  # Fall through to env var

    return provider, api_key


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    project_id: uuid.UUID,
    archived: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List conversations in a project."""
    query = (
        select(Conversation)
        .where(Conversation.project_id == project_id)
        .where(Conversation.archived == archived)
        .order_by(Conversation.updated_at.desc())
    )

    result = await db.execute(query)
    conversations = result.scalars().all()

    conv_responses = []
    for conv in conversations:
        conv_responses.append(
            ConversationResponse(
                id=conv.id,
                project_id=conv.project_id,
                title=conv.title,
                archived=conv.archived,
                messages=[],
                created_at=conv.created_at,
                updated_at=conv.updated_at,
            )
        )

    return ConversationListResponse(
        conversations=conv_responses, total=len(conv_responses)
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with all messages."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get messages
    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = messages_result.scalars().all()

    return ConversationResponse(
        id=conversation.id,
        project_id=conversation.project_id,
        title=conversation.title,
        archived=conversation.archived,
        messages=[
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                citations=[Citation(**c) for c in (m.citations or [])],
                suggested_followups=m.suggested_followups,
                created_at=m.created_at,
            )
            for m in messages
        ],
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.post("/conversations/{conversation_id}/archive")
async def archive_conversation(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Archive a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.archived = True
    await db.commit()

    return {"status": "archived"}


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conversation)
    await db.commit()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    project_id: uuid.UUID,
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get a response (non-streaming)."""
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get or create conversation
    if request.conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == request.conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            project_id=project_id,
            title=request.message[:50] + "..." if len(request.message) > 50 else request.message,
        )
        db.add(conversation)
        await db.flush()

    # Save user message
    user_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.user,
        content=request.message,
    )
    db.add(user_message)
    await db.flush()

    # Retrieve relevant chunks
    chunks = await hybrid_search(db, request.message, project_id)

    # Build conversation history
    history = await get_conversation_history(db, conversation.id)

    # Generate response
    response_content, citations = await generate_response(
        db=db,
        project=project,
        query=request.message,
        chunks=chunks,
        history=history,
    )

    # Generate follow-up suggestions
    followups = await generate_followups(
        db=db,
        query=request.message,
        response=response_content,
        chunks=chunks,
    )

    # Save assistant message
    assistant_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.assistant,
        content=response_content,
        citations=[c.model_dump(mode='json') for c in citations],
        suggested_followups=followups,
    )
    db.add(assistant_message)
    await db.commit()

    return ChatResponse(
        conversation_id=conversation.id,
        message=MessageResponse(
            id=assistant_message.id,
            role=assistant_message.role,
            content=assistant_message.content,
            citations=citations,
            suggested_followups=followups,
            created_at=assistant_message.created_at,
        ),
    )


@router.post("/chat/stream")
async def chat_stream(
    project_id: uuid.UUID,
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get a streaming response."""
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get or create conversation
    if request.conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == request.conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            project_id=project_id,
            title=request.message[:50] + "..." if len(request.message) > 50 else request.message,
        )
        db.add(conversation)
        await db.flush()

    # Save user message
    user_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.user,
        content=request.message,
    )
    db.add(user_message)
    await db.commit()

    return EventSourceResponse(
        stream_response(
            db=db,
            project=project,
            conversation=conversation,
            query=request.message,
        )
    )


async def stream_response(
    db: AsyncSession,
    project: Project,
    conversation: Conversation,
    query: str,
) -> AsyncGenerator[str, None]:
    """Stream the response tokens."""
    try:
        start_time = time.time()

        # Retrieve relevant chunks
        chunks = await hybrid_search(db, query, project.id)

        # Build context
        context = format_context_for_llm(chunks)

        # Build conversation history
        history = await get_conversation_history(db, conversation.id)

        # Get LLM provider from DB settings (with env var fallback)
        provider_name, api_key = await get_llm_config(db)
        provider = get_llm_provider(provider_name, api_key=api_key)

        # Build messages and capture prompts for debug
        system_prompt = get_system_prompt(project.role_mode.value)
        messages = [
            {"role": "system", "content": system_prompt},
        ]

        # Add history
        for msg in history[-10:]:  # Last 10 messages for context
            messages.append({"role": msg.role.value, "content": msg.content})

        # Add context and query
        user_prompt = f"""Based on the following documents:

{context}

Question: {query}"""
        messages.append({
            "role": "user",
            "content": user_prompt
        })

        # Stream response
        full_response = ""
        async for token in provider.generate_stream(messages):
            full_response += token
            yield json.dumps({"type": "token", "content": token})

        # Parse citations from response
        citations = extract_citations_from_response(full_response, chunks)
        await annotate_chunks_with_support(chunks, full_response, citations)

        # Generate follow-ups
        followups = await generate_followups(db, query, full_response, chunks)

        # Build debug info
        execution_time_ms = (time.time() - start_time) * 1000
        debug_info = DebugInfo(
            retrieved_chunks=[
                RetrievedChunkInfo(
                    document_name=c.document_name,
                    page_number=c.page_number,
                    section=c.section,
                    content=c.content[:500],  # Truncate for UI
                    score=c.score,
                    retrieval_relevance=c.retrieval_relevance,
                    answer_support=c.answer_support,
                    retrieval_rank=c.retrieval_rank,
                    cited_in_answer=c.cited_in_answer,
                )
                for c in chunks
            ],
            execution_time_ms=execution_time_ms,
            llm_model=provider.model_name if hasattr(provider, 'model_name') else provider_name,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        # Save assistant message
        assistant_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.assistant,
            content=full_response,
            citations=[c.model_dump(mode='json') for c in citations],
            suggested_followups=followups,
            debug_info=debug_info.model_dump(mode='json'),
        )
        db.add(assistant_message)
        await db.commit()
        await db.refresh(assistant_message)

        # Send final message with metadata
        yield json.dumps({
            "type": "complete",
            "message_id": str(assistant_message.id),
            "conversation_id": str(conversation.id),
            "citations": [c.model_dump(mode='json') for c in citations],
            "suggested_followups": followups,
            "debug_info": debug_info.model_dump(mode='json'),
        })
    except Exception as e:
        yield json.dumps({"type": "error", "content": str(e)})


async def get_conversation_history(
    db: AsyncSession,
    conversation_id: uuid.UUID,
) -> list[Message]:
    """Get conversation history."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return list(result.scalars().all())


async def generate_response(
    db: AsyncSession,
    project: Project,
    query: str,
    chunks: list[RetrievedChunk],
    history: list[Message],
) -> tuple[str, list[Citation]]:
    """Generate a response using the LLM."""
    # Build context
    context = format_context_for_llm(chunks)

    # Get LLM provider from DB settings (with env var fallback)
    provider_name, api_key = await get_llm_config(db)
    provider = get_llm_provider(provider_name, api_key=api_key)

    # Build messages
    messages = [
        {"role": "system", "content": get_system_prompt(project.role_mode.value)},
    ]

    # Add history
    for msg in history[-10:]:
        messages.append({"role": msg.role.value, "content": msg.content})

    # Add context and query
    messages.append({
        "role": "user",
        "content": f"""Based on the following documents:

{context}

Question: {query}"""
    })

    # Generate response
    response = await provider.generate(messages)

    # Extract citations
    citations = extract_citations_from_response(response.content, chunks)
    await annotate_chunks_with_support(chunks, response.content, citations)

    return response.content, citations


def extract_citations_from_response(
    response: str,
    chunks: list[RetrievedChunk],
) -> list[Citation]:
    """Extract citations from the response based on referenced chunks."""
    citations = []
    seen = set()

    for chunk in chunks:
        # Check if document is mentioned in response using strict format
        # Pattern: [Document: <name>, ...]
        pattern = re.compile(rf"\[Document: {re.escape(chunk.document_name)}.*\]")
        if pattern.search(response):
            key = (chunk.document_id, chunk.page_number)
            if key not in seen:
                citations.append(
                    Citation(
                        document_id=chunk.document_id,
                        document_name=chunk.document_name,
                        page=chunk.page_number,
                        section=chunk.section,
                    )
                )
                seen.add(key)

    return citations


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity for two equal-length vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _lexical_support_score(response: str, content: str) -> float:
    """Fallback overlap score when embedding-based support cannot be computed."""
    response_tokens = set(re.findall(r"\b[a-z0-9]{3,}\b", response.lower()))
    content_tokens = set(re.findall(r"\b[a-z0-9]{3,}\b", content.lower()))
    if not response_tokens or not content_tokens:
        return 0.0
    overlap = len(response_tokens & content_tokens)
    return min(1.0, overlap / len(response_tokens))


async def annotate_chunks_with_support(
    chunks: list[RetrievedChunk],
    response: str,
    citations: list[Citation],
) -> None:
    """Populate chunk-level support signals for Inspect UI."""
    citation_keys = {(c.document_id, c.page) for c in citations}
    for chunk in chunks:
        chunk.cited_in_answer = (chunk.document_id, chunk.page_number) in citation_keys

    if not chunks:
        return

    chunk_texts = [chunk.content[:1500] for chunk in chunks]
    try:
        vectors = await generate_embeddings([response[:3000], *chunk_texts])
        response_vec = vectors[0]
        chunk_vecs = vectors[1:]
        for chunk, chunk_vec in zip(chunks, chunk_vecs):
            support = _cosine_similarity(response_vec, chunk_vec)
            chunk.answer_support = max(0.0, min(1.0, support))
    except Exception:
        for chunk in chunks:
            chunk.answer_support = _lexical_support_score(response, chunk.content)


async def generate_followups(
    db: AsyncSession,
    query: str,
    response: str,
    chunks: list[RetrievedChunk],
) -> list[str]:
    """Generate follow-up question suggestions."""
    try:
        provider_name, api_key = await get_llm_config(db)
        provider = get_llm_provider(provider_name, api_key=api_key)

        messages = [
            {"role": "system", "content": get_followup_generation_prompt()},
            {
                "role": "user",
                "content": f"""Original question: {query}

Response given: {response[:1000]}...

Generate 3 follow-up questions."""
            },
        ]

        result = await provider.generate(messages, temperature=0.8, max_tokens=200)

        # Parse JSON array
        followups = json.loads(result.content)
        if isinstance(followups, list) and len(followups) >= 3:
            return followups[:3]
    except Exception:
        pass

    # Fallback suggestions
    return [
        "What are the key risk factors I should be aware of?",
        "Are there any important dates or deadlines mentioned?",
        "What additional documents would help clarify this?",
    ]
