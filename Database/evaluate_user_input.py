import sqlite3
from evaluate import get_similarity_score

def get_question_by_id(question_id):
    conn = sqlite3.connect("mathtalk.db")
    cursor = conn.cursor()
    cursor.execute("SELECT question, answer, question_type FROM questions WHERE id = ?", (question_id,))
    result = cursor.fetchone()
    conn.close()
    return result if result else None

# Nutzerantwort
question_id = 1
user_input = input("💬 Deine Antwort: ")

# Frage aus Datenbank abrufen
data = get_question_by_id(question_id)

if data:
    question_text, correct_answer, question_type = data

    if question_type == "classic":
        score = get_similarity_score(user_input, correct_answer)
        print(f"🔍 Ähnlichkeit: {score:.2f}")

        if score > 0.85:
            print("✅ Richtig!")
        elif score > 0.65:
            print("🔁 Fast richtig – überprüfe deine Schreibweise.")
        else:
            print("❌ Leider falsch.")

    elif question_type == "multiple_choice":
        print("🔘 Bitte wähle die richtige Antwortmöglichkeit im Interface aus.")

    elif question_type == "drag_drop":
        print("🧩 Diese Aufgabe wird per Drag & Drop im Interface gelöst.")

    else:
        print("❓ Unbekannter Fragetyp in der Datenbank.")
else:
    print("❌ Frage nicht gefunden.")

