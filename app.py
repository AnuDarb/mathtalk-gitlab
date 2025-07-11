from flask import Flask, request, session, jsonify, send_from_directory
import sqlite3
import uuid
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Database')))
from evaluate import get_similarity_score
from database import register_user, login_user, init_db, load_questions_from_file
from flask_cors import CORS
import bcrypt
import json

app = Flask(__name__, static_folder="Static")
CORS(app, supports_credentials=True)
app.secret_key = 'your_secret_key'  # ⚠️ In Produktion sicher aufbewahren

BASEDIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASEDIR, '..', 'Database', 'mathtalk.db')

# 📦 DB-Verbindung
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# 📚 Mapping der Kategorien
CATEGORY_MAP = {
    'zahlen_terme': 'Zahlen & Terme',
    'funktionen_algebra': 'Funktionen & Algebra',
    'geometrie_raum': 'Geometrie & Raum',
    'stochastik': 'Stochastik'
}

# 🆔 Session-ID erzeugen, falls nicht vorhanden
@app.before_request
def ensure_session_id():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())

# 🚀 Status-Seite
@app.route("/")
def home():
    return "🚀 Die Lernplattform läuft!"

# 🔐 Initialisierung mit Fragenimport
@app.route("/init-db")
def initialize():
    secret = request.args.get("secret")
    if secret != "y698ZhPs72904Bncd":
        return "⛔ Nicht autorisiert", 403
    try:
        json_path = os.path.join(os.path.dirname(__file__), "fragen.json")
        init_db()
        load_questions_from_file(json_path)
        return "✅ Datenbank erfolgreich initialisiert & Fragen geladen!"
    except Exception as e:
        return f"❌ Fehler bei der Initialisierung: {e}", 500

# 👤 Registrierung
@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email und Passwort erforderlich.'}), 400
    try:
        register_user(email, password)
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# 🔑 Login
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email und Passwort erforderlich.'}), 400
    if login_user(email, password):
        session['user_email'] = email
        return jsonify({'status': 'ok'})
    else:
        return jsonify({'error': 'Login fehlgeschlagen.'}), 401

# 📋 Fragen laden
@app.route('/api/questions', methods=['GET'])
def api_questions():
    category = request.args.get('category')
    return jsonify(get_questions(category))

# 📊 Fortschritt anzeigen
@app.route('/api/progress', methods=['GET'])
def api_progress():
    if 'user_email' not in session:
        return jsonify({'error': 'Nicht eingeloggt.'}), 401
    email = session['user_email']
    category = request.args.get('category')
    questions = get_questions(category)
    total_questions = len(questions)
    question_ids = [q['id'] for q in questions]
    correct, wrong = get_user_progress(email, category)
    answered = len(set(correct) | set(wrong))
    remaining = [qid for qid in question_ids if qid not in correct and qid not in wrong]
    return jsonify({
        "total_questions": total_questions,
        "answered": answered,
        "remaining": len(remaining),
        "wrong": len(wrong)
    })

# ⏭ Frage überspringen
@app.route('/api/skip', methods=['POST'])
def api_skip():
    if 'user_email' not in session:
        return jsonify({'error': 'Nicht eingeloggt.'}), 401
    data = request.json
    q_id = int(data['question_id'])
    email = session['user_email']
    save_user_progress(email, q_id, False)
    return jsonify({"feedback": "Frage übersprungen!"})

# ♻️ Fortschritt zurücksetzen
@app.route('/api/reset', methods=['POST'])
def api_reset():
    if 'user_email' in session:
        email = session['user_email']
        conn = get_db_connection()
        conn.execute('DELETE FROM progress WHERE user_email = ?', (email,))
        conn.commit()
        conn.close()
    session.clear()
    return jsonify({"status": "ok"})

# ✅ Antwort prüfen
@app.route('/api/evaluate', methods=['POST'])
def api_evaluate():
    if 'user_email' not in session:
        return jsonify({'error': 'Nicht eingeloggt.'}), 401
    data = request.json
    question_id = data.get('question_id')
    user_input = data.get('user_input')
    correct_answer = get_correct_answer(question_id)
    email = session['user_email']
    if correct_answer:
        try:
            correct_obj = correct_answer
            if isinstance(correct_obj, str):
                correct_obj = json.loads(correct_obj)
        except Exception:
            correct_obj = None
        if isinstance(user_input, dict) and isinstance(correct_obj, dict):
            is_correct = all(str(user_input.get(k, '')) == str(v) for k, v in correct_obj.items())
            score = 1.0 if is_correct else 0.0
        else:
            score = get_similarity_score(user_input, correct_answer)
            is_correct = score > 0.65
        save_user_progress(email, question_id, is_correct)
        return jsonify({
            'score': score,
            'is_correct': is_correct
        })
    else:
        return jsonify({'error': 'Frage nicht gefunden.'}), 404

# 🖼 Bilder ausliefern
@app.route('/static/images/<path:filename>')
def serve_image(filename):
    image_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Database', 'Static', 'images'))
    return send_from_directory(image_dir, filename)

# 🔎 Fragen holen
def get_questions(category=None):
    conn = get_db_connection()
    if category:
        db_category = CATEGORY_MAP.get(category, category)
        questions = conn.execute('SELECT * FROM questions WHERE category = ?', (db_category,)).fetchall()
    else:
        questions = conn.execute('SELECT * FROM questions').fetchall()
    conn.close()
    return [dict(q) for q in questions]

# 🧠 Fortschritt abrufen
def get_user_progress(email, category=None):
    conn = get_db_connection()
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

# 💾 Fortschritt speichern
def save_user_progress(email, question_id, is_correct):
    conn = get_db_connection()
    conn.execute('REPLACE INTO progress (user_email, question_id, correct) VALUES (?, ?, ?)', (email, question_id, int(is_correct)))
    conn.commit()
    conn.close()

# ✅ Lösung aus DB holen
def get_correct_answer(question_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT answer FROM questions WHERE id = ?", (question_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

# 🚀 Startpunkt
if __name__ == '__main__':
    app.run(debug=True)


