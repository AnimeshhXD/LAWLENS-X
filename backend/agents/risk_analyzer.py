import json
import asyncio
import logging
import re
from typing import List
from backend.models import Clause, ClauseRisk
from backend.utils.ollama import generate_completion

logger = logging.getLogger(__name__)

class RiskAnalyzer:
    
    def _evaluate_rules(self, text: str) -> (str, List[str]):
        """Deterministically evaluates text against a comprehensive risk pattern engine."""
        lower_text = text.lower()
        level_floor = "Low"
        reasons = []

        if "indemn" in lower_text:
            reasons.append("Contains indemnification language.")
            level_floor = max(level_floor, "High", key=self._severity_int)
        if "liability" in lower_text and "limit" not in lower_text:
            reasons.append("Potential unlimited liability exposure.")
            level_floor = max(level_floor, "Critical", key=self._severity_int)
        if "automatically renew" in lower_text or "auto-renew" in lower_text:
            reasons.append("Auto-renewal clause restricts exit capability.")
            level_floor = max(level_floor, "High", key=self._severity_int)
        if "non-refundable" in lower_text or "no refund" in lower_text:
            reasons.append("Strictly non-refundable, increasing financial risk.")
            level_floor = max(level_floor, "Medium", key=self._severity_int)
        if "sole discretion" in lower_text or "unilateral" in lower_text:
            reasons.append("Allows unilateral changes by the counterparty.")
            level_floor = max(level_floor, "High", key=self._severity_int)

        return level_floor, reasons

    def _severity_int(self, level: str) -> int:
        mapping = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
        return mapping.get(level, 0)

    async def _analyze_single_clause(self, clause: Clause, sem: asyncio.Semaphore) -> ClauseRisk:
        async with sem:
            level, reasons = self._evaluate_rules(clause.text)
            prompt = f"Analyze this contract clause for risks. Return ONLY a valid JSON array of short reason strings. Clause: {clause.text}"
            
            try:
                resp = await generate_completion(prompt)
                
                # Robust Regex JSON extraction to ignore LLM chatting
                match = re.search(r'\[.*\]|\{.*\}', resp, re.DOTALL)
                clean_resp = match.group(0) if match else "[]"
                
                extra_reasons = json.loads(clean_resp)
                if isinstance(extra_reasons, list):
                    reasons.extend(extra_reasons[:2]) 
                    if len(reasons) > 2 and level == "Low":
                        level = "Medium"
            except Exception as e:
                logger.warning(f"LLM risk enrichment failed for clause {clause.id}: {str(e)}. Using rule fallbacks.")

            if not reasons:
                reasons.append("Standard verbiage. Low inherent risk.")

            return ClauseRisk(clause_id=clause.id, level=level, reasons=reasons)

    async def analyze(self, clauses: List[Clause]) -> List[ClauseRisk]:
        """Runs analysis in parallel with strict concurrency limits to prevent Ollama overflow."""
        sem = asyncio.Semaphore(3)
        tasks = [self._analyze_single_clause(clause, sem) for clause in clauses]
        risks = await asyncio.gather(*tasks)
        return list(risks)
