import re
from sentence_transformers import SentenceTransformer, util

# Modell laden (nur beim ersten Mal dauert das kurz)
model = SentenceTransformer('paraphrase-MiniLM-L6-v2')

# Mapping für Hochzahlen
superscript_map = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"
}

# Wandelt „hoch 2“ oder „^2“ in echte Hochzahlen um
def replace_exponents(text):
    text = re.sub(r"hoch\s?(\d)", lambda m: superscript_map.get(m.group(1), m.group(1)), text)
    text = re.sub(r"\^(\d)", lambda m: superscript_map.get(m.group(1), m.group(1)), text)
    return text

# Wandelt ausgeschriebene Rechenzeichen in Symbole um
def words_to_symbols(text):
    replacements = {
        "plus": "+",
        "minus": "-",
        "mal": "*",
        "geteilt durch": "/",
        "gleich": "=",
        "ist gleich": "=",
        "klammer auf": "(",
        "klammer zu": ")",
        "punkt": ".",  # optional
    }
    for word, symbol in replacements.items():
        text = text.replace(word, symbol)
    return text

# Extrahiert und bereinigt mathematische Terme
def extract_math_expression(text):
    text = text.lower()
    text = replace_exponents(text)
    text = words_to_symbols(text)
    text = re.sub(r"[^a-z0-9+\-*/=().⁰¹²³⁴⁵⁶⁷⁸⁹]", "", text)
    return text

# Berechnet semantische Ähnlichkeit mithilfe von SentenceTransformer
def get_similarity_score(user_answer, correct_answer):
    user_answer = extract_math_expression(user_answer)
    correct_answer = extract_math_expression(correct_answer)
    
    embedding_user = model.encode(user_answer, convert_to_tensor=True)
    embedding_correct = model.encode(correct_answer, convert_to_tensor=True)
    
    similarity_score = util.cos_sim(embedding_user, embedding_correct)
    return similarity_score.item()
