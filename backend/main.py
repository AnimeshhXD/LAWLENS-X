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

def serialize_event(data: dict) -> str:
    """Safely serialize data to SSE format with proper newlines."""
    try:
        json_str = json.dumps(data, default=str)
        return f"data: {json_str}\n\n"
    except Exception as e:
        logger.error(f"Serialization error: {str(e)}")
        return f"data: {json.dumps({'error': 'Serialization failed'})}\n\n"

@app.post("/api/analyze/stream")
async def analyze_contract_stream(req: AnalysisRequest):
    """Provides SSE streaming to prevent frontend freeze."""
    async def event_generator():
        try:
            yield serialize_event({'stage': 'Parsing clauses...', 'result': None})
            
            clauses = await parser.parse(req.contract_text)
            logger.info(f"Parsed {len(clauses)} clauses")
            
            if not clauses:
                yield serialize_event({'error': 'No clauses could be extracted.'})
                return
            
            yield serialize_event({'stage': 'Analyzing risks in parallel...', 'result': None})
            risks = await analyzer.analyze(clauses)
            logger.info(f"Analyzed {len(risks)} risks")
            
            score = scorer.score(risks)
            logger.info(f"Risk score: {score.overall} ({score.verdict})")
            
            yield serialize_event({'stage': 'Running scenario simulations...', 'result': None})
            sims = []
            if req.user_query and req.user_query.strip():
                sim_res = await simulator.simulate(clauses, risks, req.user_query)
                if sim_res:
                    sims.append(sim_res)
                    logger.info("Simulation completed")
            
            yield serialize_event({'stage': 'Generating negotiation suggestions...', 'result': None})
            suggestions = await advisor.advise(risks, clauses)
            logger.info(f"Generated {len(suggestions)} suggestions")
            
            # Build final response - serialize individual components
            final_response = {
                'clauses': [c.dict() for c in clauses],
                'risks': [r.dict() for r in risks],
                'score': score.dict(),
                'simulations': [s.dict() for s in sims] if sims else [],
                'suggestions': [s.dict() for s in suggestions]
            }
            
            yield serialize_event({'stage': 'Complete', 'result': final_response})
            
            logger.info("Analysis completed successfully")
            
        except Exception as e:
            logger.error(f"Execution Error: {type(e).__name__}: {str(e)}", exc_info=True)
            yield serialize_event({'error': f"Analysis failed: {str(e)[:100]}"})

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "LawLens-X"}
