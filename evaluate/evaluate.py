import re
import os
from symspellpy import SymSpell, Verbosity

# Modell wird nur bei Bedarf geladen (Lazy Loading)
model = None

def get_model():
    global model
    if model is None:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('paraphrase-MiniLM-L6-v2')
    return model

# SymSpell vorbereiten für Rechtschreibkorrektur
sym_spell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
dict_path = os.path.join(os.path.dirname(__file__), "dictionary.txt")
if not sym_spell.load_dictionary(dict_path, term_index=0, count_index=1):
    print("⚠️ Wörterbuch konnte nicht geladen werden.")

# Hochzahlen ersetzen (z. B. "hoch 2" → "²")
superscript_map = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"
}

def replace_exponents(text):
    text = re.sub(r"hoch\s?(\d)", lambda m: superscript_map.get(m.group(1), m.group(1)), text)
    text = re.sub(r"\^(\d)", lambda m: superscript_map.get(m.group(1), m.group(1)), text)
    return text

# Rechenzeichen vereinheitlichen
def words_to_symbols(text):
    replacements = {
        "plus": "+", "minus": "-", "mal": "*",
        "geteilt durch": "/", "gleich": "=", "ist gleich": "=",
        "klammer auf": "(", "klammer zu": ")",
        "punkt": "."
    }
    for word, symbol in replacements.items():
        text = text.replace(word, symbol)
    return text

# Mathematischen Ausdruck isolieren
def extract_math_expression(text):
    text = text.lower()
    text = replace_exponents(text)
    text = words_to_symbols(text)
    text = re.sub(r"[^a-z0-9+\-*/=().⁰¹²³⁴⁵⁶⁷⁸⁹]", "", text)
    return text

# Korrigiert einfache Tippfehler mit SymSpell
def correct_spelling(text):
    corrected = []
    for word in text.split():
        suggestions = sym_spell.lookup(word, Verbosity.CLOSEST, max_edit_distance=2)
        corrected.append(suggestions[0].term if suggestions else word)
    return " ".join(corrected)

# Bewertungsfunktion mit Korrektur + semantischem Vergleich (Lazy-Load-Modell)
def get_similarity_score(user_answer, correct_answer):
    from sentence_transformers import util

    user_answer = correct_spelling(user_answer)
    user_answer = extract_math_expression(user_answer)
    correct_answer = extract_math_expression(correct_answer)

    model = get_model()
    embedding_user = model.encode(user_answer, convert_to_tensor=True)
    embedding_correct = model.encode(correct_answer, convert_to_tensor=True)

    similarity_score = util.cos_sim(embedding_user, embedding_correct)
    return similarity_score.item()
