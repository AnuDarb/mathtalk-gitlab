import sqlite3
from evaluate import get_similarity_score  # statt is_answer_correct

def get_correct_answer(question_id):
    conn = sqlite3.connect("mathtalk.db")
    cursor = conn.cursor()
    cursor.execute("SELECT answer FROM questions WHERE id = ?", (question_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

# Beispiel: Nutzerantwort auf Frage mit ID 1
question_id = 1
user_input = input("Deine Antwort: ")

correct_answer = get_correct_answer(question_id)

if correct_answer:
    score = get_similarity_score(user_input, correct_answer)
    print(f"🔍 Ähnlichkeit: {score:.2f}")

    if score > 0.65:
        print("✅ Richtig!")
    else:
        print("❌ Leider falsch.")
else:
    print("❌ Frage nicht gefunden.")

