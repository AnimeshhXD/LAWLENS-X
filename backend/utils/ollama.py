import httpx
import json
import os
import logging
import asyncio

from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

logger = logging.getLogger(__name__)

async def generate_completion(prompt: str, timeout: float = 60.0) -> str:
    safe_prompt = prompt[:8000]
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                logger.info(f"Calling Ollama at {OLLAMA_URL} with model {OLLAMA_MODEL} (attempt {attempt + 1})")
                response = await client.post(
                    OLLAMA_URL,
                    json={
                        "model": OLLAMA_MODEL,
                        "prompt": safe_prompt,
                        "stream": False,
                    },
                    timeout=timeout
                )
                response.raise_for_status()
                data = response.json()
                result = data.get("response", "").strip()
                if result:
                    return result
                logger.warning("Ollama returned empty response")
        except (asyncio.TimeoutError, httpx.ConnectError, httpx.HTTPStatusError, json.JSONDecodeError) as e:
            logger.warning(f"Ollama transient failure ({type(e).__name__}): {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error calling Ollama: {type(e).__name__}: {str(e)}")
            break
        await asyncio.sleep(0.6 * (attempt + 1))
    return "[]"
