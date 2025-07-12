import sqlite3
import json
import bcrypt
import logging
import os

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pfad zur SQLite-Datei (für Render ggf. persistent anpassen)
DB_PATH = os.environ.get("DB_PATH", "mathtalk.db")

# 📚 Mapping der Kategorien
CATEGORY_MAP = {
    'zahlen_terme': 'Zahlen & Terme',
    'funktionen_algebra': 'Funktionen & Algebra',
    'geometrie_raum': 'Geometrie & Raum',
    'stochastik': 'Stochastik'
}

def create_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Damit dict-ähnliche Ergebnisse zurückgegeben werden
    return conn

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

    # Lernstand-Tabelle mit attempts und errors
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            question_id INTEGER NOT NULL,
            correct INTEGER NOT NULL CHECK (correct IN (0,1)),
            attempts INTEGER DEFAULT 1,
            errors INTEGER DEFAULT 0,
            UNIQUE(user_email, question_id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            session_id TEXT PRIMARY KEY,
            remaining TEXT,
            wrong TEXT
        )
    """)
    conn.commit()
    conn.close()
    logger.info("Datenbanktabellen wurden erstellt oder aktualisiert.")

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
        logger.info(f"{len(questions)} Fragen aus '{filename}' wurden geladen.")
    except Exception as e:
        logger.error(f"Fehler beim Laden von '{filename}': {e}")

def list_questions():
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, question, category, question_type FROM questions")
    for row in cursor.fetchall():
        logger.info(f"ID {row[0]} | {row[1]} ({row[2]}) – Typ: {row[3]}")
    conn.close()

# Benutzerregistrierung
def register_user(email, password):
    conn = create_connection()
    cursor = conn.cursor()
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    try:
        cursor.execute("INSERT INTO users (email, password) VALUES (?, ?)", (email, hashed_pw))
        conn.commit()
        logger.info("Benutzer erfolgreich registriert.")
    except sqlite3.IntegrityError:
        logger.warning("Diese E-Mail ist bereits registriert.")
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
        logger.info("Login erfolgreich!")
        return True
    else:
        logger.warning("Login fehlgeschlagen. E-Mail oder Passwort falsch.")
        return False

# 🧠 Fortschritt abspeichern
def save_user_progress(user_email, question_id, is_correct):
    conn = create_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT attempts, errors FROM progress
        WHERE user_email = ? AND question_id = ?
    """, (user_email, question_id))
    row = cursor.fetchone()

    if row:
        attempts, errors = row
        new_attempts = attempts + 1
        new_errors = errors + (0 if is_correct else 1)
        cursor.execute("""
            UPDATE progress
            SET correct = ?, attempts = ?, errors = ?
            WHERE user_email = ? AND question_id = ?
        """, (1 if is_correct else 0, new_attempts, new_errors, user_email, question_id))
    else:
        cursor.execute("""
            INSERT INTO progress (user_email, question_id, correct, attempts, errors)
            VALUES (?, ?, ?, ?, ?)
        """, (user_email, question_id, 1 if is_correct else 0, 1, 0 if is_correct else 1))

    conn.commit()
    conn.close()

# 🔎 Fragen holen
def get_questions(category=None):
    conn = create_connection()
    if category:
        db_category = CATEGORY_MAP.get(category, category)
        questions = conn.execute('SELECT * FROM questions WHERE category = ?', (db_category,)).fetchall()
    else:
        questions = conn.execute('SELECT * FROM questions').fetchall()
    conn.close()
    return [dict(q) for q in questions]

# 🧠 Fortschritt abrufen
def get_user_progress(email, category=None):
    conn = create_connection()
    if category:
        db_category = CATEGORY_MAP.get(category, category)
        question_ids = [row['id'] for row in conn.execute('SELECT id FROM questions WHERE category = ?', (db_category,))]
        q_marks = ','.join(['?']*len(question_ids))
        if not question_ids:
            return [], []
        rows = conn.execute(f'SELECT question_id, correct FROM progress WHERE user_email = ? AND question_id IN ({q_marks})', (email, *question_ids)).fetchall()
    else:
        rows = conn.execute('SELECT question_id, correct FROM progress WHERE user_email = ?', (email,)).fetchall()
    correct = [row['question_id'] for row in rows if row['correct'] == 1]
    wrong = [row['question_id'] for row in rows if row['correct'] == 0]
    conn.close()
    return correct, wrong

# ✅ Lösung aus DB holen
def get_correct_answer(question_id):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT answer FROM questions WHERE id = ?", (question_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

# 🗑️ Fortschritt zurücksetzen
def reset_user_progress(email):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM progress WHERE user_email = ?", (email,))
    conn.commit()
    conn.close()
    logger.info(f"Fortschritt für {email} wurde zurückgesetzt.")
