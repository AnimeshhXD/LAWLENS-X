import json
import asyncio
import logging
import re
from typing import List
from models import Clause, ClauseRisk, Suggestion
from utils.ollama import generate_completion

logger = logging.getLogger(__name__)

class NegotiationAdvisor:
    
    def _accumulate_fallback_suggestions(self, text: str) -> (str, str):
        """Map specific risk types to contextual legal suggestions and combine them."""
        lower = text.lower()
        proposals = []
        rationales = []
        
        if "automatically renew" in lower or "auto-renew" in lower:
            proposals.append("Add a 30-day written notice opt-out window prior to renewal.")
            rationales.append("Prevents accidental lock-in.")
        if "non-refundable" in lower or "no refund" in lower:
            proposals.append("Require a pro-rata refund in the event of termination for cause.")
            rationales.append("Ensures fairness for unrendered services.")
        if "indemn" in lower:
            proposals.append("Cap indemnification strictly to direct damages, excluding gross negligence.")
            rationales.append("Standard market practice.")
        if "unilateral" in lower or "sole discretion" in lower:
            proposals.append("Ensure changes require mutual written consent.")
            rationales.append("Maintains bilateral contract balance.")
            
        if not proposals:
            return "Cap the scope of liabilities and ensure obligations are mutual.", "Minimizes unknown exposures."
            
        return " AND ".join(proposals), " | ".join(rationales)

    async def _advise_single(self, risk: ClauseRisk, clauses: List[Clause], sem: asyncio.Semaphore) -> Suggestion:
        async with sem:
            clause = next((c for c in clauses if c.id == risk.clause_id), None)
            if not clause:
                logger.warning(f"Clause not found for risk {risk.clause_id}")
                return None
            
            fallback_prop, fallback_rat = self._accumulate_fallback_suggestions(clause.text)
            prompt = f"Rewrite to be less risky considering these targets: {fallback_prop}. Return ONLY valid JSON object with 'proposed' and 'rationale'. Clause: {clause.text}"
            
            try:
                resp = await generate_completion(prompt)
                
                # Robust Regex JSON extraction - look for objects specifically
                match = re.search(r'\{.*?\}(?!.*\{)', resp, re.DOTALL)
                clean_resp = match.group(0) if match else "{}"
                
                try:
                    data = json.loads(clean_resp)
                    
                    # Validate required keys
                    if "proposed" not in data or "rationale" not in data:
                        logger.warning(f"JSON missing required keys for {clause.id}, using fallback")
                        raise ValueError("JSON missing required schema keys")
                    
                    return Suggestion(
                        clause_id=clause.id,
                        original=clause.text[:300],  # Limit length
                        proposed=str(data["proposed"])[:300],
                        rationale=str(data["rationale"])[:200]
                    )
                except (json.JSONDecodeError, ValueError, KeyError) as parse_err:
                    logger.warning(f"Advisor JSON parsing failed for {clause.id}: {parse_err}. Using fallback compound strings.")
                    
            except Exception as e:
                logger.error(f"Advisor LLM failed for {clause.id}: {type(e).__name__}: {str(e)}. Using fallback.")
                
            # Fallback suggestion with accumulated rules
            return Suggestion(
                clause_id=clause.id,
                original=clause.text[:300],
                proposed=fallback_prop[:300],
                rationale=fallback_rat[:200]
            )

    async def advise(self, risks: List[ClauseRisk], clauses: List[Clause]) -> List[Suggestion]:
        high_risks = [r for r in risks if r.level in ["High", "Critical"]]
        
        # Use consistent semaphore value across all agents
        sem = asyncio.Semaphore(3)
        tasks = [self._advise_single(risk, clauses, sem) for risk in high_risks]
        
        if not tasks:
            return []
            
        results = await asyncio.gather(*tasks, return_exceptions=False)
        return [r for r in results if r is not None]
