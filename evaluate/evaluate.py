import json, re
from typing import Any, Dict, List, Optional, Tuple
from difflib import SequenceMatcher

# SymSpell optional importieren
try:
    from symspellpy import SymSpell, Verbosity
    _SYM_AVAILABLE = True
except ImportError:
    _SYM_AVAILABLE = False

_SYM: Optional[SymSpell] = None

# ---------- SymSpell Initialisierung ----------
def init_symspell(dictionary_path: str):
    """Initialisiert SymSpell mit max. 2 Edit-Distanz."""
    global _SYM
    if not _SYM_AVAILABLE:
        raise ImportError("symspellpy ist nicht installiert. Bitte mit `pip install symspellpy` nachrüsten.")
    sp = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
    if not sp.load_dictionary(dictionary_path, term_index=0, count_index=1):
        raise FileNotFoundError(f"Dictionary nicht gefunden: {dictionary_path}")
    _SYM = sp

def sym_correct(text: str) -> str:
    """Korrigiert Tippfehler mithilfe des geladenen SymSpell-Wörterbuchs."""
    if not _SYM or not text:
        return text
    out = []
    for w in text.split():
        sug = _SYM.lookup(w, Verbosity.CLOSEST, max_edit_distance=2)
        out.append(sug[0].term if sug else w)
    return " ".join(out)

# ---------- Normalisierung ----------
SUPERSCRIPT_TO_DIGIT = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹", "0123456789")

def normalize_math(s: str) -> str:
    if s is None:
        return ""
    t = str(s).strip()
    t = sym_correct(t)  # Tippfehler-Korrektur direkt hier
    t = t.replace("−", "-").replace(",", ".").replace("·", "*")
    repl = {
        "ist gleich": "=", "gleich": "=",
        "klammer auf": "(", "klammer zu": ")",
        "geteilt durch": "/", "mal": "*", "plus": "+", "minus": "-"
    }
    for k, v in repl.items():
        t = t.replace(k, v)
    t = re.sub(r"([⁰¹²³⁴⁵⁶⁷⁸⁹]+)", lambda m: "^" + m.group(1).translate(SUPERSCRIPT_TO_DIGIT), t)
    t = re.sub(r"\^\s+(\d+)", r"^\1", t)
    t = re.sub(r"[^a-z0-9+\-*/=().,^|{};:\s]", "", t.lower())
    t = re.sub(r"\s+", " ", t).strip()
    return t

