import re
import uuid
import logging
from typing import List
from backend.models import Clause

logger = logging.getLogger(__name__)

class ClauseParser:
    """Agent 1: Extracts clauses from raw contract text using deterministic regex rules."""
    
    async def parse(self, contract_text: str) -> List[Clause]:
        text = contract_text.strip()
        if not text:
            return []
            
        clauses = []
        
        # Regex to split by numbered sections (e.g., 1., 1.1, (a), Article I)
        pattern = r"\n(?:\d+\.\d*|\([a-z]\)|Article\s+[IVXLCDM]+|Section\s+\d+)\s+"
        
        # Split text but keep the delimiter by replacing it, or just use re.split
        # Using a simpler split: we look for double newlines or numbered items
        parts = re.split(pattern, "\n" + text)
        
        for i, part in enumerate(parts):
            clean_part = part.strip()
            if len(clean_part) > 10:  # Ignore empty or tiny artifacts
                clauses.append(Clause(
                    id=str(uuid.uuid4()),
                    text=clean_part,
                    type="General",
                    position=i
                ))
                
        if not clauses:
            # Fallback to paragraph splitting if no numbered sections found
            logger.warning("Regex parser found no sections. Falling back to paragraph split.")
            parts = [p.strip() for p in re.split(r'\n\s*\n', text) if len(p.strip()) > 10]
            for i, part in enumerate(parts):
                clauses.append(Clause(
                    id=str(uuid.uuid4()),
                    text=part,
                    type="General",
                    position=i
                ))
                
        return clauses
