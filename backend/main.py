import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json
import asyncio
from backend.models import AnalysisRequest, AnalysisResponse
from backend.agents.clause_parser import ClauseParser
from backend.agents.risk_analyzer import RiskAnalyzer
from backend.agents.risk_scorer import RiskScorer
from backend.agents.scenario_simulator import ScenarioSimulator
from backend.agents.negotiation_advisor import NegotiationAdvisor

app = FastAPI(title="LawLens-X API")

# Setup logging to avoid silent failures
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

parser = ClauseParser()
analyzer = RiskAnalyzer()
scorer = RiskScorer()
simulator = ScenarioSimulator()
advisor = NegotiationAdvisor()

@app.post("/api/analyze/stream")
async def analyze_contract_stream(req: AnalysisRequest):
    """Provides SSE streaming to prevent frontend freeze."""
    async def event_generator():
        try:
            yield f"data: {json.dumps({'stage': 'Parsing clauses...', 'result': None})}\n\n"
            clauses = await parser.parse(req.contract_text)
            
            if not clauses:
                yield f"data: {json.dumps({'error': 'No clauses could be extracted.'})}\n\n"
                return
            
            yield f"data: {json.dumps({'stage': 'Analyzing risks parallely...', 'result': None})}\n\n"
            risks = await analyzer.analyze(clauses)
            score = scorer.score(risks)
            
            yield f"data: {json.dumps({'stage': 'Running scenarios & insights...', 'result': None})}\n\n"
            sims = []
            if req.user_query:
                sim_res = await simulator.simulate(clauses, risks, req.user_query)
                if sim_res: sims.append(sim_res)
                
            suggestions = await advisor.advise(risks, clauses)
            
            final_data = AnalysisResponse(
                clauses=clauses,
                risks=risks,
                score=score,
                simulations=sims,
                suggestions=suggestions
            )
            
            yield f"data: {json.dumps({'stage': 'Complete', 'result': final_data.dict()})}\n\n"
            
        except Exception as e:
            logger.error(f"Execution Error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
