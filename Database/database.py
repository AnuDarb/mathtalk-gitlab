import sqlite3
import json

def create_connection():
    return sqlite3.connect("mathtalk.db")

def init_db():
    conn = create_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            hint_text TEXT,
            category TEXT NOT NULL,
            grade TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()

def add_question(question, answer, hint_text, category, grade):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO questions (question, answer, hint_text, category, grade)
        VALUES (?, ?, ?, ?, ?)
    """, (question, answer, hint_text, category, grade))
    conn.commit()
    conn.close()


def load_questions_from_file(filename):
    try:
        with open(filename, "r", encoding="utf-8") as f:
            questions = json.load(f)
        for q in questions:
            add_question(
                q["question"],
                q["answer"],
                q.get("hint_text", ""),  # fallback falls fehlt
                q["category"],
                q["grade"]              # ❗ grade ergänzen
            )
        print(f"📥 {len(questions)} Fragen aus '{filename}' wurden geladen.")
    except Exception as e:
        print(f"⚠️ Fehler beim Laden von '{filename}': {e}")

def list_questions():
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, question, category FROM questions")
    for row in cursor.fetchall():
        print(f"ID {row[0]} | {row[1]} ({row[2]})")
    conn.close()

if __name__ == "__main__":
    init_db()
    load_questions_from_file("fragen.json")
    list_questions()
