import re
from dataclasses import dataclass

import tiktoken

from app.config import get_settings

settings = get_settings()


@dataclass
class TextChunk:
    content: str
    page_number: int | None
    section: str | None
    token_count: int


def chunk_text(
    text: str,
    page_number: int | None = None,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[TextChunk]:
    """
    Split text into chunks of approximately chunk_size tokens with overlap.
    Tries to split on sentence boundaries for better context.
    """
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap

    if not text.strip():
        return []

    # Use tiktoken for accurate token counting
    encoding = tiktoken.get_encoding("cl100k_base")

    # Detect section headers
    section = detect_section(text)

    # Split into sentences first
    sentences = split_into_sentences(text)

    chunks = []
    current_chunk_sentences = []
    current_token_count = 0

    for sentence in sentences:
        sentence_tokens = len(encoding.encode(sentence))

        # If adding this sentence would exceed chunk_size
        if current_token_count + sentence_tokens > chunk_size and current_chunk_sentences:
            # Save current chunk
            chunk_text = " ".join(current_chunk_sentences)
            chunks.append(
                TextChunk(
                    content=chunk_text.strip(),
                    page_number=page_number,
                    section=section,
                    token_count=current_token_count,
                )
            )

            # Start new chunk with overlap
            overlap_sentences = []
            overlap_tokens = 0
            for s in reversed(current_chunk_sentences):
                s_tokens = len(encoding.encode(s))
                if overlap_tokens + s_tokens <= chunk_overlap:
                    overlap_sentences.insert(0, s)
                    overlap_tokens += s_tokens
                else:
                    break

            current_chunk_sentences = overlap_sentences
            current_token_count = overlap_tokens

        current_chunk_sentences.append(sentence)
        current_token_count += sentence_tokens

    # Don't forget the last chunk
    if current_chunk_sentences:
        chunk_text = " ".join(current_chunk_sentences)
        chunks.append(
            TextChunk(
                content=chunk_text.strip(),
                page_number=page_number,
                section=section,
                token_count=current_token_count,
            )
        )

    return chunks


def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences, preserving structure."""
    # Handle common abbreviations to avoid false splits
    text = re.sub(r"(\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Inc|Ltd|Corp|vs|etc|al|eg|ie))\.", r"\1<PERIOD>", text)

    # Split on sentence boundaries
    sentences = re.split(r"(?<=[.!?])\s+", text)

    # Restore periods in abbreviations
    sentences = [s.replace("<PERIOD>", ".") for s in sentences]

    # Filter empty sentences
    sentences = [s.strip() for s in sentences if s.strip()]

    return sentences


def detect_section(text: str) -> str | None:
    """Try to detect section headers in text."""
    # Common section header patterns
    patterns = [
        r"^#+\s*(.+)$",  # Markdown headers
        r"^([A-Z][A-Z\s]+)$",  # ALL CAPS headers
        r"^(\d+\.?\s+[A-Z].+)$",  # Numbered sections like "1. Introduction"
        r"^(Section\s+\d+.*)$",  # "Section X" format
        r"^(Article\s+\d+.*)$",  # "Article X" format
        r"^(EXHIBIT\s+[A-Z0-9]+.*)$",  # Legal exhibit format
    ]

    lines = text.split("\n")[:5]  # Check first 5 lines

    for line in lines:
        line = line.strip()
        for pattern in patterns:
            match = re.match(pattern, line, re.MULTILINE)
            if match:
                return match.group(1).strip()

    return None


def count_tokens(text: str) -> int:
    """Count tokens in text using tiktoken."""
    encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))
