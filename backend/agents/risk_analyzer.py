import json
import asyncio
import logging
import re
from typing import List, Dict, Any
from models import Clause, ClauseRisk
from utils.ollama import generate_completion

logger = logging.getLogger(__name__)

class RiskAnalyzer:
    SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[\.\!\?;])\s+")

    RISK_TAXONOMY = [
        {
            "type": "Auto-Renewal",
            "label": "🔁 Subscription Trap",
            "severity": "High",
            "patterns": [
                r"\bauto(?:matic(?:ally)?)?\s*renew",
                r"\brenew(?:al)?\s+term\b",
                r"\bunless (?:either party )?provides? notice\b"
            ],
            "reason": "The contract can renew by default unless you cancel in time.",
            "what_this_means": "You may be charged again automatically even if you forget to cancel.",
            "real_world_risk": "Recurring payments and lock-in can continue for another term.",
            "why_company_uses_this": "It keeps customer retention and protects predictable revenue.",
            "actions": ["Remove auto-renew clause", "Add clear notice window", "Allow cancellation before renewal"],
            "impact_level": "Lock-in Risk",
            "real_world_scenario": "Your subscription renews silently and you pay for another term you did not plan for.",
        },
        {
            "type": "Indemnity",
            "label": "💸 You Pay for Damages",
            "severity": "Critical",
            "patterns": [r"\bindemn(?:ify|ity|ification)?\b", r"\bhold harmless\b", r"\bdefend\b.*\bclaim"],
            "reason": "You can be responsible for legal claims, costs, or losses.",
            "what_this_means": "You may have to pay legal costs even when another party caused the issue.",
            "real_world_risk": "Unexpected lawsuits can become your financial burden.",
            "why_company_uses_this": "It shifts legal and operational risk away from the drafting party.",
            "actions": ["Cap indemnity exposure", "Limit to direct damages", "Add mutual indemnity obligations"],
            "impact_level": "Money Risk",
            "real_world_scenario": "If the service fails, you still pay damages and legal costs without a practical cap.",
        },
        {
            "type": "Termination Restriction",
            "label": "🚪 Hard to Exit",
            "severity": "High",
            "patterns": [r"\bearly termination\b", r"\btermination fee\b", r"\bfor convenience\b", r"\bnon-cancellable\b"],
            "reason": "The contract limits your ability to leave without penalties.",
            "what_this_means": "You may owe fees or stay locked in even if the deal stops working for you.",
            "real_world_risk": "Leaving a bad contract can become expensive and slow.",
            "why_company_uses_this": "It protects long-term revenue and discourages churn.",
            "actions": ["Add termination for convenience", "Reduce termination penalties", "Define fair exit conditions"],
            "impact_level": "Lock-in Risk",
            "real_world_scenario": "You discover poor service quality but still cannot exit without paying heavy fees.",
        },
        {
            "type": "Unilateral Control",
            "label": "⚠️ One-Sided Control",
            "severity": "High",
            "patterns": [r"\bsole discretion\b", r"\bunilateral(?:ly)?\b", r"\bmay modify\b.*\bwithout notice\b"],
            "reason": "One party can change important terms without your consent.",
            "what_this_means": "Rules can change after signing and you may have little power to object.",
            "real_world_risk": "Pricing, scope, or obligations can shift against your interests mid-contract.",
            "why_company_uses_this": "It gives operational flexibility and negotiation leverage.",
            "actions": ["Require mutual written consent for material changes", "Add advance notice requirement", "Add right to terminate after major changes"],
            "impact_level": "Control Risk",
            "real_world_scenario": "Pricing and obligations can change after signature while you remain bound.",
        },
        {
            "type": "Exclusivity",
            "label": "🚫 Locked Vendor Choice",
            "severity": "High",
            "patterns": [r"\bexclusive(?:ly)?\b", r"\bsole provider\b", r"\bnon-compete\b"],
            "reason": "The contract can stop you from using competitors or alternate vendors.",
            "what_this_means": "You may lose flexibility to switch providers even if performance drops.",
            "real_world_risk": "Dependence on one vendor can increase cost and operational risk.",
            "why_company_uses_this": "It protects market share and customer retention.",
            "actions": ["Limit exclusivity scope", "Add performance exit triggers", "Allow approved alternative vendors"],
            "impact_level": "Lock-in Risk",
            "real_world_scenario": "Your provider underperforms but your team is contractually blocked from switching.",
        },
        {
            "type": "Assignment Restriction",
            "label": "🔗 Transfer Block",
            "severity": "Medium",
            "patterns": [r"\bassign(?:ment)?\b", r"\bmay not transfer\b", r"\bwithout prior written consent\b"],
            "reason": "You may not be able to transfer the contract during restructuring or M&A.",
            "what_this_means": "Corporate changes could trigger contract breach risk.",
            "real_world_risk": "Deals and reorganizations can be delayed by consent requirements.",
            "why_company_uses_this": "It lets the counterparty control who they contract with.",
            "actions": ["Allow assignment to affiliates", "Permit transfer in merger/acquisition", "Define response timeline for consent"],
            "impact_level": "Control Risk",
            "real_world_scenario": "A merger closes, but this contract cannot move to the new legal entity quickly.",
        },
        {
            "type": "Jurisdiction / Dispute",
            "label": "⚖️ Costly Dispute Venue",
            "severity": "Medium",
            "patterns": [r"\bgoverning law\b", r"\bexclusive jurisdiction\b", r"\bvenue\b", r"\barbitration\b"],
            "reason": "Disputes may need to be resolved in a location or process that disadvantages you.",
            "what_this_means": "You could face higher legal cost and slower dispute resolution.",
            "real_world_risk": "Enforcement and litigation can become expensive and operationally disruptive.",
            "why_company_uses_this": "It ensures disputes are heard in a forum favorable to them.",
            "actions": ["Set neutral governing law", "Use mutually convenient venue", "Add mediation before arbitration"],
            "impact_level": "Legal Risk",
            "real_world_scenario": "A dispute forces your team into an out-of-country arbitration process.",
        },
        {
            "type": "Change Control / Price Increase",
            "label": "📈 Surprise Cost Changes",
            "severity": "High",
            "patterns": [r"\bmay change\b.*\bfees?\b", r"\bprice(?:s)? may be updated\b", r"\bchange order\b", r"\badditional charges?\b"],
            "reason": "Pricing or scope can change in ways that increase your costs.",
            "what_this_means": "You may pay more than expected after signing.",
            "real_world_risk": "Budget overruns can happen without clear approval steps.",
            "why_company_uses_this": "It preserves pricing flexibility when delivery scope shifts.",
            "actions": ["Require written approval for price changes", "Cap annual fee increase", "Define change-order workflow"],
            "impact_level": "Money Risk",
            "real_world_scenario": "Project scope expands informally and monthly invoices jump unexpectedly.",
        },
        {
            "type": "SLA / Performance Penalty Gap",
            "label": "📉 Weak Service Guarantees",
            "severity": "High",
            "patterns": [r"\bas is\b", r"\bno warranty\b", r"\bservice level\b", r"\buptime\b", r"\bcredits?\b"],
            "reason": "Service commitments may be weak or missing when performance fails.",
            "what_this_means": "You may keep paying even if service quality drops.",
            "real_world_risk": "Operational failures can hurt your business with limited remedies.",
            "why_company_uses_this": "It limits their liability and exposure to credits or penalties.",
            "actions": ["Add measurable SLA targets", "Include service credits", "Add termination right for repeated SLA breach"],
            "impact_level": "Money Risk",
            "real_world_scenario": "System uptime drops below acceptable levels, but contract gives no meaningful compensation.",
        },
    ]

    def _split_sentences(self, text: str) -> List[str]:
        sentences = [s.strip() for s in self.SENTENCE_SPLIT_PATTERN.split(text) if len(s.strip()) > 15]
        return sentences or [text.strip()]

    def _evaluate_rules(self, text: str) -> Dict[str, Any]:
        best_match = None

        for rule in self.RISK_TAXONOMY:
            matched_sentence = None
            for sentence in self._split_sentences(text):
                if any(re.search(pattern, sentence, re.IGNORECASE) for pattern in rule["patterns"]):
                    matched_sentence = sentence
                    break

            if matched_sentence:
                if not best_match or self._severity_int(rule["severity"]) > self._severity_int(best_match["severity"]):
                    best_match = {**rule, "matched_sentence": matched_sentence}

        if best_match:
            return best_match

        return {
            "type": "General",
            "label": "✅ Standard Language",
            "severity": "Low",
            "matched_sentence": self._split_sentences(text)[0][:350],
            "reason": "No high-risk pattern is clearly detected in this clause.",
            "what_this_means": "This section appears standard, but still review context before signing.",
            "real_world_risk": "Risk seems low based on current rule checks.",
            "why_company_uses_this": "Standard legal language helps define obligations clearly.",
            "actions": ["Confirm obligations are mutual", "Keep a written record of agreed changes"],
            "impact_level": "Legal Risk",
            "real_world_scenario": "Most terms look standard, but hidden obligations can still affect you if not reviewed.",
        }

    def _to_negotiation_actions(self, actions: List[str], level: str) -> List[Dict[str, str]]:
        priority = "High" if level in ("Critical", "High") else ("Medium" if level == "Medium" else "Low")
        payload = []
        for action in actions[:5]:
            payload.append({
                "action": action,
                "priority": priority,
                "negotiation_line": f"I would like us to {action.lower()} before we finalize this agreement."
            })
        return payload

    def _extract_json_object(self, text: str) -> Dict[str, Any]:
        start = text.find("{")
        if start < 0:
            return {}
        depth = 0
        end = -1
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end == -1:
            return {}
        candidate = text[start:end]
        try:
            obj = json.loads(candidate)
            return obj if isinstance(obj, dict) else {}
        except Exception:
            return {}

    def _severity_int(self, level: str) -> int:
        mapping = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
        return mapping.get(level, 0)

    async def _analyze_single_clause(self, clause: Clause, sem: asyncio.Semaphore) -> ClauseRisk:
        async with sem:
            rule = self._evaluate_rules(clause.text)
            level = rule["severity"]
            reasons = [rule["reason"]]
            prompt = (
                "You are a legal product analyst. Analyze the clause and return ONLY valid JSON with keys: "
                "what_this_means, real_world_risk, why_company_uses_this, improved_clause, what_should_user_do (array of strings), "
                "real_world_scenario, impact_level, negotiation_actions (array with action/priority/negotiation_line), "
                "reasons (array of short plain-English bullets). Keep language simple for non-lawyers.\n"
                f"Clause type hint: {rule['type']}\n"
                f"Matched sentence: {rule['matched_sentence']}\n"
                f"Full clause: {clause.text[:2500]}"
            )
            
            try:
                resp = await generate_completion(prompt)

                llm_payload = {}
                llm_payload = self._extract_json_object(resp)
                if llm_payload:
                    extra_reasons = llm_payload.get("reasons", [])
                    if isinstance(extra_reasons, list):
                        reasons.extend([str(r) for r in extra_reasons[:2] if isinstance(r, (str, int))])

            except Exception as e:
                logger.warning(f"LLM risk enrichment failed for clause {clause.id}: {type(e).__name__}: {str(e)}. Using rule fallbacks.")
                llm_payload = {}

            if not reasons:
                reasons.append("Standard verbiage. Low inherent risk.")

            fallback_improved = (
                "Revise this clause to include balanced obligations, clear termination rights, and liability limits."
            )

            return ClauseRisk(
                clause_id=clause.id,
                level=level,
                reasons=reasons,
                clause_type=rule["type"],
                label=rule["label"],
                matched_sentence=rule["matched_sentence"][:500],
                what_this_means=str(llm_payload.get("what_this_means") or rule["what_this_means"])[:300],
                real_world_risk=str(llm_payload.get("real_world_risk") or rule["real_world_risk"])[:300],
                why_company_uses_this=str(llm_payload.get("why_company_uses_this") or rule["why_company_uses_this"])[:300],
                what_should_user_do=[
                    str(a) for a in (llm_payload.get("what_should_user_do") or rule["actions"]) if isinstance(a, (str, int))
                ][:4],
                original_clause=rule["matched_sentence"][:500],
                improved_clause=str(llm_payload.get("improved_clause") or fallback_improved)[:500],
                real_world_scenario=str(llm_payload.get("real_world_scenario") or rule["real_world_scenario"])[:320],
                impact_level=llm_payload.get("impact_level") or rule["impact_level"],
                negotiation_actions=[
                    {
                        "action": str(a.get("action", ""))[:120],
                        "priority": str(a.get("priority", "Medium"))[:10],
                        "negotiation_line": str(a.get("negotiation_line", ""))[:220]
                    }
                    for a in (llm_payload.get("negotiation_actions") or self._to_negotiation_actions(
                        [str(x) for x in (llm_payload.get("what_should_user_do") or rule["actions"])][:5],
                        level
                    ))
                    if isinstance(a, dict)
                ][:5],
                analysis_source="llm_enriched" if llm_payload else "rule_fallback",
            )

    async def analyze(self, clauses: List[Clause]) -> List[ClauseRisk]:
        """Runs analysis in parallel with strict concurrency limits to prevent Ollama overflow."""
        sem = asyncio.Semaphore(3)
        tasks = [self._analyze_single_clause(clause, sem) for clause in clauses]
        risks = await asyncio.gather(*tasks)
        return list(risks)
