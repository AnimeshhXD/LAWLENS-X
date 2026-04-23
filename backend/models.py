from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Literal

class Clause(BaseModel):
    id: str
    text: str
    type: str
    position: int

class ClauseRisk(BaseModel):
    clause_id: str
    level: Literal["Low", "Medium", "High", "Critical"]
    reasons: List[str]

class RiskScore(BaseModel):
    overall: int = Field(ge=0, le=100)
    breakdown: Dict[str, int]
    penalty_breakdown: Dict[str, int]
    verdict: str
    reasoning: str

class SimulationOutcome(BaseModel):
    scenario: str
    impact: str
    likelihood: str

class SimulationResult(BaseModel):
    scenario: str
    outcomes: List[SimulationOutcome]
    probability_notes: str

class Suggestion(BaseModel):
    clause_id: str
    original: str
    proposed: str
    rationale: str

class AnalysisRequest(BaseModel):
    contract_text: str
    user_query: Optional[str] = None

class AnalysisResponse(BaseModel):
    clauses: List[Clause]
    risks: List[ClauseRisk]
    score: RiskScore
    simulations: Optional[List[SimulationResult]] = None
    suggestions: List[Suggestion]
