# -*- coding: utf-8 -*-

"""
pattern_engine.py — Layer A of the MalIntent Detection Pipeline
================================================================
Regex-based first-pass triage filter. Scans prompts against 47 curated regex patterns spanning 7 OWASP LLM Top 10 aligned prompt injection categories.
Patterns were developed and validated against the MalIntent Combined Training Corpus 
(700 samples, 7 datasets: HackAPrompt, WildJailbreak, JailbreakBench, DeepSet, Dolly-15k, Alpaca-Cleaned, OpenAssistant).
Coverage analysis and regex validation are documented in dataset_exploration.ipynb.

Categories:
    DI — Direct Injection (9 patterns)
    PO — Persona Override / Jailbreak (7 patterns)
    DE — Data Exfiltration (6 patterns)
    EO — Encoding Obfuscation (5 patterns)
    II — Indirect / RAG Injection (5 patterns)
    CM — Context Manipulation (8 patterns)
    HE — Harmful Elicitation (7 patterns)

Average latency: ~2 ms per prompt on CPU (compiled regexes, no ML inference).
"""


import re
import base64
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class PatternMatch:
    """Result of a single pattern check."""
    matched: bool
    category: str
    pattern_id: str
    matched_text: Optional[str] = None
    confidence: float = 0.0

@dataclass
class PatternEngineResult:
    is_threat: bool
    matches: List[PatternMatch] = field(default_factory=list)
    highest_confidence: float = 0.0
    primary_category: Optional[str] = None
    explanation: str = ""

    def to_dict(self) -> dict:       # ← 4 spaces indented inside the class
        return {
            "is_threat": self.is_threat,
            "highest_confidence": self.highest_confidence,
            "primary_category": self.primary_category,
            "explanation": self.explanation,
            "match_count": len(self.matches),
            "matched_pattern_ids": [
                m.pattern_id for m in self.matches
            ],
        }

