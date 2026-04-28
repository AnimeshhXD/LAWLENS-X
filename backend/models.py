from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Literal

class Clause(BaseModel):
    id: str
    text: str
    type: str
    position: int
    clause_intent: Optional[str] = None

class ClauseRisk(BaseModel):
    clause_id: str
    level: Literal["Low", "Medium", "High", "Critical"]
    reasons: List[str]
    clause_type: Optional[str] = None
    label: Optional[str] = None
    matched_sentence: Optional[str] = None
    what_this_means: Optional[str] = None
    real_world_risk: Optional[str] = None
    why_company_uses_this: Optional[str] = None
    what_should_user_do: List[str] = Field(default_factory=list)
    original_clause: Optional[str] = None
    improved_clause: Optional[str] = None
    real_world_scenario: Optional[str] = None
    impact_level: Optional[Literal["Money Risk", "Legal Risk", "Lock-in Risk", "Control Risk"]] = None
    negotiation_actions: List[Dict[str, str]] = Field(default_factory=list)
    analysis_source: Optional[Literal["llm_enriched", "rule_fallback"]] = None

class RiskScore(BaseModel):
    overall: int = Field(ge=0, le=100)
    breakdown: Dict[str, int]
    penalty_breakdown: Dict[str, int]
    verdict: str
    reasoning: str
    what_should_user_do: List[str] = Field(default_factory=list)
    top_3_risks: List[str] = Field(default_factory=list)
    should_sign: bool = True
    confidence_score: int = Field(default=80, ge=0, le=100)

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
    file_name: Optional[str] = None
    file_content_base64: Optional[str] = None

class AnalysisResponse(BaseModel):
    clauses: List[Clause]
    risks: List[ClauseRisk]
    score: RiskScore
    simulations: Optional[List[SimulationResult]] = None
    suggestions: List[Suggestion]
    chat_summary: Optional[List[str]] = None
    analysis_meta: Optional[Dict[str, Any]] = None
