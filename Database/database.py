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
            grade TEXT NOT NULL,
            question_type TEXT DEFAULT 'classic',
            choices TEXT -- nur für Multiple Choice
        )
    """)
    conn.commit()
    conn.close()

def add_question(question, answer, hint_text, category, grade, question_type="classic", choices=None):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO questions (question, answer, hint_text, category, grade, question_type, choices)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        question,
        json.dumps(answer) if isinstance(answer, dict) else answer,
        hint_text,
        category,
        grade,
        question_type,
        json.dumps(choices) if choices else None
    ))
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
                q.get("hint_text", ""),
                q["category"],
                q["grade"],
                q.get("question_type", "classic"),
                q.get("choices", None)
            )
        print(f"📥 {len(questions)} Fragen aus '{filename}' wurden geladen.")
    except Exception as e:
        print(f"⚠️ Fehler beim Laden von '{filename}': {e}")

def list_questions():
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, question, category, question_type FROM questions")
    for row in cursor.fetchall():
        print(f"ID {row[0]} | {row[1]} ({row[2]}) – Typ: {row[3]}")
    conn.close()

if __name__ == "__main__":
    init_db()
    load_questions_from_file("fragen.json")
    list_questions()
