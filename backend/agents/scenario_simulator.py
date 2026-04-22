import json
import logging
import re
from typing import List
from backend.models import Clause, ClauseRisk, SimulationResult, SimulationOutcome
from backend.utils.ollama import generate_completion

logger = logging.getLogger(__name__)

class ScenarioSimulator:
    async def simulate(self, clauses: List[Clause], risks: List[ClauseRisk], query: str) -> SimulationResult:
        if not query or not query.strip():
            return None
            
        high_risk_ids = [r.clause_id for r in sorted(risks, key=lambda x: self._severity_int(x.level), reverse=True)[:3]]
        relevant_clauses = [c for c in clauses if c.id in high_risk_ids]
        
        if not relevant_clauses:
            # Fallback if no high-risk clauses found
            relevant_clauses = clauses[:2] if len(clauses) >= 2 else clauses
            
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
            
            # Robust Regex JSON extraction - look for objects specifically
            match = re.search(r'\{.*?\}(?!.*\{)', resp, re.DOTALL)
            clean_resp = match.group(0) if match else "{}"
            
            try:
                data = json.loads(clean_resp)
                
                # Validate structure before building response
                outcomes_list = data.get("outcomes", [])
                if not isinstance(outcomes_list, list):
                    outcomes_list = []
                    
                valid_outcomes = []
                for o in outcomes_list:
                    if isinstance(o, dict) and "scenario" in o and "impact" in o and "likelihood" in o:
                        valid_outcomes.append(SimulationOutcome(**o))
                
                if not valid_outcomes:
                    # Fallback outcome if parsing fails
                    valid_outcomes = [SimulationOutcome(
                        scenario="System Default Simulation",
                        impact="Analysis required - LLM response invalid",
                        likelihood="Unknown"
                    )]
                
                return SimulationResult(
                    scenario=str(data.get("scenario", query))[:200],  # Limit length
                    outcomes=valid_outcomes,
                    probability_notes=str(data.get("probability_notes", ""))[:200]
                )
            except (json.JSONDecodeError, ValueError) as parse_err:
                logger.error(f"Simulator JSON parsing failed: {parse_err}. Using fallback.")
                
        except Exception as e:
            logger.error(f"Simulator LLM execution failed: {type(e).__name__}: {str(e)}")
            
        # Fallback response
        return SimulationResult(
            scenario=query,
            outcomes=[SimulationOutcome(
                scenario="System Fallback Simulation",
                impact="Financial lock-in risk detected. Unable to fully verify via LLM.",
                likelihood="Medium"
            )],
            probability_notes="Simulation degraded. Manual review recommended."
        )

    def _severity_int(self, level: str) -> int:
        mapping = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
        return mapping.get(level, 0)
