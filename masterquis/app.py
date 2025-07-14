from flask import Flask, request, session, jsonify, send_from_directory, render_template, redirect, url_for
import uuid
import os
import sys
import json
from flask_cors import CORS

# Projektpfad einbinden
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'Database')))

# Eigene Module importieren
from evaluate.evaluate import get_similarity_score
from Database.database import (
    register_user, login_user, init_db, load_questions_from_file,
    save_user_progress, get_questions, get_user_progress,
    get_correct_answer, reset_user_progress, get_next_question_for_user
)

# Flask initialisieren
app = Flask(__name__, static_folder="static")
CORS(app, supports_credentials=True)
app.secret_key = 'your_secret_key'  # ⚠️ Sicher speichern!

# Datenbanktabellen anlegen
init_db()

# Session-ID
@app.before_request
def ensure_session_id():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())

# Weiterleitung zur Loginseite
@app.route("/")
def home():
    return redirect(url_for("login"))

# Datenbank und Fragen initialisieren
@app.route("/init-db")
def initialize():
    secret = request.args.get("secret")
    if secret != "y698ZhPs72904Bncd":
        return "⛔ Nicht autorisiert", 403
    try:
        json_path = os.path.join(os.path.dirname(__file__), 'Database', 'fragen.json')
        init_db()
        load_questions_from_file(json_path)
        return "✅ Fragen erfolgreich geladen!"
    except Exception as e:
        return f"❌ Fehler: {e}", 500

# Registrierung
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

# Login
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

# Fragen abrufen
@app.route('/api/questions', methods=['GET'])
def api_questions():
    category = request.args.get('category')
    return jsonify(get_questions(category))

@app.route('/api/question', methods=['GET'])
def api_question():
    if 'user_email' not in session:
        return jsonify({'error': 'Nicht eingeloggt.'}), 401
    email = session['user_email']
    category = request.args.get('category')
    question = get_next_question_for_user(email, category)
    if question:
        return jsonify(question)
    else:
        return jsonify({'error': 'Keine Frage gefunden.'}), 404

# Fortschritt anzeigen
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

# Frage überspringen
@app.route('/api/skip', methods=['POST'])
def api_skip():
    if 'user_email' not in session:
        return jsonify({'error': 'Nicht eingeloggt.'}), 401
    data = request.json
    q_id = int(data['question_id'])
    email = session['user_email']
    save_user_progress(email, q_id, False)
    return jsonify({"feedback": "Frage übersprungen!"})

# Fortschritt zurücksetzen
@app.route('/api/reset', methods=['POST'])
def api_reset():
    if 'user_email' in session:
        reset_user_progress(session['user_email'])
    session.clear()
    return jsonify({"status": "ok"})

# Bewertung (wird von dashboard & pruefungsmodus verwendet)
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
            correct_obj = json.loads(correct_answer) if isinstance(correct_answer, str) else correct_answer
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

# 🔁 Speichern über /api/save (für Prüfungsmodus.js)
@app.route('/api/save', methods=['POST'])
def api_save():
    if 'user_email' not in session:
        return jsonify({'success': False, 'error': 'Nicht eingeloggt'}), 401
    data = request.json
    question_id = data.get('question_id')
    user_input = data.get('user_input')
    correct_answer = get_correct_answer(question_id)
    score = get_similarity_score(user_input, correct_answer)
    is_correct = score > 0.65
    save_user_progress(session['user_email'], question_id, is_correct)
    return jsonify({'success': True, 'score': score})

# Loginseite
@app.route("/login")
def login():
    return render_template("login.html")

# Registrierung
@app.route("/register")
def register():
    return render_template("register.html")

# Dashboard
@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

# Prüfungsmodus
@app.route("/pruefungsmodus")
def pruefungsmodus():
    return render_template("pruefungsmodus.html")

    # Übungsmodus
@app.route("/uebungsmodus")
def uebungsmodus():
    return send_from_directory("Frontend/dist", "index.html")

# Server starten
if __name__ == '__main__':
    app.run(debug=True)