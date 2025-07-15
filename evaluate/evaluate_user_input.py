import sqlite3
from evaluate import get_similarity_score
from database import save_user_progress  # Lernstand speichern

def get_question_by_id(question_id):
    conn = sqlite3.connect("mathtalk.db")
    cursor = conn.cursor()
    cursor.execute("SELECT question, answer, question_type FROM questions WHERE id = ?", (question_id,))
    result = cursor.fetchone()
    conn.close()
    return result if result else None

# Beispiel: Eingeloggter Benutzer (in einer Webanwendung später durch session["email"] ersetzt)
current_user_email = "anna@example.com"

# Eingabe
question_id = 1
user_input = input("Deine Antwort: ")

# Frage abrufen
data = get_question_by_id(question_id)

if data:
    question_text, correct_answer, question_type = data

    if question_type == "classic":
        score = get_similarity_score(user_input, correct_answer)
        print(f"Ähnlichkeit: {score:.2f}")

        if score >= 0.85:
            print("✅ Richtig!")
            save_user_progress(current_user_email, question_id, True)
        elif score >= 0.65:
            print("🔁 Fast richtig – überprüfe deine Schreibweise.")
            save_user_progress(current_user_email, question_id, False)
        else:
            print("❌ Falsch.")
            save_user_progress(current_user_email, question_id, False)

    elif question_type == "multiple_choice":
        print("➡️ Bitte wähle die richtige Antwortmöglichkeit im Interface aus.")
        save_user_progress(current_user_email, question_id, False)

    elif question_type == "drag_drop":
        print("➡️ Diese Aufgabe wird per Drag & Drop im Interface gelöst.")
        save_user_progress(current_user_email, question_id, False)

    else:
        print("❌ Unbekannter Fragetyp in der Datenbank.")
else:
    print("❌ Frage nicht gefunden.")
