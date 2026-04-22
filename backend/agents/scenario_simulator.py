import json
import logging
import re
from typing import List
from backend.models import Clause, ClauseRisk, SimulationResult, SimulationOutcome
from backend.utils.ollama import generate_completion

logger = logging.getLogger(__name__)

class ScenarioSimulator:
    async def simulate(self, clauses: List[Clause], risks: List[ClauseRisk], query: str) -> SimulationResult:
        if not query:
            return None
            
        high_risk_ids = [r.clause_id for r in sorted(risks, key=lambda x: self._severity_int(x.level), reverse=True)[:3]]
        relevant_clauses = [c for c in clauses if c.id in high_risk_ids]
        condensed_text = "\n\n".join([c.text for c in relevant_clauses])
            
        prompt = f"""
        User query: "{query}"
        Based ONLY on the critical clauses provided below, simulate potential outcomes.
        Return ONLY valid JSON with keys 'scenario' (str), 'outcomes' (list of dicts with 'scenario', 'impact', 'likelihood'), and 'probability_notes' (str).
        
        Critical Clauses:
        {condensed_text}
        """
        
        try:
            resp = await generate_completion(prompt)
            
            # Robust Regex JSON extraction
            match = re.search(r'\{.*\}', resp, re.DOTALL)
            clean_resp = match.group(0) if match else "{}"
            
            data = json.loads(clean_resp)
            outcomes = [SimulationOutcome(**o) for o in data.get("outcomes", [])]
            return SimulationResult(
                scenario=data.get("scenario", query), 
                outcomes=outcomes, 
                probability_notes=data.get("probability_notes", "")
            )
        except Exception as e:
            logger.error(f"Simulator LLM execution failed: {str(e)}")
            return SimulationResult(
                scenario=query, 
                outcomes=[SimulationOutcome(scenario="System Default Simulation", impact="Financial Lock-in risk detected. Unable to fully verify via AI.", likelihood="Medium/High")],
                probability_notes="Simulation degraded. Manual review required."
            )

    def _severity_int(self, level: str) -> int:
        mapping = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
        return mapping.get(level, 0)
