export interface Clause {
  id: string;
  text: string;
  type: string;
  position: number;
  clause_intent?: string | null;
}

export interface NegotiationAction {
  action: string;
  priority: 'High' | 'Medium' | 'Low' | string;
  negotiation_line: string;
}

export interface ClauseRisk {
  clause_id: string;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  reasons: string[];
  clause_type?: string | null;
  label?: string | null;
  matched_sentence?: string | null;
  what_this_means?: string | null;
  real_world_risk?: string | null;
  why_company_uses_this?: string | null;
  what_should_user_do?: string[];
  original_clause?: string | null;
  improved_clause?: string | null;
  real_world_scenario?: string | null;
  impact_level?: 'Money Risk' | 'Legal Risk' | 'Lock-in Risk' | 'Control Risk' | string | null;
  negotiation_actions?: NegotiationAction[];
  analysis_source?: 'llm_enriched' | 'rule_fallback' | string | null;
}

export interface RiskScore {
  overall: number;
  breakdown: Record<string, number>;
  penalty_breakdown: Record<string, number>;
  verdict: string;
  reasoning: string;
  what_should_user_do?: string[];
  top_3_risks?: string[];
  should_sign?: boolean;
  confidence_score?: number;
}

export interface SimulationOutcome {
  scenario: string;
  impact: string;
  likelihood: string;
}

export interface SimulationResult {
  scenario: string;
  outcomes: SimulationOutcome[];
  probability_notes: string;
}

export interface Suggestion {
  clause_id: string;
  original: string;
  proposed: string;
  rationale: string;
}

export interface AnalysisRequest {
  contract_text: string;
  user_query?: string | null;
  file_name?: string | null;
  file_content_base64?: string | null;
}

export interface AnalysisResponse {
  clauses: Clause[];
  risks: ClauseRisk[];
  score: RiskScore;
  simulations: SimulationResult[] | null;
  suggestions: Suggestion[];
  chat_summary?: string[] | null;
  analysis_meta?: {
    llm_degraded?: boolean;
    legal_disclaimer?: string;
  } | null;
}
