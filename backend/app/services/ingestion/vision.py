import base64
from typing import Literal

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

from app.config import get_settings

settings = get_settings()


async def extract_text_from_image(
    image_data: bytes,
    image_format: str = "png",
    provider: Literal["openai", "anthropic"] = "openai",
) -> str:
    """Use vision models to extract text from an image."""
    if provider == "openai":
        return await extract_with_openai(image_data, image_format)
    elif provider == "anthropic":
        return await extract_with_anthropic(image_data, image_format)
    else:
        raise ValueError(f"Unknown provider: {provider}")


async def extract_with_openai(image_data: bytes, image_format: str) -> str:
    """Extract text using GPT-4o vision."""
    if not settings.openai_api_key:
        raise ValueError("OpenAI API key not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    base64_image = base64.b64encode(image_data).decode("utf-8")
    media_type = f"image/{image_format}" if image_format != "jpg" else "image/jpeg"

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """Extract all text from this image. Preserve the layout and structure as much as possible.
If this is a scanned document, extract all readable text.
If there are tables, convert them to markdown format.
If there are diagrams or figures, describe them briefly in [brackets].
Return only the extracted text, nothing else.""",
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{base64_image}",
                        },
                    },
                ],
            }
        ],
        max_tokens=4096,
    )

    return response.choices[0].message.content or ""


async def extract_with_anthropic(image_data: bytes, image_format: str) -> str:
    """Extract text using Claude Vision."""
    if not settings.anthropic_api_key:
        raise ValueError("Anthropic API key not configured")

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    base64_image = base64.b64encode(image_data).decode("utf-8")
    media_type = f"image/{image_format}" if image_format != "jpg" else "image/jpeg"

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": base64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": """Extract all text from this image. Preserve the layout and structure as much as possible.
If this is a scanned document, extract all readable text.
If there are tables, convert them to markdown format.
If there are diagrams or figures, describe them briefly in [brackets].
Return only the extracted text, nothing else.""",
                    },
                ],
            }
        ],
    )

    return response.content[0].text if response.content else ""