class PatternEngine:
    """
    Layer A of the MalIntent detection pipeline.

    Uses curated regex patterns to detect known prompt injection
    signatures across all OWASP LLM Top 10 attack categories.
    Designed to be fast (~2ms) and serve as a first-pass triage filter.
    """

    # --- CATEGORY 1: Direct Injection / Override Attacks ---
    DIRECT_INJECTION_PATTERNS = [
        ("DI-001", r"\bignore\b.{0,30}\b(previous|prior|above|all)\b.{0,20}\binstructions?\b"),
        ("DI-002", r"\b(disregard|forget|override|bypass|skip)\b.{0,30}\b(instructions?|prompt|rules?|guidelines?|constraints?)\b"),
        ("DI-003", r"\b(do not|don't|stop)\b.{0,20}\b(follow|obey|adhere to)\b.{0,30}\b(instructions?|rules?|guidelines?)\b"),
        ("DI-004", r"your (new|actual|real|only) instructions?\b"),
        ("DI-005", r"\bnew (task|objective|goal|mission|directive|instruction)\b"),
        ("DI-006", r"(instead|rather).{0,30}(do|say|respond|output|write).{0,30}(following|this)"),
        ("DI-007", r"from now on.{0,40}(you (are|will|must|should)|always|never)"),
        ("DI-008", r"(?i)(---+\s*end|end\s*of\s*(prompt|instructions)|</instructions>|</?new_instructions>)"),
        ("DI-009", r"(?i)(sudo|admin|root)\s+(echo|override|command|mode|access)"),
    ]

    # --- CATEGORY 2: Persona Override / Jailbreak Attacks ---
    PERSONA_OVERRIDE_PATTERNS = [
        ("PO-001", r"\b(you are|you're|act as|pretend (you are|to be)|roleplay as|imagine you are)\b.{0,50}\b(unrestricted|without (limits?|restrictions?|filters?|constraints?))\b"),
        ("PO-002", r"\bDAN\b"),
        # FIX: added 'jailbroken' -- original only matched 'jailbreak'/'jailbreaked',
        # missing the correct past-participle form actually used in real attacks.
        ("PO-003", r"\b(jailbroken?|jailbreak(ed)?|uncensored|unfiltered|unrestricted) (AI|model|version|mode)\b"),
        ("PO-004", r"(pretend|imagine|roleplay|act).{0,40}(no (restrictions?|rules?|limits?|guidelines?)|without (rules?|restrictions?|limits?))"),
        ("PO-005", r"\bact as (an? )?(evil|malicious|unrestricted|unethical)\b"),
        ("PO-006", r"you (have no|don't have any|are free from) (restrictions?|constraints?|limitations?|rules?|ethics?)"),
        ("PO-007", r"(switch|change|toggle).{0,20}(mode|persona|character|identity).{0,30}(developer|admin|unrestricted|god)"),
    ]

    # --- CATEGORY 3: Data Exfiltration Attacks ---
    DATA_EXFILTRATION_PATTERNS = [
        ("DE-001", r"(repeat|print|output|display|show|reveal|tell me|share).{0,40}(system prompt|initial prompt|original instructions?|configuration)"),
        ("DE-002", r"what (are|were) (you|your) (instructions?|told|trained|programmed|prompted)"),
        ("DE-003", r"(leak|expose|dump|extract|exfiltrate).{0,40}(data|information|prompt|context|memory|conversation)"),
        ("DE-004", r"(show|display|output|print).{0,20}(all|every|full|complete|entire).{0,20}(conversation|history|context|memory|logs?)"),
        # FIX: original pattern required credential keyword BEFORE the action verb.
        # Natural attack phrasing reverses this: "reveal your api key".
        # Now matches both orderings via two alternatives joined by |.
        ("DE-005", r"(reveal|show|share|output|print).{0,30}(api key|secret key|password|credentials?|access token)"
                   r"|"
                   r"(api key|secret key|password|credentials?|access token).{0,30}(reveal|show|share|output|print)"),
        ("DE-006", r"what (is|was) (the )?(first|initial|original) (message|prompt|instruction|system)"),
    ]

    # --- CATEGORY 4: Encoding Obfuscation Attacks ---
    ENCODING_PATTERNS = [
        ("EO-001", r"[A-Za-z0-9+/]{40,}={0,2}"),
        ("EO-002", r"(\\x[0-9a-fA-F]{2}){5,}"),
        ("EO-003", r"(\\u[0-9a-fA-F]{4}){3,}"),
        ("EO-004", r"(decode|base64|hex|rot13|cipher).{0,30}(this|following|below|message)"),
        ("EO-005", r"(translate|convert|interpret).{0,30}(binary|morse|caesar|rot)"),
    ]

    # --- CATEGORY 5: Indirect / RAG Poisoning Markers ---
    INDIRECT_INJECTION_PATTERNS = [
        ("II-001", r"\[?(SYSTEM|ADMIN|ROOT|OVERRIDE)\]?\s*:?\s*(override|ignore|new instruction)"),
        # FIX: use [^<]* instead of .* to avoid runaway matches under DOTALL
        ("II-002", r"<(system|instruction|command|override)>[^<]*"),
        # FIX: tightened from \{\{.*\}\} which risks catastrophic backtracking
        ("II-003", r"\{\{[^}]*\}\}"),
        # II-004 removed: original HTML comment pattern contained null/invisible bytes
        # FIX: escaped forward slash correctly
        ("II-005", r"\[INST\]|\[SYS\]|\[/INST\]"),
        # FIX: require actual whitespace after keyword to avoid 'whitespace', 'whitefish' etc.
        ("II-006", r"(hidden|invisible|white)\s.{0,20}(text|instruction|command)"),
    ]

    # --- CATEGORY 6: Context Manipulation ---
    CONTEXT_MANIPULATION_PATTERNS = [
        ("CM-001", r"(above|previous|prior).{0,20}(text|content|message|context).{0,20}(was|is) (fake|false|fictional|hypothetical|a test)"),
        ("CM-002", r"(this is|we are).{0,30}(test|simulation|exercise|drill).{0,30}(ignore|disregard|bypass)"),
        ("CM-003", r"(maintenance|debug|developer|admin) mode"),
        ("CM-004", r"(end of|closing) (prompt|instructions?|system).{0,30}(begin|start|new)"),
        ("CM-005", r'(?i)\{\s*"role"\s*:'),
        ("CM-006", r"(?i)^(Human|Assistant|User|AI)\s*:"),
        ("CM-007", r"(?i)(hypothetical|fictional|alternate\s+universe|in\s+a\s+world\s+where|post-apocalyptic)"),
        ("CM-008", r"(?i)(for\s+(educational|academic|research|training)\s+purposes|for\s+(a|my)\s+(paper|thesis|course|class))"),
    ]

    # --- CATEGORY 7: Harmful Content Elicitation ---
    HARMFUL_ELICITATION_PATTERNS = [
        ("HE-001", r"(step.by.step|detailed|exact).{0,30}(instructions?|guide|tutorial).{0,40}(harm|illegal|weapon|exploit|hack|bypass|crack)"),
        ("HE-002", r"(for (educational|research|fictional|hypothetical) purposes?).{0,50}(how to|steps|guide).{0,30}(hack|exploit|bypass|illegal)"),
        ("HE-003", r"(in a (story|novel|movie|game)|as a character).{0,50}(explain|describe|show).{0,30}(how to|steps for)"),
        ("HE-004", r"(?i)\b(bomb|weapon|explosive|malware|ransomware|keylogger|poison|meth|fentanyl|ricin|nerve\s+agent)\b"),
        ("HE-005", r"(?i)\b(kill|murder|torture|stalk|kidnap|trafficking|suicide|swatting|threaten)\b"),
        ("HE-006", r"(?i)\b(fraud|counterfeit|forge|phishing|blackmail|extort|bribery|launder|shoplift|wiretap)\b"),
        ("HE-007", r"(?i)\b(illegal(ly)?|unregistered|untraceable|undetected|without\s+getting\s+caught)\b"),
    ]

    _CATEGORY_MAP = {
        "direct_injection":     DIRECT_INJECTION_PATTERNS,
        "persona_override":     PERSONA_OVERRIDE_PATTERNS,
        "data_exfiltration":    DATA_EXFILTRATION_PATTERNS,
        "encoding_obfuscation": ENCODING_PATTERNS,
        "indirect_injection":   INDIRECT_INJECTION_PATTERNS,
        "context_manipulation": CONTEXT_MANIPULATION_PATTERNS,
        "harmful_elicitation":  HARMFUL_ELICITATION_PATTERNS,
    }

    def __init__(self) -> None:
        self._compiled: list = self._compile_all()

    def _compile_all(self) -> list:
        """Compile all regex patterns. Raises ValueError on any bad pattern."""
        compiled = []
        for category, patterns in self._CATEGORY_MAP.items():
            for pattern_id, pattern in patterns:
                try:
                    compiled.append({
                        "id":       pattern_id,
                        "category": category,
                        "regex":    re.compile(pattern, re.IGNORECASE | re.DOTALL),
                    })
                except re.error as exc:
                    raise ValueError(f"Invalid regex for {pattern_id!r}: {exc}") from exc
        return compiled

    def _check_base64_decoded(self, text: str) -> bool:
        """Return True if any base64-looking token decodes to an injection payload."""
        b64_pattern = re.compile(r"[A-Za-z0-9+/]{20,}={0,2}")
        for match in b64_pattern.finditer(text):
            try:
                decoded = base64.b64decode(match.group()).decode("utf-8", errors="ignore")
                if re.search(r"ignore|instruction|override|system", decoded, re.IGNORECASE):
                    return True
            except Exception:
                pass
        return False

    def scan(self, text: str) -> PatternEngineResult:
        """
        Scan text against all compiled patterns.

        Args:
            text: The user prompt to analyse.

        Returns:
            PatternEngineResult with all matches and threat assessment.
        """
        if not text or not isinstance(text, str):
            return PatternEngineResult(is_threat=False, explanation="Empty or invalid input.")

        matches: List[PatternMatch] = []

        for pattern_info in self._compiled:
            hit = pattern_info["regex"].search(text)
            if hit:
                matches.append(PatternMatch(
                    matched=True,
                    category=pattern_info["category"],
                    pattern_id=pattern_info["id"],
                    matched_text=hit.group()[:100],
                    confidence=0.9,
                ))

        if self._check_base64_decoded(text):
            matches.append(PatternMatch(
                matched=True,
                category="encoding_obfuscation",
                pattern_id="EO-BASE64-DECODED",
                confidence=0.85,
            ))

        is_threat = bool(matches)
        highest_conf = max((m.confidence for m in matches), default=0.0)

        primary_cat: Optional[str] = None
        if matches:
            primary_cat = max(matches, key=lambda m: m.confidence).category

        if is_threat:
            categories_found = sorted({m.category for m in matches})
            explanation = (
                f"Pattern engine detected {len(matches)} threat indicator(s). "
                f"Categories: {', '.join(categories_found)}. "
                f"Primary: {primary_cat}."
            )
        else:
            explanation = "No known injection patterns detected."

        return PatternEngineResult(
            is_threat=is_threat,
            matches=matches,
            highest_confidence=highest_conf,
            primary_category=primary_cat,
            explanation=explanation,
        )
