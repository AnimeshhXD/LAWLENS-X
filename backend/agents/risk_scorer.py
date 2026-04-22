from typing import List
from backend.models import ClauseRisk, RiskScore

class RiskScorer:
    def score(self, risks: List[ClauseRisk]) -> RiskScore:
        breakdown = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        
        has_critical = False
        has_high = False
        
        for r in risks:
            if r.level in breakdown:
                breakdown[r.level] += 1
            if r.level == "Critical":
                has_critical = True
            elif r.level == "High":
                has_high = True
                
        # Fix scoring math: Enforce bounds based on peak severity
        score_val = 100
        
        if has_critical:
            score_val = min(40, 100 - (breakdown["Critical"] * 10))
        elif has_high:
            score_val = min(60, 100 - (breakdown["High"] * 5) - (breakdown["Medium"] * 2))
        else:
            score_val = 100 - (breakdown["Medium"] * 5)
            
        score_val = max(0, score_val)
        
        # Consistent label mapping
        if score_val <= 40:
            verdict = "DANGEROUS: Do Not Sign - Requires Major Revision"
        elif score_val <= 75:
            verdict = "CAUTION: Proceed Carefully - Negotiation Required"
        else:
            verdict = "SAFE: Low Risk Output"
            
        return RiskScore(overall=score_val, breakdown=breakdown, verdict=verdict)
