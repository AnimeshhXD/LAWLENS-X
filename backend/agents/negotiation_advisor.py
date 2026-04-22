import json
import asyncio
import logging
import re
from typing import List
from backend.models import Clause, ClauseRisk, Suggestion
from backend.utils.ollama import generate_completion

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
            if not clause: return None
            
            fallback_prop, fallback_rat = self._accumulate_fallback_suggestions(clause.text)
            prompt = f"Rewrite to be less risky considering these targets: {fallback_prop}. Return ONLY valid JSON object with 'proposed' and 'rationale'. Clause: {clause.text}"
            
            try:
                resp = await generate_completion(prompt)
                
                # Robust Regex JSON extraction
                match = re.search(r'\{.*\}', resp, re.DOTALL)
                clean_resp = match.group(0) if match else "{}"
                
                data = json.loads(clean_resp)
                if "proposed" not in data or "rationale" not in data:
                    raise ValueError("JSON missing required schema keys")
                    
                return Suggestion(
                    clause_id=clause.id,
                    original=clause.text,
                    proposed=data["proposed"],
                    rationale=data["rationale"]
                )
            except Exception as e:
                logger.error(f"Advisor LLM failed for {clause.id}: {str(e)}. Using fallback compound strings.")
                return Suggestion(
                    clause_id=clause.id, 
                    original=clause.text, 
                    proposed=fallback_prop, 
                    rationale=fallback_rat
                )

    async def advise(self, risks: List[ClauseRisk], clauses: List[Clause]) -> List[Suggestion]:
        high_risks = [r for r in risks if r.level in ["High", "Critical"]]
        sem = asyncio.Semaphore(5)
        tasks = [self._advise_single(risk, clauses, sem) for risk in high_risks]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]
