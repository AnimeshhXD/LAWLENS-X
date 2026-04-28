from typing import List
from models import ClauseRisk, RiskScore

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
        total_penalty = min(total_penalty, 95)

        # Final score
        score_val = max(0, 100 - total_penalty)

        # Consistency enforcement - ensure score reflects risk severity
        if breakdown["Critical"] > 0:
            score_val = min(score_val, 60)
        if breakdown["High"] > 0:
            score_val = min(score_val, 75)

        # Generate reasoning string
        reasoning = self._generate_reasoning(breakdown, penalty_breakdown, risks)
        actions = self._build_global_actions(risks)
        top_3_risks = self._top_risk_summaries(risks)
        llm_enriched_ratio = self._llm_enriched_ratio(risks)
        confidence = self._confidence_score(breakdown, llm_enriched_ratio)
        should_sign = breakdown["Critical"] == 0 and not (breakdown["High"] >= 2 and breakdown["Medium"] >= 1)

        # Verdict mapping
        if score_val < 40:
            verdict = "DANGEROUS: Do Not Sign - Requires Major Revision"
        elif score_val < 60:
            verdict = "RISKY: Significant Concerns - Negotiate Terms"
        elif score_val < 80:
            verdict = "CAUTION: Proceed Carefully - Negotiation Required"
        else:
            verdict = "SAFE: Low Risk Output"

        return RiskScore(
            overall=score_val,
            breakdown=breakdown,
            penalty_breakdown=penalty_breakdown,
            verdict=verdict,
            reasoning=reasoning,
            what_should_user_do=actions,
            top_3_risks=top_3_risks,
            should_sign=should_sign,
            confidence_score=confidence
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
            "indemnification": "You may be financially responsible even if you are not at fault",
            "liability": "The other side may avoid responsibility while your risk stays open",
            "auto-renew": "You can get billed again unless you cancel in time",
            "renewal": "You can get locked into another contract period",
            "non-refundable": "You might lose prepaid money if the deal ends early",
            "refundable": "Your ability to recover payments may be limited",
            "unilateral": "One side can change terms without your approval",
            "termination": "It may be expensive or difficult for you to exit",
            "penalty": "You may owe extra fees on top of normal payments",
            "exclusive": "You could be blocked from working with other partners"
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

    def _build_global_actions(self, risks: List[ClauseRisk]) -> List[str]:
        if not risks:
            return []
        actions = []
        for risk in risks:
            for action in getattr(risk, "what_should_user_do", []) or []:
                if action and action not in actions:
                    actions.append(action)
        return actions[:6]

    def _top_risk_summaries(self, risks: List[ClauseRisk]) -> List[str]:
        ordered = sorted(risks, key=lambda r: {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}.get(r.level, 0), reverse=True)
        summaries = []
        for risk in ordered:
            summary = (getattr(risk, "real_world_scenario", None) or (risk.reasons[0] if risk.reasons else "")).strip()
            if summary and summary not in summaries:
                summaries.append(summary[:120])
            if len(summaries) >= 3:
                break
        return summaries

    def _confidence_score(self, breakdown: dict, llm_enriched_ratio: float) -> int:
        confidence = 92
        confidence -= breakdown.get("Critical", 0) * 25
        confidence -= breakdown.get("High", 0) * 12
        confidence -= breakdown.get("Medium", 0) * 6
        if breakdown.get("High", 0) > 0 and breakdown.get("Medium", 0) > 0:
            confidence -= 8
        if llm_enriched_ratio < 0.5:
            confidence -= 12
        return max(5, min(100, confidence))

    def _llm_enriched_ratio(self, risks: List[ClauseRisk]) -> float:
        if not risks:
            return 1.0
        enriched = sum(1 for r in risks if getattr(r, "analysis_source", None) == "llm_enriched")
        return enriched / len(risks)
