import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json
import asyncio
import base64
import tempfile
import os
from models import AnalysisRequest, AnalysisResponse
from agents.clause_parser import ClauseParser
from agents.risk_analyzer import RiskAnalyzer
from agents.risk_scorer import RiskScorer
from agents.scenario_simulator import ScenarioSimulator
from agents.negotiation_advisor import NegotiationAdvisor

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

def _extract_text_from_upload(req: AnalysisRequest) -> str:
    if req.contract_text and req.contract_text.strip():
        return req.contract_text
    if not req.file_content_base64:
        return ""
    try:
        raw = base64.b64decode(req.file_content_base64)
    except Exception:
        logger.warning("Invalid base64 uploaded, ignoring file payload.")
        return ""

    file_name = (req.file_name or "").lower()
    if file_name.endswith(".txt"):
        return raw.decode("utf-8", errors="ignore")

    if file_name.endswith(".pdf"):
        try:
            import pdfplumber  # type: ignore
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(raw)
                tmp_path = tmp.name
            try:
                pages = []
                with pdfplumber.open(tmp_path) as pdf:
                    for page in pdf.pages:
                        pages.append(page.extract_text() or "")
                return "\n".join(pages).strip()
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        except Exception as e:
            logger.warning(f"PDF extraction failed: {type(e).__name__}: {e}")
            return ""
    return ""

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
            contract_text = _extract_text_from_upload(req)
            if not contract_text.strip():
                yield serialize_event({'error': 'No contract text found. Paste text or upload TXT/PDF.'})
                return

            if len(contract_text) > 250000:
                contract_text = contract_text[:250000]

            yield serialize_event({'stage': 'Parsing clauses...', 'result': None})
            
            clauses = await asyncio.wait_for(parser.parse(contract_text), timeout=45)
            logger.info(f"Parsed {len(clauses)} clauses")
            
            if not clauses:
                yield serialize_event({'error': 'No clauses could be extracted.'})
                return
            
            yield serialize_event({'stage': 'Analyzing risks in parallel...', 'result': None})
            risks = await asyncio.wait_for(analyzer.analyze(clauses), timeout=75)
            logger.info(f"Analyzed {len(risks)} risks")
            
            score = scorer.score(risks)
            logger.info(f"Risk score: {score.overall} ({score.verdict})")
            
            yield serialize_event({'stage': 'Running scenario simulations...', 'result': None})
            sims = []
            if req.user_query and req.user_query.strip():
                sim_res = await asyncio.wait_for(simulator.simulate(clauses, risks, req.user_query), timeout=35)
                if sim_res:
                    sims.append(sim_res)
                    logger.info("Simulation completed")
            
            yield serialize_event({'stage': 'Generating negotiation suggestions...', 'result': None})
            suggestions = await asyncio.wait_for(advisor.advise(risks, clauses), timeout=60)
            logger.info(f"Generated {len(suggestions)} suggestions")

            chat_summary = []
            for r in [x for x in risks if x.level in ("Critical", "High")][:3]:
                if r.label:
                    chat_summary.append(f"⚠️ {r.label}.")
                if r.real_world_risk:
                    chat_summary.append(f"💰 {r.real_world_risk}")
                if r.what_should_user_do:
                    chat_summary.append(f"👉 Ask them to {r.what_should_user_do[0].rstrip('.')}.")
            
            # Build final response - serialize individual components
            final_response = {
                'clauses': [c.dict() for c in clauses],
                'risks': [r.dict() for r in risks],
                'score': score.dict(),
                'simulations': [s.dict() for s in sims] if sims else None,
                'suggestions': [s.dict() for s in suggestions],
                'chat_summary': chat_summary[:8] if chat_summary else None,
                'analysis_meta': {
                    'llm_degraded': any(getattr(r, "analysis_source", "") == "rule_fallback" for r in risks),
                    'legal_disclaimer': "This tool provides risk guidance, not legal advice. Review with qualified counsel before signing.",
                }
            }
            
            yield serialize_event({'stage': 'Complete', 'result': final_response})
            
            logger.info("Analysis completed successfully")
            
        except Exception as e:
            logger.error(f"Execution Error: {type(e).__name__}: {str(e)}", exc_info=True)
            yield serialize_event({'error': f"Analysis failed: {str(e)[:100]}"})

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/analyze")
async def analyze_contract(req: AnalysisRequest):
    """Alias endpoint for test compatibility - redirects to stream endpoint."""
    return await analyze_contract_stream(req)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "LawLens-X"}
