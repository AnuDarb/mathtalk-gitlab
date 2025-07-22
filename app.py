from flask import Flask, request, session, jsonify, send_from_directory, render_template
import uuid
import os
import sys
import json
from flask_cors import CORS
from flask import send_from_directory

# Pfad zur Datenbanklogik hinzufügen
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'Database')))

# Eigene Module importieren
from evaluate.evaluate import get_similarity_score
from Database.database import (
    register_user, login_user, init_db, load_questions_from_file,
    save_user_progress, get_questions, get_user_progress,
    get_correct_answer, reset_user_progress, get_next_question_for_user
)

# Flask-App initialisieren
app = Flask(__name__, static_folder="static", template_folder="templates")

CORS(app, supports_credentials=True)
app.secret_key = 'your_secret_key' 


# ✅ Datenbanktabellen erstellen & Fragen einmalig laden
init_db()
load_questions_from_file("Database/fragen.json")


# 🆔 Session-ID erzeugen, falls nicht vorhanden
@app.before_request
def ensure_session_id():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())

# 🚀 Status-Seite
@app.route("/")
def home():
    return render_template("login.html")

# 🔐 Manuelle Initialisierung mit Fragenimport
@app.route("/init-db")
def initialize():
    secret = request.args.get("secret")
    if secret != "y698ZhPs72904Bncd":
        return "⛔ Nicht autorisiert", 403
    try:
        json_path = os.path.join(os.path.dirname(__file__), 'Database', 'fragen.json')
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
    categories = request.args.getlist('categories')
    if categories:
        return jsonify(get_questions(categories))
    category = request.args.get('category')
    return jsonify(get_questions(category))

# 📋 Nächste Frage (angepasst an Nutzer)
@app.route('/api/question', methods=['GET'])
def api_question():
    if 'user_email' not in session:
        return jsonify({'error': 'Nicht eingeloggt.'}), 401
    email = session['user_email']
    categories = request.args.getlist('categories')
    if categories:
        question = get_next_question_for_user(email, categories)
    else:
        category = request.args.get('category')
        question = get_next_question_for_user(email, category)
    if question:
        return jsonify(question)
    else:
        return jsonify({'error': 'Keine Frage gefunden.'}), 404

# 📊 Fortschritt anzeigen
@app.route('/api/progress', methods=['GET'])
def api_progress():
    if 'user_email' not in session:
        return jsonify({'error': 'Nicht eingeloggt.'}), 401
    email = session['user_email']
    categories = request.args.getlist('categories')
    if categories:
        questions = get_questions(categories)
        correct, wrong = get_user_progress(email, categories)
    else:
        category = request.args.get('category')
        questions = get_questions(category)
        correct, wrong = get_user_progress(email, category)
    total_questions = len(questions)
    question_ids = [q['id'] for q in questions]
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
        categories = request.args.getlist('categories')
        if categories:
            reset_user_progress(email, categories)
        else:
            reset_user_progress(email)
    session.clear()
    return jsonify({"status": "ok"})

# ✅ Punktestand & Rang speichern
@app.route("/api/save_status", methods=["POST"])
def save_status():
    if 'user_email' not in session:
        return jsonify({'error': 'Nicht eingeloggt.'}), 401

    data = request.get_json()
    email = session['user_email']

    total_points = data.get("total_points", 0)
    current_rank = data.get("current_rank", 0)
    progress_in_rank = data.get("progress_in_rank", 0)

    from Database.database import update_user_status  # ⬅️ WICHTIG: Funktion muss existieren
    update_user_status(email, total_points, current_rank, progress_in_rank)

    return jsonify({"success": True})

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
        
# ✅ Nutzerstatus abrufen (Punkte, Rang etc.)
@app.route("/api/user_status")
def user_status():
    if 'user_email' not in session:
        return jsonify({'error': 'Nicht eingeloggt'}), 401
    email = session['user_email']

    from Database.database import create_connection  # falls nicht schon importiert
    conn = create_connection()
    cursor = conn.cursor()
    row = cursor.execute("""
        SELECT total_points, current_rank, progress_in_rank
        FROM users
        WHERE email = ?
    """, (email,)).fetchone()
    conn.close()

    if row:
        return jsonify({
            "total_points": row["total_points"],
            "current_rank": row["current_rank"],
            "progress_in_rank": row["progress_in_rank"]
        })
    else:
        return jsonify({'error': 'Nutzer nicht gefunden'}), 404

# 🔓 Login-Route
@app.route('/api/userinfo')
def user_info():
    if 'user_email' in session:
        return jsonify({"email": session["user_email"]})
    else:
        return jsonify({"error": "Nicht eingeloggt"}), 401

# 🔓 Logout-Route
@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"status": "logged_out"})

# 🌐 Login-Seite
@app.route("/login")
def login():
    return render_template("login.html")

# 🌐 Registrierung-Seite
@app.route("/register")
def register():
    return render_template("register.html")

# 🌐 Dashboard
@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

# 🌐 Pruefungsmodus
@app.route("/pruefungsmodus")
def pruefungsmodus():
    return render_template("pruefungsmodus.html")

# 🌐 Uebungsmodus (HTML/JS Version)
@app.route('/uebungsmodus')
def uebungsmodus():
    return render_template('Uebungsmodus.html')

# 🚀 Startpunkt
if __name__ == '__main__':
    app.run(debug=True)
