import sqlite3
import json
import bcrypt
import logging
import os
import random

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pfad zur SQLite-Datei
DB_DIR = "data"
DB_PATH = os.path.join(DB_DIR, "mathtalk.db")

# 🔧 Stelle sicher, dass der Ordner existiert
os.makedirs(DB_DIR, exist_ok=True)

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

def add_question(question, answer, hint_text, category, grade, question_type="classic", choices=None):
    conn = create_connection()
    cursor = conn.cursor()
    # Überprüfen, ob die Frage bereits existiert
    cursor.execute("SELECT 1 FROM questions WHERE question = ? AND category = ? AND grade = ?", (question, category, grade))
    if cursor.fetchone():
      conn.close()
      return
    # Frage hinzufügen
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
                q.get("options", None)
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

def get_questions(category=None, grade=None):
    conn = create_connection()
    query = 'SELECT * FROM questions'
    params = []
    where_clauses = []
    if category:
        category = parse_category_list(category)
        if isinstance(category, list):
            db_categories = [CATEGORY_MAP.get(c, c) for c in category]
            q_marks = ','.join(['?']*len(db_categories))
            where_clauses.append(f'category IN ({q_marks})')
            params.extend(db_categories)
        else:
            db_category = CATEGORY_MAP.get(category, category)
            where_clauses.append('category = ?')
            params.append(db_category)
    if grade:
        where_clauses.append('grade = ?')
        params.append(grade)
    if where_clauses:
        query += ' WHERE ' + ' AND '.join(where_clauses)
    questions = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(q) for q in questions]

def get_user_progress(email, category=None, grade=None):
    conn = create_connection()
    query = 'SELECT id FROM questions'
    params = []
    where_clauses = []
    if category:
        category = parse_category_list(category)
        if isinstance(category, list):
            db_categories = [CATEGORY_MAP.get(c, c) for c in category]
            q_marks = ','.join(['?']*len(db_categories))
            where_clauses.append(f'category IN ({q_marks})')
            params.extend(db_categories)
        else:
            db_category = CATEGORY_MAP.get(category, category)
            where_clauses.append('category = ?')
            params.append(db_category)
    if grade:
        where_clauses.append('grade = ?')
        params.append(grade)
    if where_clauses:
        query += ' WHERE ' + ' AND '.join(where_clauses)
    question_ids = [row['id'] for row in conn.execute(query, params)]
    if not question_ids:
        conn.close()
        return [], []
    q_marks = ','.join(['?']*len(question_ids))
    rows = conn.execute(f'SELECT question_id, correct, attempts, errors FROM progress WHERE user_email = ? AND question_id IN ({q_marks})', (email, *question_ids)).fetchall()
    correct = [row['question_id'] for row in rows if row['correct'] == 1]
    sorted_wrong = sorted([row for row in rows if row['correct'] == 0], key=lambda r: (-r['errors'], r['attempts']))
    wrong_sorted_ids = [row['question_id'] for row in sorted_wrong]
    conn.close()
    return correct, wrong_sorted_ids

def get_next_question_for_user(email, category=None, grade=None):
    conn = create_connection()
    query = '''
        SELECT q.*, p.correct, p.attempts, p.errors
        FROM questions q
        LEFT JOIN progress p ON q.id = p.question_id AND p.user_email = ?
    '''
    params = [email]
    where_clauses = []
    if category:
        category = parse_category_list(category)
        if isinstance(category, list):
            db_categories = [CATEGORY_MAP.get(c, c) for c in category]
            q_marks = ','.join(['?']*len(db_categories))
            where_clauses.append(f'q.category IN ({q_marks})')
            params.extend(db_categories)
        else:
            db_category = CATEGORY_MAP.get(category, category)
            where_clauses.append('q.category = ?')
            params.append(db_category)
    if grade:
        where_clauses.append('q.grade = ?')
        params.append(grade)
    if where_clauses:
        query += ' WHERE ' + ' AND '.join(where_clauses)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    wrong_or_unanswered = [row for row in rows if row['correct'] == 0 or row['correct'] is None]
    if wrong_or_unanswered:
        sorted_wrong = sorted(wrong_or_unanswered, key=lambda r: (-r['errors'] if r['errors'] is not None else 0, r['attempts'] if r['attempts'] is not None else 0))
        if random.random() < 0.2:  # 20% Chance, eine zufällige falsche oder unbeantwortete Frage zu wählen
            return dict(sorted_wrong[0])
        else:
            return dict(random.choice(wrong_or_unanswered))
    if rows:
        return dict(random.choice(rows))
    return None

def get_correct_answer(question_id):
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT answer FROM questions WHERE id = ?", (question_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

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
            choices TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            total_points INTEGER DEFAULT 0,
            current_rank INTEGER DEFAULT 0,
            progress_in_rank INTEGER DEFAULT 0
        )
    """)
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
    conn.commit()
    conn.close()
    logger.info("✅ init_db(): Tabellen erfolgreich überprüft.")

def reset_db():
    conn = create_connection()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS questions")
    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute("DROP TABLE IF EXISTS progress")
    conn.commit()
    conn.close()
    logger.info("✅ reset_db(): Datenbank zurückgesetzt und neu initialisiert.")

# Hilfsfunktion: Kategorie-Parameter zu Liste konvertieren
def parse_category_list(category):
    if isinstance(category, list):
        if len(category) == 1 and isinstance(category[0], str) and ',' in category[0]:
            return category[0].split(',')
        return category
    elif isinstance(category, str) and ',' in category:
        return category.split(',')
    return category
