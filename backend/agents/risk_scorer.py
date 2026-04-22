from typing import List
from backend.models import ClauseRisk, RiskScore

class RiskScorer:
    def score(self, risks: List[ClauseRisk]) -> RiskScore:
        breakdown = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        
        for r in risks:
            if r.level in breakdown:
                breakdown[r.level] += 1

        # Weights
        weights = {
            "Critical": 25,
            "High": 15,
            "Medium": 8,
            "Low": 3
        }

        # Track penalty contributions for explainability
        penalty_breakdown = {
            "Critical": breakdown["Critical"] * weights["Critical"],
            "High": breakdown["High"] * weights["High"],
            "Medium": breakdown["Medium"] * weights["Medium"],
            "Low": breakdown["Low"] * weights["Low"],
            "escalation": 0,
            "diversity": 0
        }

        # Severity escalation (real risk amplification)
        if breakdown["Critical"] >= 2:
            penalty_breakdown["escalation"] = 10

        # Controlled diversity penalty (only if wide spread)
        active_levels = sum(1 for v in breakdown.values() if v > 0)
        if active_levels >= 3:
            penalty_breakdown["diversity"] = 4  # small bump, not overkill

        # Compute total penalty from breakdown
        total_penalty = sum(penalty_breakdown.values())

        # Final cap (after everything)
        total_penalty = min(total_penalty, 60)

        # Final score
        score_val = max(0, 100 - total_penalty)

        # Generate reasoning string
        reasoning = self._generate_reasoning(breakdown, penalty_breakdown, risks)

        # Verdict mapping
        if score_val < 55:
            verdict = "DANGEROUS: Do Not Sign - Requires Major Revision"
        elif score_val < 75:
            verdict = "CAUTION: Proceed Carefully - Negotiation Required"
        else:
            verdict = "SAFE: Low Risk Output"

        return RiskScore(
            overall=score_val,
            breakdown=breakdown,
            penalty_breakdown=penalty_breakdown,
            verdict=verdict,
            reasoning=reasoning
        )
    
    def _generate_reasoning(self, breakdown: dict, penalty_breakdown: dict, risks: List[ClauseRisk] = None) -> str:
        """
        Generate context-aware human-readable reasoning for the score.
        
        Args:
            breakdown: Risk level counts
            penalty_breakdown: Penalty contributions
            risks: List of ClauseRisk objects for context analysis
            
        Returns:
            Reasoning string explaining the score in natural language
        """
        # Risk keyword to explanation mapping
        risk_explanations = {
            "indemnification": "increases financial liability exposure",
            "liability": "limits the company's accountability",
            "auto-renew": "restricts exit flexibility",
            "renewal": "restricts exit flexibility",
            "non-refundable": "creates financial lock-in",
            "refundable": "creates financial lock-in",
            "unilateral": "allows one-sided contract changes",
            "termination": "creates early exit constraints",
            "penalty": "imposes financial consequences",
            "exclusive": "limits business flexibility",
            "confidential": "restricts information sharing",
            "assignment": "affects contract transfer rights",
            "governing": "impacts legal jurisdiction",
            "warranty": "creates guarantee obligations",
            "force majeure": "limits liability for unforeseen events"
        }
        
        # Extract context from risk reasons
        context_fragments = []
        if risks:
            for risk in risks:
                if risk.level in ["Critical", "High"]:  # Focus on significant risks
                    for reason in risk.reasons:
                        reason_lower = reason.lower()
                        for keyword, explanation in risk_explanations.items():
                            if keyword in reason_lower:
                                context_fragments.append(explanation)
                                break  # Take first match per reason
        
        # Remove duplicates while preserving order
        unique_fragments = []
        seen = set()
        for fragment in context_fragments:
            if fragment not in seen:
                unique_fragments.append(fragment)
                seen.add(fragment)
        
        # Build natural reasoning
        if unique_fragments:
            if len(unique_fragments) == 1:
                reasoning = unique_fragments[0].capitalize() + "."
            elif len(unique_fragments) == 2:
                reasoning = f"{unique_fragments[0]}, while {unique_fragments[1]}."
            else:
                # Join first 2-3 fragments naturally
                main_fragments = unique_fragments[:3]
                reasoning = ", ".join(main_fragments[:-1]) + f", and {main_fragments[-1]}."
        else:
            # Fallback to generic reasoning based on severity
            if breakdown["Critical"] > 0:
                reasoning = "Critical clauses require immediate legal review and revision."
            elif breakdown["High"] > 0:
                reasoning = "High-risk terms need careful negotiation before signing."
            elif breakdown["Medium"] > 0:
                reasoning = "Moderate risks should be reviewed and clarified."
            else:
                reasoning = "Contract terms appear favorable with minimal risk exposure."
        
        return reasoning
