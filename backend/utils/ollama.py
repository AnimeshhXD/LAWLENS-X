import httpx
import json
import os
import logging
import asyncio

from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

logger = logging.getLogger(__name__)

# SYSTEM PROMPT for LLaMA model
SYSTEM_PROMPT = """
You are a legal contract risk analysis AI.

Analyze the contract and return structured JSON.

Rules:
- Identify risky clauses
- Assign level: Critical, High, Medium, Low
- Provide reasons
- Suggest negotiation improvements
- DO NOT hallucinate
- ONLY return valid JSON

Format:
{
  "risks": [
    {
      "clause": "...",
      "level": "High",
      "reasons": ["..."]
    }
  ],
  "suggestions": [
    {
      "original": "...",
      "proposed": "...",
      "rationale": "..."
    }
  ]
}

Contract to analyze:
"""

def _extract_json_from_text(text: str) -> str:
    """Extract JSON from text that may contain extra content."""
    try:
        first_brace = text.find('{')
        last_brace = text.rfind('}')
        
        if first_brace == -1 or last_brace == -1 or first_brace >= last_brace:
            return text  # Return original if braces not found
        
        return text[first_brace:last_brace + 1]
    except Exception:
        return text  # Return original on any error

def _ensure_response_shape(data: dict) -> dict:
    """Ensure response has required structure."""
    if not isinstance(data, dict):
        return {"risks": [], "suggestions": []}
    
    if "risks" not in data or not isinstance(data["risks"], list):
        data["risks"] = []
    
    if "suggestions" not in data or not isinstance(data["suggestions"], list):
        data["suggestions"] = []
    
    return data

async def _make_ollama_request(prompt: str, timeout: float = 30.0) -> str:
    """Make single Ollama request with timeout and fallback."""
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
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
            return data.get("response", "").strip()
            
    except Exception as e:
        logger.error(f"Ollama request failed: {type(e).__name__}: {str(e)}")
        return None  # Signal failure

async def generate_completion(prompt: str, timeout: float = 60.0) -> str:
    """Generate completion with hardened error handling and retry logic."""
    
    # Performance safety - limit input size
    prompt = prompt[:8000]
    
    # Add logging
    print(f"[OLLAMA] Model: {OLLAMA_MODEL}")
    
    # Construct full prompt with system instructions
    full_prompt = SYSTEM_PROMPT + prompt
    
    # First attempt
    print("[OLLAMA] Response received")
    result = await _make_ollama_request(full_prompt, timeout=30.0)
    
    if result is None:
        logger.warning("Ollama request failed, using fallback")
        return '{"risks": [], "suggestions": []}'
    
    if not result:
        logger.warning("Ollama returned empty response, using fallback")
        return '{"risks": [], "suggestions": []}'
    
    # Try to extract clean JSON
    json_text = _extract_json_from_text(result)
    
    # Try to parse JSON
    try:
        parsed = json.loads(json_text)
        parsed = _ensure_response_shape(parsed)
        return json.dumps(parsed)
    except json.JSONDecodeError:
        logger.warning("Invalid JSON from Ollama, retrying with stricter prompt")
        
        # Retry with stricter prompt
        retry_prompt = "Return ONLY valid JSON. No explanation.\n\n" + prompt
        retry_result = await _make_ollama_request(retry_prompt, timeout=30.0)
        
        if retry_result is None:
            logger.warning("Retry failed, using fallback")
            return '{"risks": [], "suggestions": []}'
        
        # Try parsing retry result
        retry_json = _extract_json_from_text(retry_result)
        try:
            parsed = json.loads(retry_json)
            parsed = _ensure_response_shape(parsed)
            return json.dumps(parsed)
        except json.JSONDecodeError:
            logger.warning("Retry also failed, using fallback")
            return '{"risks": [], "suggestions": []}'
    
    except Exception as e:
        logger.error(f"Unexpected error in generate_completion: {type(e).__name__}: {str(e)}")
        return '{"risks": [], "suggestions": []}'
