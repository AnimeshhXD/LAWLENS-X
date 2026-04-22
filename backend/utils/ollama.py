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
    """Make real HTTP call to Ollama with robust error handling and fallback."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            logger.info(f"Calling Ollama at {OLLAMA_URL} with model {OLLAMA_MODEL}")
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                },
                timeout=timeout
            )
            response.raise_for_status()
            data = response.json()
            result = data.get("response", "").strip()
            
            if not result:
                logger.warning("Ollama returned empty response")
                return "[]"  # Fallback for JSON parsers
                
            return result
            
    except asyncio.TimeoutError as e:
        logger.error(f"Ollama timeout after {timeout}s: {str(e)}")
        return "[]"  # Safe fallback for JSON extraction
        
    except httpx.ConnectError as e:
        logger.error(f"Failed to connect to Ollama at {OLLAMA_URL}: {str(e)}")
        return "[]"
        
    except httpx.HTTPStatusError as e:
        logger.error(f"Ollama HTTP {e.response.status_code}: {str(e)}")
        return "[]"
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from Ollama: {str(e)}")
        return "[]"
        
    except Exception as e:
        logger.error(f"Unexpected error calling Ollama: {type(e).__name__}: {str(e)}")
        return "[]"
