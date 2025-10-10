import sqlite3
from typing import Any, Dict
from evaluate import evaluate_classic, get_similarity_score
from database import save_user_progress  # Lernstand speichern

def get_question_by_id(question_id: int) -> Dict[str, Any] | None:
    conn = sqlite3.connect("mathtalk.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, question, answer, question_type FROM questions WHERE id = ?",
        (question_id,),
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    qid, question_text, answer, qtype = row
    return {"id": qid, "question": question_text, "answer": answer, "question_type": qtype}

current_user_email = "anna@example.com"

def main():
    # Eingabe
    question_id = 1
    row = get_question_by_id(question_id)

    if not row:
        print("❌ Frage nicht gefunden.")
        return

    if row["question_type"] != "classic":
        print("⚠️ Diese Routine prüft nur classic-Fragen.")
        return

    print(row["question"])
    user_input = input("Deine Antwort: ")

    # Bewertung
    result = evaluate_classic(user_input, row["answer"])
    score = get_similarity_score(user_input, row["answer"])
    print(f"Ähnlichkeit: {score:.2f}")

    # Rückmeldung + Lernstand speichern
    if result.get("is_correct"):
        print("✅ Richtig!")
        save_user_progress(current_user_email, row["id"], True)
    elif score >= 0.65:
        print("🔁 Fast richtig – überprüfe deine Schreibweise.")
        save_user_progress(current_user_email, row["id"], False)
    else:
        print("❌ Falsch.")
        save_user_progress(current_user_email, row["id"], False)

if __name__ == "__main__":
    main()
