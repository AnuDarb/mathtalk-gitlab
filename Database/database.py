import sqlite3
import json
import bcrypt

def create_connection():
    return sqlite3.connect("mathtalk.db")

def init_db():
    conn = create_connection()
    cursor = conn.cursor()

    # Fragen-Tabelle
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            hint_text TEXT,
            category TEXT NOT NULL,
            grade TEXT NOT NULL,
            question_type TEXT DEFAULT 'classic',
            choices TEXT
        )
    """)

    # Benutzer-Tabelle
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    """)

    # Lernstand-Tabelle
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            question_id INTEGER NOT NULL,
            correct INTEGER NOT NULL CHECK (correct IN (0,1))
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

# Neuen Benutzer registrieren
def register_user(email, password):
    conn = create_connection()
    cursor = conn.cursor()
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    try:
        cursor.execute("INSERT INTO users (email, password) VALUES (?, ?)", (email, hashed_pw))
        conn.commit()
        print("✅ Benutzer erfolgreich registriert.")
    except sqlite3.IntegrityError:
        print("⚠️ Diese E-Mail ist bereits registriert.")
    finally:
        conn.close()

# Benutzer-Login
def login_user(email, password):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()

    if row and bcrypt.checkpw(password.encode('utf-8'), row[0]):
        print("✅ Login erfolgreich!")
        return True
    else:
        print("❌ Login fehlgeschlagen. E-Mail oder Passwort falsch.")
        return False

# Lernstand speichern
def save_user_progress(user_email, question_id, is_correct):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO progress (user_email, question_id, correct)
        VALUES (?, ?, ?)
    """, (user_email, question_id, 1 if is_correct else 0))
    conn.commit()
    conn.close()

# Beispielverwendung
if __name__ == "__main__":
    init_db()
    load_questions_from_file("fragen.json")
    list_questions()

    # Benutzerregistrierung und Login testen
    register_user("test@example.com", "meinpasswort123")
    login_user("test@example.com", "meinpasswort123")

    # Beispielhafter Lernstandeintrag
    save_user_progress("test@example.com", 1, True)  # Frage 1 richtig beantwortet
    save_user_progress("test@example.com", 2, False) # Frage 2 falsch beantwortet
