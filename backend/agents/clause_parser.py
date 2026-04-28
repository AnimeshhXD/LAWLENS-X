import re
import uuid
import logging
from typing import List
from models import Clause
from utils.ollama import generate_completion

logger = logging.getLogger(__name__)

class ClauseParser:
    """Agent 1: Extracts clause-like blocks and assigns intent-aware types."""

    CLAUSE_TYPE_PATTERNS = {
        "Auto-Renewal": [r"\bauto(?:matic(?:ally)?)?\s*renew", r"\brenewal term\b"],
        "Indemnity": [r"\bindemn(?:ify|ity|ification)?\b", r"\bhold harmless\b"],
        "Termination": [r"\btermination\b", r"\bterminate\b", r"\bearly termination\b"],
        "Unilateral Control": [r"\bsole discretion\b", r"\bunilateral(?:ly)?\b", r"\bwithout notice\b"],
        "Exclusivity": [r"\bexclusive(?:ly)?\b", r"\bnon-compete\b", r"\bsole provider\b"],
        "Assignment": [r"\bassign(?:ment)?\b", r"\btransfer\b.*\bagreement\b"],
        "Jurisdiction": [r"\bgoverning law\b", r"\bjurisdiction\b", r"\bvenue\b", r"\barbitration\b"],
        "Confidentiality": [r"\bconfidential(?:ity)?\b", r"\bnon-disclosure\b", r"\bprivacy\b", r"\bpersonal data\b"],
        "Pricing and Payment": [r"\bprice\b", r"\bfees?\b", r"\bpayment terms?\b", r"\bnon-refundable\b"],
        "Service Level": [r"\bservice levels?\b", r"\buptime\b", r"\bperformance\b", r"\bcredits?\b"],
    }

    SECTION_SPLIT_PATTERN = re.compile(
        r"(?im)(?=^(?:\s*(?:section|clause|article)\s+\d+[a-zA-Z0-9\.\-]*[\:\.\)]?|"
        r"\s*\d+(?:\.\d+){0,4}[\)\.]|\s*[A-Z][A-Z \-]{4,}\:|\s*[a-z]\)\s+|\s*-\s+|\s*•\s+))"
    )

    SENTENCE_PATTERN = re.compile(r"(?<=[\.\?\!;])\s+")
    NUMBERED_LINE_PATTERN = re.compile(r"(?im)^\s*((?:section|clause|article)\s+\d+[\w\.\-]*|[a-z]\)|\d+(?:\.\d+){0,3}[\)\.]?)\s+")
    INTENT_PROTOTYPES = {
        "You are financially responsible even if it's not your fault": {"indemn", "hold harmless", "defend claim", "liability"},
        "This contract can renew and keep charging you unless you cancel in time": {"auto renew", "renewal", "notice", "term"},
        "You may not be able to leave this deal without penalties": {"termination", "early termination", "fee", "non-cancellable"},
        "The other side can change terms without your approval": {"sole discretion", "unilateral", "modify", "without notice"},
        "You may be blocked from working with other partners": {"exclusive", "non-compete", "sole provider"},
        "You may have disputes handled in an unfavorable location": {"governing law", "jurisdiction", "venue", "arbitration"},
        "Your pricing can change and increase costs unexpectedly": {"price change", "fee", "cost", "billing"},
    }

    def _infer_clause_type(self, text: str) -> str:
        lower_text = text.lower()
        for clause_type, patterns in self.CLAUSE_TYPE_PATTERNS.items():
            if any(re.search(pattern, lower_text, re.IGNORECASE) for pattern in patterns):
                return clause_type
        return "General"

    def _tokenize(self, text: str) -> set:
        return set(re.findall(r"[a-z]{3,}", text.lower()))

    def _intent_similarity(self, clause_text: str, intent_tokens: set) -> float:
        tokens = self._tokenize(clause_text)
        if not tokens:
            return 0.0
        overlap = len(tokens.intersection(intent_tokens))
        return overlap / max(len(intent_tokens), 1)

    async def infer_clause_intent(self, clause_text: str) -> str:
        best_intent = "General business/legal language with no major user-harm signal"
        best_score = 0.0
        for intent, proto_tokens in self.INTENT_PROTOTYPES.items():
            score = self._intent_similarity(clause_text, proto_tokens)
            if score > best_score:
                best_score = score
                best_intent = intent

        if best_score >= 0.35:
            return best_intent

        prompt = (
            "Return one plain-English sentence describing clause intent for a normal user. "
            "Start with 'You'. Keep under 18 words.\n"
            f"Clause: {clause_text[:1400]}"
        )
        try:
            intent = (await generate_completion(prompt, timeout=18.0)).strip().strip('"')
            if intent:
                return intent[:180]
        except Exception:
            logger.warning("Intent LLM fallback failed, using heuristic intent.")
        return best_intent

    def _semantic_close(self, left: str, right: str) -> bool:
        left_tokens = self._tokenize(left)
        right_tokens = self._tokenize(right)
        if not left_tokens or not right_tokens:
            return False
        overlap = len(left_tokens.intersection(right_tokens))
        ratio = overlap / max(min(len(left_tokens), len(right_tokens)), 1)
        return ratio >= 0.28

    def _merge_related_parts(self, parts: List[str]) -> List[str]:
        if not parts:
            return []
        merged = [parts[0]]
        for part in parts[1:]:
            previous = merged[-1]
            continuation = (
                len(part) < 220
                or not re.search(r"[.!?]$", previous.strip())
                or self._semantic_close(previous, part)
                or bool(self.NUMBERED_LINE_PATTERN.match(part))
                or previous.strip().endswith(":")
            )
            if continuation and len(previous) + len(part) < 1700:
                merged[-1] = f"{previous}\n{part}".strip()
            else:
                merged.append(part)
        return merged
    
    async def parse(self, contract_text: str) -> List[Clause]:
        text = contract_text.strip()
        if not text:
            return []
            
        clauses = []

        # First pass: attempt robust section split from common legal heading styles.
        section_parts = [
            part.strip() for part in self.SECTION_SPLIT_PATTERN.split(text) if len(part.strip()) > 20
        ]

        if not section_parts:
            section_parts = [text]

        expanded_parts: List[str] = []
        for part in section_parts:
            # Contracts sometimes put multiple long sentences in one giant block.
            # Secondary split keeps semantic sentences grouped in manageable chunks.
            if len(part) > 1400:
                sentences = [s.strip() for s in self.SENTENCE_PATTERN.split(part) if len(s.strip()) > 20]
                buffer = ""
                for sentence in sentences:
                    candidate = f"{buffer} {sentence}".strip() if buffer else sentence
                    if len(candidate) > 650 and buffer:
                        expanded_parts.append(buffer.strip())
                        buffer = sentence
                    else:
                        buffer = candidate
                if buffer:
                    expanded_parts.append(buffer.strip())
            else:
                expanded_parts.append(part)

        grouped_parts = self._merge_related_parts(expanded_parts)

        for i, part in enumerate(grouped_parts):
            if len(part) <= 10:
                continue
            clauses.append(Clause(
                id=str(uuid.uuid4()),
                text=part,
                type=self._infer_clause_type(part),
                position=i,
                clause_intent=await self.infer_clause_intent(part)
            ))

        if not clauses:
            logger.warning("Clause parser found no sections. Falling back to paragraph split.")
            parts = [p.strip() for p in re.split(r'\n\s*\n', text) if len(p.strip()) > 10]
            for i, part in enumerate(parts):
                clauses.append(Clause(
                    id=str(uuid.uuid4()),
                    text=part,
                    type=self._infer_clause_type(part),
                    position=i,
                    clause_intent=await self.infer_clause_intent(part)
                ))
                
        return clauses
