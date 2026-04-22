export interface Clause { id: string; text: string; type: string; position: number; }
export interface ClauseRisk { clause_id: string; level: 'Low' | 'Medium' | 'High' | 'Critical'; reasons: string[]; }
export interface RiskScore { overall: number; breakdown: Record<string, number>; verdict: string; }
export interface SimulationOutcome { scenario: string; impact: string; likelihood: string; }
export interface SimulationResult { scenario: string; outcomes: SimulationOutcome[]; probability_notes: string; }
export interface Suggestion { clause_id: string; original: string; proposed: string; rationale: string; }
export interface AnalysisRequest { contract_text: string; user_query?: string | null; }
export interface AnalysisResponse {
  clauses: Clause[];
  risks: ClauseRisk[];
  score: RiskScore;
  simulations: SimulationResult[] | null;
  suggestions: Suggestion[];
}
