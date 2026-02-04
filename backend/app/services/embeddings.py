from openai import AsyncOpenAI

from app.config import get_settings

settings = get_settings()


async def generate_embeddings(
    texts: list[str],
    model: str | None = None,
) -> list[list[float]]:
    """
    Generate embeddings for a list of texts using OpenAI's embedding model.
    """
    if not texts:
        return []

    model = model or settings.default_embedding_model

    if not settings.openai_api_key:
        raise ValueError("OpenAI API key not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    # Batch process for efficiency (OpenAI allows up to 2048 items per batch)
    all_embeddings = []
    batch_size = 100

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]

        # Filter empty texts
        non_empty_indices = [j for j, t in enumerate(batch) if t.strip()]
        non_empty_texts = [batch[j] for j in non_empty_indices]

        if non_empty_texts:
            response = await client.embeddings.create(
                model=model,
                input=non_empty_texts,
            )

            # Map embeddings back to original positions
            embedding_map = {
                non_empty_indices[k]: response.data[k].embedding
                for k in range(len(non_empty_texts))
            }

            # Fill in batch results
            batch_embeddings = []
            for j in range(len(batch)):
                if j in embedding_map:
                    batch_embeddings.append(embedding_map[j])
                else:
                    # Empty text gets zero vector
                    batch_embeddings.append([0.0] * settings.embedding_dimension)

            all_embeddings.extend(batch_embeddings)
        else:
            # All texts were empty
            all_embeddings.extend([[0.0] * settings.embedding_dimension] * len(batch))

    return all_embeddings


async def generate_single_embedding(text: str, model: str | None = None) -> list[float]:
    """Generate embedding for a single text."""
    embeddings = await generate_embeddings([text], model)
    return embeddings[0] if embeddings else [0.0] * settings.embedding_dimension