def normalize_text(s: str) -> str:
    if s is None:
        return ""
    t = sym_correct(str(s).lower().strip())
    t = re.sub(r"[^\wäöüß .,/+\-^=()|{};:]", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t

def normalize_generic(s: str) -> str:
    m = normalize_math(s)
    return m if re.search(r"[+\-*/=^()|]", m) else normalize_text(s)

# ---------- Vergleich & Similarity ----------
def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()

def typo_equal(a: str, b: str, threshold: float = 0.88) -> bool:
    return similarity(a, b) >= threshold

# ---------- Classic ----------
def numbers_equal(a: float, b: float, tol: float = 1e-6) -> bool:
    return abs(a - b) <= tol

def parse_vertex(ans: str) -> Optional[Tuple[float, float]]:
    t = normalize_math(ans)
    m = re.search(r"\(\s*([+-]?\d+(?:\.\d+)?)\s*[\|,;]\s*([+-]?\d+(?:\.\d+)?)\s*\)", t)
    if not m:
        return None
    try:
        return float(m.group(1)), float(m.group(2))
    except ValueError:
        return None

def parse_roots(ans: str) -> Optional[List[float]]:
    t = normalize_math(ans)
    t = re.sub(r"\bund\b", ",", t)
    nums = re.findall(r"[+-]?\d+(?:\.\d+)?", t)
    return [float(x) for x in nums] if nums else None

def multisets_equal(a: List[float], b: List[float], tol: float = 1e-6) -> bool:
    if len(a) != len(b):
        return False
    return all(numbers_equal(x, y, tol) for x, y in zip(sorted(a), sorted(b)))

def infer_answer_kind(correct: str) -> str:
    c = normalize_math(correct)
    if re.search(r"\(\s*[+-]?\d+(?:\.\d+)?\s*[\|,;]\s*[+-]?\d+(?:\.\d+)?\s*\)", c):
        return "vertex"
    if len(re.findall(r"[+-]?\d+(?:\.\d+)?", c)) >= 2:
        return "roots"
    return "generic"

def evaluate_classic(user_answer: str, correct_answer: str) -> Dict[str, Any]:
    kind = infer_answer_kind(correct_answer)
    if kind == "vertex":
        u, c = parse_vertex(user_answer), parse_vertex(correct_answer)
        ok = u and c and numbers_equal(u[0], c[0]) and numbers_equal(u[1], c[1])
        return {"type": "classic", "is_correct": bool(ok)}
    if kind == "roots":
        u, c = parse_roots(user_answer), parse_roots(correct_answer)
        ok = u and c and multisets_equal(u, c)
        return {"type": "classic", "is_correct": bool(ok)}
    # generic
    u, c = normalize_generic(user_answer), normalize_generic(correct_answer)
    ok = u == c or typo_equal(u, c)
    return {"type": "classic", "is_correct": bool(ok)}

# ---------- Multiple Choice ----------
def _label_to_index(label: str) -> Optional[int]:
    m = re.fullmatch(r"[A-Za-z]", label.strip())
    return ord(m.group().upper()) - ord('A') if m else None

def _strip_choice_prefix(option: str) -> str:
    return re.sub(r"^[A-Za-z]\)\s*", "", str(option)).strip()

def evaluate_multiple_choice(user_answer: str, correct_answer: str, options: List[str]) -> Dict[str, Any]:
    norm_opts = [_strip_choice_prefix(o) for o in options]
    uidx = _label_to_index(user_answer)
    user_text = norm_opts[uidx] if uidx is not None and 0 <= uidx < len(norm_opts) else user_answer
    cidx = _label_to_index(correct_answer)
    correct_text = norm_opts[cidx] if cidx is not None and 0 <= cidx < len(norm_opts) else correct_answer
    if typo_equal(normalize_generic(user_text), normalize_generic(correct_text)):
        return {"type": "multiple_choice", "is_correct": True}
    return {"type": "multiple_choice", "is_correct": False}

# ---------- Drag & Drop ----------
def evaluate_drag_drop(user_map: Dict[str, Any], correct_map: Dict[str, Any]) -> Dict[str, Any]:
    details = {}
    for key, correct_val in correct_map.items():
        ua = user_map.get(key, "")
        ok = typo_equal(normalize_generic(ua), normalize_generic(correct_val))
        details[key] = ok
    return {"type": "drag_drop", "is_correct": all(details.values()), "details": details}

# ---------- Hauptfunktion ----------
def evaluate(question: Dict[str, Any], user_input: Any) -> Dict[str, Any]:
    """Haupt-Evaluator für alle Frage-Typen."""
    qtype = question.get("question_type", "classic")
    correct_answer = question.get("answer")

    # JSON-Strings in Dicts umwandeln
    if isinstance(correct_answer, str):
        try:
            correct_answer = json.loads(correct_answer)
        except (json.JSONDecodeError, TypeError):
            pass

    if qtype == "classic":
        return evaluate_classic(user_input, correct_answer)

    if qtype == "multiple_choice":
        options = question.get("options") or question.get("choices", [])
        return evaluate_multiple_choice(user_input, correct_answer, options)

    if qtype == "drag_drop":
        return evaluate_drag_drop(user_input, correct_answer)

    return {"type": qtype, "is_correct": False}

# ---------- User-Eingabe-Evaluator ----------
def evaluate_user_input(question_row: Dict[str, Any], user_input: Any) -> Dict[str, Any]:
    """Nutzt DB-Row und wählt automatisch den richtigen Evaluator."""
    return evaluate(question_row, user_input)
